import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { cacheShared } from '../middleware/cache.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { getShifts, addShift, updateShift, deleteShift } from '../controllers/shiftController.js'

const router = express.Router()
const adminOrHr = authorizeRoles('admin', 'hr');

router.get('/', authMiddleware, cacheShared('shifts', 600), getShifts)
router.post('/', authMiddleware, adminOrHr, addShift)
router.put('/:id', authMiddleware, adminOrHr, updateShift)
router.delete('/:id', authMiddleware, adminOrHr, deleteShift)

export default router
