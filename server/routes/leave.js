import express from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/authMiddlware.js'
import { upsertMyLeaveProof, deleteMyLeaveProof, getLeaveByActionToken, actOnLeaveByToken, cancelMyLeave, addLeave, getLeave, getLeaves, getLeaveDetail, updateLeave, deleteLeave, getEmployeeLeavesByDate } from '../controllers/leaveController.js'
import { getLeaveBalance } from '../controllers/leaveTypeController.js'

const router = express.Router()

// Optional leave proof: one image or PDF, max 5 MB.
const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
const uploadProof = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) =>
        PROOF_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new Error('Proof must be an image or PDF')),
}).single('proof')
const proofUpload = (req, res, next) =>
    uploadProof(req, res, (err) => {
        if (!err) return next()
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Proof file must be 5 MB or smaller' : err.message
        return res.status(400).json({ success: false, error: msg })
    })

// Public: authorised by the signed token in HR's leave email.
router.get('/email-action', getLeaveByActionToken)
router.post('/email-action', actOnLeaveByToken)
router.post('/add', authMiddleware, proofUpload, addLeave)
router.get('/detail/:id', authMiddleware, getLeaveDetail)
router.get('/employee', authMiddleware, getEmployeeLeavesByDate)
router.get('/balance', authMiddleware, getLeaveBalance)
router.get('/:id/:role', authMiddleware, getLeave)
router.get('/', authMiddleware, getLeaves)
router.put('/:id', authMiddleware, updateLeave)
router.put('/mine/:id/proof', authMiddleware, proofUpload, upsertMyLeaveProof)
router.delete('/mine/:id/proof', authMiddleware, deleteMyLeaveProof)
router.delete('/mine/:id', authMiddleware, cancelMyLeave)
router.delete('/:id', authMiddleware, deleteLeave)

export default router
