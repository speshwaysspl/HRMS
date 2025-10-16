import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { getSummary, getEmployeeDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router()

router.get('/summary', authMiddleware, getSummary)
router.get('/employee-stats', authMiddleware, getEmployeeDashboardStats)

export default router;