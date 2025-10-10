import express from 'express';
import { getUserNotifications, markAsRead, markAllAsRead, clearAllNotifications } from '../controllers/notificationController.js';
import verifyUser from '../middleware/authMiddlware.js';

const router = express.Router();

// Get user notifications
router.get('/user/:userId', verifyUser, getUserNotifications);

// Mark notification as read
router.put('/read/:notificationId', verifyUser, markAsRead);

// Mark all notifications as read for a user
router.put('/read-all/:userId', verifyUser, markAllAsRead);

// Clear all notifications for a user
router.delete('/clear-all/:userId', verifyUser, clearAllNotifications);

export default router;