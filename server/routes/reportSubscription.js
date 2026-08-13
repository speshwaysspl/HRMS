import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { getMySubscription, updateMySubscription } from '../controllers/reportSubscriptionController.js'

const router = express.Router()

router.get('/mine', authMiddleware, getMySubscription)
router.put('/mine', authMiddleware, updateMySubscription)

export default router
