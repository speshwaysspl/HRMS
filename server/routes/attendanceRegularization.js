import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import {
  requestRegularization,
  getMyRegularizations,
  getPendingRegularizations,
  decideRegularization,
} from '../controllers/attendanceRegularizationController.js'

const router = express.Router()

router.post('/', authMiddleware, requestRegularization)
router.get('/mine', authMiddleware, getMyRegularizations)
router.get('/pending', authMiddleware, getPendingRegularizations)
router.put('/:id', authMiddleware, decideRegularization)

export default router
