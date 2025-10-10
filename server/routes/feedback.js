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

// Middleware to attach Socket.IO instance to request
const attachSocketIO = (req, res, next) => {
  req.io = req.app.get('io');
  next();
};

// Employee routes
router.post('/', authMiddleware, attachSocketIO, createFeedback);
router.get('/my-feedback', authMiddleware, getEmployeeFeedback);
router.put('/my-feedback/:id', authMiddleware, updateEmployeeFeedback);

// Admin routes (declare specific paths BEFORE parameterized ':id' to avoid route collisions)
router.get('/admin/statistics', authMiddleware, getFeedbackStatistics);
router.get('/', authMiddleware, getAllFeedback);
router.put('/:id/status', authMiddleware, attachSocketIO, updateFeedbackStatus);

// Shared routes (both employee and admin can access)
router.get('/:id', authMiddleware, getFeedbackById);
router.delete('/:id', authMiddleware, deleteFeedback);

export default router;