import express from 'express';
import authMiddleware from '../middleware/authMiddlware.js';
import {
  createFeedback,
  getEmployeeFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  updateEmployeeFeedback,
  deleteFeedback,
  getFeedbackStatistics
} from '../controllers/feedbackController.js';

const router = express.Router();

// Employee routes
router.post('/', authMiddleware, createFeedback);
router.get('/my-feedback', authMiddleware, getEmployeeFeedback);
router.put('/my-feedback/:id', authMiddleware, updateEmployeeFeedback);

// Shared routes (both employee and admin can access)
router.get('/:id', authMiddleware, getFeedbackById);
router.delete('/:id', authMiddleware, deleteFeedback);

// Admin routes
router.get('/', authMiddleware, getAllFeedback);
router.put('/:id/status', authMiddleware, updateFeedbackStatus);
router.get('/admin/statistics', authMiddleware, getFeedbackStatistics);

export default router;