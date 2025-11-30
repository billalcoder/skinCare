import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log(await genAI.listModel);

export const getGeminiResponse = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text();

  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to get AI response');
  }
};