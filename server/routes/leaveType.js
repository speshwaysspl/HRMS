import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { getLeaveTypes, addLeaveType, updateLeaveType, deleteLeaveType } from '../controllers/leaveTypeController.js'

const router = express.Router()

router.get('/', authMiddleware, getLeaveTypes)
router.post('/', authMiddleware, addLeaveType)
router.put('/:id', authMiddleware, updateLeaveType)
router.delete('/:id', authMiddleware, deleteLeaveType)

export default router
