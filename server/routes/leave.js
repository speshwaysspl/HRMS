import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { addLeave, getLeave, getLeaves, getLeaveDetail, updateLeave, deleteLeave, getEmployeeLeavesByDate } from '../controllers/leaveController.js'
import { getLeaveBalance } from '../controllers/leaveTypeController.js'

const router = express.Router()

router.post('/add', authMiddleware, addLeave)
router.get('/detail/:id', authMiddleware, getLeaveDetail)
router.get('/employee', authMiddleware, getEmployeeLeavesByDate)
router.get('/balance', authMiddleware, getLeaveBalance)
router.get('/:id/:role', authMiddleware, getLeave)
router.get('/', authMiddleware, getLeaves)
router.put('/:id', authMiddleware, updateLeave)
router.delete('/:id', authMiddleware, deleteLeave)

export default router
