import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  createOffer,
  getOffers,
  getOfferByCandidateId,
  sendOffer,
  revokeOffer,
  acceptOffer,
  rejectOffer,
  previewOffer
} from "../controllers/offerController.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  createOffer
);

router.post(
  "/preview",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  previewOffer
);

router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  getOffers
);

router.get(
  "/candidate/:candidateId",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter", "candidate"),
  getOfferByCandidateId
);

router.post(
  "/:id/send",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  sendOffer
);

router.post(
  "/:id/revoke",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  revokeOffer
);

router.post(
  "/:id/accept",
  authMiddleware,
  authorizeRoles("admin", "hr", "candidate"),
  acceptOffer
);

router.post(
  "/:id/reject",
  authMiddleware,
  authorizeRoles("admin", "hr", "candidate"),
  rejectOffer
);

export default router;
