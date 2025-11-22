import express from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate); // All user routes require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;