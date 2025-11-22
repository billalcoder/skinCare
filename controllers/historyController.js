import History from '../models/History.js';
import User from '../models/User.js';

// Add analysis to history
export const addToHistory = async (userId, extractedText, aiResponse, analysisResult) => {
  try {
    // Extract metadata from AI response for better organization
    const metadata = extractMetadata(analysisResult, aiResponse);
    
    const historyEntry = new History({
      userId,
      extractedText: extractedText.substring(0, 500), // Limit text length
      productAnalysis: analysisResult,
      aiResponse: aiResponse,
      metadata
    });

    await historyEntry.save();
    return historyEntry;
  } catch (error) {
    console.error('Error adding to history:', error);
    throw new Error('Failed to save history');
  }
};

// Get user history with pagination
export const getUserHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, filter } = req.query;
    const userId = req.userId;

    let query = { userId };
    
    // Apply filters if provided
    if (filter) {
      if (filter.suitability) {
        query['metadata.suitability'] = filter.suitability;
      }
      if (filter.productType) {
        query['metadata.productType'] = new RegExp(filter.productType, 'i');
      }
      if (filter.dateFrom || filter.dateTo) {
        query.timestamp = {};
        if (filter.dateFrom) query.timestamp.$gte = new Date(filter.dateFrom);
        if (filter.dateTo) query.timestamp.$lte = new Date(filter.dateTo);
      }
    }

    const history = await History.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-__v -aiResponse'); // Exclude large AI response for list view

    const total = await History.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      history,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

// Get specific history entry
export const getHistoryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const historyEntry = await History.findOne({ 
      _id: id, 
      userId 
    });

    if (!historyEntry) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    res.json({ historyEntry });

  } catch (error) {
    console.error('Get history entry error:', error);
    res.status(500).json({ error: 'Failed to fetch history entry' });
  }
};

// Delete history entry
export const deleteHistoryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await History.findOneAndDelete({ 
      _id: id, 
      userId 
    });

    if (!result) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    res.json({ message: 'History entry deleted successfully' });

  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ error: 'Failed to delete history entry' });
  }
};

// Clear all user history
export const clearUserHistory = async (req, res) => {
  try {
    const userId = req.userId;

    await History.deleteMany({ userId });

    res.json({ message: 'All history cleared successfully' });

  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};

// Get user analytics
export const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.userId;

    const stats = await History.getUserStats(userId);
    const recentActivity = await History.find({ userId })
      .sort({ timestamp: -1 })
      .limit(5)
      .select('timestamp metadata.suitability metadata.productType');

    // If no history exists
    if (stats.length === 0) {
      return res.json({
        totalAnalysis: 0,
        averageRating: 0,
        suitabilityDistribution: {},
        recentActivity: []
      });
    }

    const suitabilityDistribution = stats[0].suitabilityBreakdown.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalAnalysis: stats[0].totalAnalysis,
      averageRating: stats[0].averageRating ? stats[0].averageRating.toFixed(1) : 0,
      suitabilityDistribution,
      recentActivity
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Search history
export const searchHistory = async (req, res) => {
  try {
    const { q: searchTerm, page = 1, limit = 10 } = req.query;
    const userId = req.userId;

    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const searchQuery = {
      userId,
      $or: [
        { extractedText: { $regex: searchTerm, $options: 'i' } },
        { productAnalysis: { $regex: searchTerm, $options: 'i' } },
        { 'metadata.ingredients': { $in: [new RegExp(searchTerm, 'i')] } },
        { 'metadata.productType': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.brand': { $regex: searchTerm, $options: 'i' } }
      ]
    };

    const history = await History.find(searchQuery)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-__v -aiResponse');

    const total = await History.countDocuments(searchQuery);
    const totalPages = Math.ceil(total / limit);

    res.json({
      history,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      searchTerm
    });

  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({ error: 'Failed to search history' });
  }
};

// Helper function to extract metadata from AI response
const extractMetadata = (analysisResult, aiResponse) => {
  // Basic metadata extraction - you can enhance this based on your AI response structure
  const metadata = {
    ingredients: extractIngredients(analysisResult),
    productType: extractProductType(analysisResult),
    brand: extractBrand(analysisResult),
    rating: extractRating(analysisResult),
    suitability: extractSuitability(analysisResult)
  };

  return metadata;
};

const extractIngredients = (analysis) => {
  // Simple regex to find ingredients - enhance based on your AI response format
  const ingredientMatches = analysis.match(/(?:ingredients?|contains?):?([^\.!\n]+)/i);
  if (ingredientMatches) {
    return ingredientMatches[1].split(',').map(i => i.trim()).filter(i => i);
  }
  return [];
};

const extractProductType = (analysis) => {
  const types = ['cleanser', 'moisturizer', 'serum', 'sunscreen', 'toner', 'mask', 'treatment'];
  const foundType = types.find(type => analysis.toLowerCase().includes(type));
  return foundType || 'unknown';
};

const extractBrand = (analysis) => {
  // Simple brand extraction - enhance as needed
  const brandMatch = analysis.match(/(?:brand|product):?\s*([^\n\.!]+)/i);
  return brandMatch ? brandMatch[1].trim() : 'unknown';
};

const extractRating = (analysis) => {
  const ratingMatch = analysis.match(/(?:rating|score):?\s*(\d+(?:\.\d+)?)/i);
  return ratingMatch ? parseFloat(ratingMatch[1]) : 3;
};

const extractSuitability = (analysis) => {
  if (analysis.toLowerCase().includes('excellent') || analysis.toLowerCase().includes('highly recommended')) {
    return 'excellent';
  } else if (analysis.toLowerCase().includes('good') || analysis.toLowerCase().includes('recommended')) {
    return 'good';
  } else if (analysis.toLowerCase().includes('moderate') || analysis.toLowerCase().includes('average')) {
    return 'moderate';
  } else if (analysis.toLowerCase().includes('poor') || analysis.toLowerCase().includes('not recommended')) {
    return 'poor';
  } else if (analysis.toLowerCase().includes('unsuitable') || analysis.toLowerCase().includes('avoid')) {
    return 'unsuitable';
  }
  return 'moderate';
};