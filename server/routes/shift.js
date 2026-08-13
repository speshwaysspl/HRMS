import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { getShifts, addShift, updateShift, deleteShift } from '../controllers/shiftController.js'

const router = express.Router()

router.get('/', authMiddleware, getShifts)
router.post('/', authMiddleware, addShift)
router.put('/:id', authMiddleware, updateShift)
router.delete('/:id', authMiddleware, deleteShift)

export default router
