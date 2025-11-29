import History from '../models/History.js';
import User from '../models/User.js';
import { extractTextFromImage } from '../service/textremove.js';
import { getGeminiResponse } from '../utils/geminiService.js';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';


const textractClient = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

async function extractTextWithAWS(buffer) {
  try {
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer, // AWS accepts the raw buffer directly
      },
    });

    const response = await textractClient.send(command);

    console.log(response);

    // AWS returns a list of "Blocks". We only want the lines of text.
    if (!response.Blocks) return "";

    return response.Blocks
      .filter(block => block.BlockType === 'LINE') // Filter for lines (ignore individual words)
      .map(block => block.Text)                    // Extract the text string
      .join('\n');                                 // Join with newlines

  } catch (error) {
    console.error("AWS Textract Error:", error);
    throw new Error("Failed to process image with AWS Textract");
  }}
// Process skin analysis
export const analyzeSkinText = async (req, res) => {
  try {
    const userId = req.userId;
    let extractedText = "";

    // 1. CHECK FOR FILE (TESSERACT FLOW)
    if (req.file) {
      console.log("Processing image with Tesseract.js...");
      // Tesseract accepts the buffer directly
      extractedText = await extractTextWithAWS(req.file.buffer);
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
    const personalizedPrompt = `${extractedText}You are a professional skincare advisor.
Your job is to analyze skincare products using the user's personal data and the ingredient list.
Always use simple, friendly English unless the user’s education level shows they can understand more advanced explanations.
Your answers must always be clear, well-structured, and easy for anyone to understand.
Remember: skincare also includes cosmetic products.


🧑‍🤝‍🧑 User Data (input)

Name: ${user.name}
Age: ${user.age}
Gender: ${user.gender}
Skin type: ${user.skinType}
Skin concerns: ${user.concerns}
Allergies (optional): ${user.allergies}
User qualification / education level: ${user.Qualification}
(Examples: “No formal education”, “12th Arts”, “BSc”, “IIT Bombay CSE”, etc.)


🧴 Product Ingredients (input)

Ingredients: {ingredients}


🧠 Education-Level Language Rule 

Adjust the explanation according to the user’s education level:

No education / low education:
Use very simple English, short sentences, basic words.

School level (10th/12th Arts/Commerce/Science):
Use simple English, light explanations, avoid technical wording.

College / Graduated:
Use clear English with moderate detail.

Highly educated (e.g., IIT, medical, engineering, post-grad):
Provide deeper reasoning, more structured, more technical—but still clear.

If qualification is not provided:
Use simple, beginner-friendly English.


✅ TASKS

1. Product Suitability Summary
Give a short, clear summary saying if the product is:
Safe 👍
Safe but with caution ⚠
Not recommended ❌


2. Benefits for This User
List the benefits based on the user's:
• Skin type
• Skin concerns
(Use explanation style based on the user’s education level.)


3. Harmful or Risky Ingredients
List risky or irritating ingredients. For each, explain:
• Why it may be harmful
• How it affects this user's skin
• If it matches the user’s allergy



🔥 Nano Particle Rule
If there are nano particles, explain:
• What they do
• Benefits
• Risks
• Whether this user should use or avoid

4. Safe or Helpful Ingredients
List safe or helpful ingredients and explain why they are good for this user.


5. Usage Guidance
Tell the user:
• Frequency
• Amount
• AM/PM
• Patch test needed or not


6. Final Recommendation
Give a clear conclusion:
• Use daily
• Use 2–3 times a week
• Use sometimes
• Avoid this product



📌 RESPONSE FORMAT REQUIREMENTS

Your answer must be:
• Well structured
• Easy to read
• User friendly
• Written based on the user’s education level
• Organized with headings and bullet points
• Personalized to the user


🚫 RULES

Only analyze skincare products. If ingredients do not belong to skincare:
“This is not a skincare product, so I cannot review it.”

No heavy scientific words unless the user is highly educated and can understand them.

Always personalize the advice based on the user data.`;

    // 4. GET AI RESPONSE
    let aiRawResponse = await getGeminiResponse(personalizedPrompt);

    // Clean up Gemini response if it includes markdown formatting
    if (typeof aiRawResponse === 'string') {
      aiRawResponse = aiRawResponse.replace(/```json|```/g, '').trim();
      try {
        aiRawResponse = aiRawResponse
      } catch (e) {
        console.error("JSON Parse Error:", e);
        // Fallback object to prevent crash
        aiRawResponse = {
          analysis: aiRawResponse,
          ingredients: [],
          rating: 1,
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
        rating: aiRawResponse.rating || 1,
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

