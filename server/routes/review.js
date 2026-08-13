import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import {
  createReview,
  updateReview,
  getTeamReviews,
  getMyReviews,
  getAllReviews,
  getMyDirectReports,
} from '../controllers/reviewController.js'

const router = express.Router()

router.post('/', authMiddleware, createReview)
router.put('/:id', authMiddleware, updateReview)
router.get('/team', authMiddleware, getTeamReviews)
router.get('/mine', authMiddleware, getMyReviews)
router.get('/all', authMiddleware, getAllReviews)
router.get('/direct-reports', authMiddleware, getMyDirectReports)

export default router
