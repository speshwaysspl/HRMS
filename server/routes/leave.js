import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { addLeave, getLeave, getLeaves, getLeaveDetail, updateLeave, getEmployeeLeavesByDate } from '../controllers/leaveController.js'

const router = express.Router()

router.post('/add', authMiddleware, addLeave)
router.get('/detail/:id', authMiddleware, getLeaveDetail)
router.get('/employee', authMiddleware, getEmployeeLeavesByDate)
router.get('/:id/:role', authMiddleware, getLeave)
router.get('/', authMiddleware, getLeaves)
router.put('/:id', authMiddleware, updateLeave)

export default router