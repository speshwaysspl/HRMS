import express from "express";
import verifyUser from "../middleware/authMiddlware.js";
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { uploadDocumentS3 } from "../middleware/uploadDocumentS3.js";
import {
  createCandidate,
  getCandidates,
  getCandidateDetails,
  updateCandidate,
  deleteCandidate,
  updateCandidateProfile,
  uploadCandidateDocument,
  submitForVerification,
  verifyCandidateDocument,
  sendReminder,
  finalizeOfferReady,
  getDashboardStats,
  previewOfferLetter,
  sendBothOfferAndAppointment
} from "../controllers/recruitmentController.js";

const router = express.Router();
const adminOrHr = authorizeRoles('admin', 'hr');

// HR and Admin Overview Stats
router.get("/stats", verifyUser, adminOrHr, getDashboardStats);

// Candidate Management CRUD
router.post("/candidate", verifyUser, createCandidate);
router.get("/candidates", verifyUser, adminOrHr, getCandidates);
router.get("/candidate/:id", verifyUser, adminOrHr, getCandidateDetails);
router.put("/candidate/:id", verifyUser, updateCandidate);
router.delete("/candidate/:id", verifyUser, adminOrHr, deleteCandidate);

// Profile and Verification Actions
router.put("/profile", verifyUser, updateCandidateProfile);
router.post("/upload", verifyUser, uploadDocumentS3.single("file"), uploadCandidateDocument);
router.post("/submit-verification", verifyUser, submitForVerification);
router.post("/verify-doc", verifyUser, verifyCandidateDocument);
router.post("/send-reminder", verifyUser, sendReminder);
router.post("/finalize-offer", verifyUser, finalizeOfferReady);
router.get("/candidate/:id/preview-offer", verifyUser, adminOrHr, previewOfferLetter);
router.post("/candidate/:id/send-both", verifyUser, sendBothOfferAndAppointment);

export default router;
