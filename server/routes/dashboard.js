import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { getSummary, getEmployeeDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router()
const adminOrHr = authorizeRoles('admin', 'hr');

router.get('/summary', authMiddleware, adminOrHr, getSummary)
router.get('/employee-stats', authMiddleware, getEmployeeDashboardStats)

export default router;