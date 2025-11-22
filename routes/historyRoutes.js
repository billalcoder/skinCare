import express from 'express';
import {
  getUserHistory,
  getHistoryEntry,
  deleteHistoryEntry,
  clearUserHistory,
  getUserAnalytics,
  searchHistory
} from '../controllers/historyController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate); // All history routes require authentication

// GET /api/history - Get user history with pagination and filtering
router.get('/', getUserHistory);

// GET /api/history/search - Search history
router.get('/search', searchHistory);

// GET /api/history/analytics - Get user analytics
router.get('/analytics', getUserAnalytics);

// GET /api/history/:id - Get specific history entry
router.get('/:id', getHistoryEntry);

// DELETE /api/history/:id - Delete specific history entry
router.delete('/:id', deleteHistoryEntry);

// DELETE /api/history - Clear all user history
router.delete('/', clearUserHistory);

export default router;