import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { uploadDocumentS3 } from "../middleware/uploadDocumentS3.js";
import {
  getCandidateProfile,
  updateCandidateProfile,
  uploadOnboardingDocument,
  getOnboardingDocuments,
  verifyOnboardingDocument,
  convertCandidateToEmployee
} from "../controllers/onboardingController.js";

const router = express.Router();

// Candidate Portal routes
router.get(
  "/profile",
  authMiddleware,
  authorizeRoles("candidate", "admin", "hr"),
  getCandidateProfile
);

router.put(
  "/profile",
  authMiddleware,
  authorizeRoles("candidate"),
  updateCandidateProfile
);

router.post(
  "/upload",
  authMiddleware,
  authorizeRoles("candidate"),
  uploadDocumentS3.single("file"),
  uploadOnboardingDocument
);

router.get(
  "/documents",
  authMiddleware,
  authorizeRoles("candidate", "admin", "hr"),
  getOnboardingDocuments
);

// Admin/HR/Recruiter views
router.get(
  "/documents/:candidateId",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter"),
  getOnboardingDocuments
);

router.put(
  "/documents/:docId/verify",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  verifyOnboardingDocument
);

router.post(
  "/convert/:id",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  convertCandidateToEmployee
);

export default router;
