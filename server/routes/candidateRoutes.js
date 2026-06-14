import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddlware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  addCandidateNote,
  updateCandidateStatus,
  updateCandidateAccountStatus
} from "../controllers/candidateController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word documents are allowed for resumes"));
    }
  }
});

router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter"),
  upload.single("resume"),
  createCandidate
);

router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter"),
  getCandidates
);

router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter", "candidate"),
  getCandidateById
);

router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter"),
  upload.single("resume"),
  updateCandidate
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter"),
  deleteCandidate
);

router.post(
  "/:id/notes",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter"),
  addCandidateNote
);

router.put(
  "/:id/status",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter"),
  updateCandidateStatus
);

router.patch(
  "/:id/account-status",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter"),
  updateCandidateAccountStatus
);

export default router;
