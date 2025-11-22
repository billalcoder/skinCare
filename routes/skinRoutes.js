import express from 'express';
import { analyzeSkinText } from '../controllers/skinController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate); // All skin routes require authentication

router.post('/analyze', analyzeSkinText);

export default router;