import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { cacheShared } from '../middleware/cache.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {addDepartment, getDepartments, getDepartment, updateDepartment, deleteDepartment} from '../controllers/departmentController.js'

const router = express.Router()
const adminOrHr = authorizeRoles('admin', 'hr');

router.get('/', authMiddleware, cacheShared('department', 600), getDepartments)
router.post('/add', authMiddleware, adminOrHr, addDepartment)
router.get('/:id', authMiddleware, getDepartment)
router.put('/:id', authMiddleware, adminOrHr, updateDepartment)
router.delete('/:id', authMiddleware, adminOrHr, deleteDepartment)

export default router