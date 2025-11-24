import express from 'express';
import multer from 'multer';
import { analyzeSkinText } from '../controllers/skinController.js';
import { authenticate } from '../middleware/auth.js'; 

const router = express.Router();

// Configure Multer to use Memory Storage
// This stores the file in RAM as a Buffer, which Tesseract can read directly.
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Limit to 5MB to prevent memory issues
});

// Route: POST /api/analyze
router.post('/analyze', authenticate, upload.single('image'), analyzeSkinText);

export default router;