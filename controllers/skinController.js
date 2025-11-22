import { getGeminiResponse } from '../utils/geminiService.js';
import User from '../models/User.js';
import { addToHistory } from '../controllers/historyController.js';

// Process skin analysis
export const analyzeSkinText = async (req, res) => {
  try {
    const { extractedText } = req.body;
    const userId = req.userId;

    if (!extractedText) {
      return res.status(400).json({ error: 'No text provided for analysis' });
    }

    // Get user data for personalized response
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create personalized prompt
    const personalizedPrompt = `
      User Profile:
      - Age: ${user.age}
      - Gender: ${user.gender}
      - Skin Type: ${user.skinType}
      - Allergies: ${user.allergies.join(', ') || 'None'}
      - Skin Concerns: ${user.concerns.join(', ')}

      Extracted Text from Product: ${extractedText}

      Please analyze this skincare product for the user and provide:
      1. Ingredient analysis and their benefits
      2. Suitability for user's skin type and concerns
      3. Potential issues based on allergies and skin type
      4. Recommended usage instructions
      5. Overall rating and recommendation

      Format the response in a clear, structured way that's easy to understand.
    `;

    // Get AI response
    const aiResponse = await getGeminiResponse(personalizedPrompt);

    // Save to history
    const historyEntry = await addToHistory(userId, extractedText, aiResponse, aiResponse);

    res.json({
      analysis: aiResponse,
      productInfo: extractedText,
      historyId: historyEntry._id, // Return history ID for reference
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Skin analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze skin product' });
  }
};