import { createWorker } from 'tesseract.js';

/**
 * Extracts text from an image buffer using Tesseract.js
 * @param {Buffer} imageBuffer - The image buffer from Multer
 * @returns {Promise<string>} - The extracted text
 */
export const extractTextFromImage = async (imageBuffer) => {
  try {
    // 1. Create a worker (v5 syntax specifies language during creation)
    const worker = await createWorker('eng');
    
    // 2. Recognize text from the buffer
    const { data: { text } } = await worker.recognize(imageBuffer);
    
    // 3. Terminate worker to free up memory
    await worker.terminate();
    
    // 4. Basic cleanup of the text
    return text.trim();
  } catch (error) {
    console.error("Tesseract OCR Error:", error);
    throw new Error("Failed to extract text from image using Tesseract");
  }
};