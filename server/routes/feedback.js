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

// No Socket.IO; notifications are sent via AWS WebSockets

// Employee routes
router.post('/', authMiddleware, createFeedback);
router.get('/my-feedback', authMiddleware, getEmployeeFeedback);
router.put('/my-feedback/:id', authMiddleware, updateEmployeeFeedback);

// Admin routes (declare specific paths BEFORE parameterized ':id' to avoid route collisions)
router.get('/admin/statistics', authMiddleware, getFeedbackStatistics);
router.get('/', authMiddleware, getAllFeedback);
router.put('/:id/status', authMiddleware, updateFeedbackStatus);

// Shared routes (both employee and admin can access)
router.get('/:id', authMiddleware, getFeedbackById);
router.delete('/:id', authMiddleware, deleteFeedback);

export default router;
