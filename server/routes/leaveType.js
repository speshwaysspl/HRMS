import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { cacheShared } from '../middleware/cache.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { getLeaveTypes, addLeaveType, updateLeaveType, deleteLeaveType } from '../controllers/leaveTypeController.js'

const router = express.Router()
const adminOrHr = authorizeRoles('admin', 'hr');

router.get('/', authMiddleware, cacheShared('leave-types', 600), getLeaveTypes)
router.post('/', authMiddleware, adminOrHr, addLeaveType)
router.put('/:id', authMiddleware, adminOrHr, updateLeaveType)
router.delete('/:id', authMiddleware, adminOrHr, deleteLeaveType)

export default router
