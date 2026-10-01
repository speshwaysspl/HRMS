import express from 'express'
import authMiddleware from '../middleware/authMiddlware.js'
import { changePassword, getRootPassword, setRootPassword } from '../controllers/settingController.js'

const router = express.Router()

router.put('/change-password', authMiddleware, changePassword)
router.get('/root-password', authMiddleware, getRootPassword)
router.put('/root-password', authMiddleware, setRootPassword)


export default router