import History from '../models/History.js';
import User from '../models/User.js';
import { extractTextFromImage } from '../service/textremove.js';
import { getGeminiResponse } from '../utils/geminiService.js';

// Process skin analysis
export const analyzeSkinText = async (req, res) => {
  try {
    const userId = req.userId;
    let extractedText = "";

    // 1. CHECK FOR FILE (TESSERACT FLOW)
    if (req.file) {
      console.log("Processing image with Tesseract.js...");
      // Tesseract accepts the buffer directly
      extractedText = await extractTextFromImage(req.file.buffer);
    } 
    // 2. CHECK FOR RAW TEXT (FALLBACK)
    else if (req.body.extractedText) {
      extractedText = req.body.extractedText;
    }

    // Validation
    if (!extractedText || extractedText.length < 5) {
      return res.status(400).json({ error: 'Could not detect readable text. Please try a clearer image.' });
    }

    console.log("Extracted Text Preview:", extractedText.substring(0, 50) + "...");

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 3. CREATE PROMPT (Enforcing JSON output for your DB Schema)
    const personalizedPrompt = `
      User Profile:
      - Age: ${user.age}
      - Gender: ${user.gender}
      - Skin Type: ${user.skinType}
      - Allergies: ${user.allergies.join(', ') || 'None'}
      - Concerns: ${user.concerns.join(', ')}

      Product Text (OCR Extracted): ${extractedText}

      Analyze this product based on the user's profile.
      IMPORTANT: Return the response STRICTLY as a valid JSON object (no markdown, no backticks). Structure:
      {
        "analysis": "Detailed text analysis here...",
        "ingredients": ["List", "of", "ingredients"],
        "productType": "Type of product",
        "brand": "Brand name if detected",
        "rating": Number (1-5),
        "suitability": "One of: 'excellent', 'good', 'moderate', 'poor', 'unsuitable'"
      }
    `;

    // 4. GET AI RESPONSE
    let aiRawResponse = await getGeminiResponse(personalizedPrompt);
    
    // Clean up Gemini response if it includes markdown formatting
    if (typeof aiRawResponse === 'string') {
        aiRawResponse = aiRawResponse.replace(/```json|```/g, '').trim();
        try {
            aiRawResponse = JSON.parse(aiRawResponse);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            // Fallback object to prevent crash
            aiRawResponse = {
                analysis: aiRawResponse, 
                ingredients: [], 
                rating: 0, 
                suitability: 'moderate'
            }; 
        }
    }

    // 5. SAVE TO HISTORY
    const historyEntry = await History.create({
      userId: userId,
      extractedText: extractedText,
      productAnalysis: aiRawResponse.analysis,
      aiResponse: aiRawResponse,
      metadata: {
        ingredients: aiRawResponse.ingredients || [],
        productType: aiRawResponse.productType || "Unknown",
        brand: aiRawResponse.brand || "Unknown",
        rating: aiRawResponse.rating || 0,
        suitability: aiRawResponse.suitability || "moderate"
      }
    });

    res.json({
      success: true,
      extractedText: extractedText,
      analysis: aiRawResponse,
      historyId: historyEntry._id
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze product' });
  }
};