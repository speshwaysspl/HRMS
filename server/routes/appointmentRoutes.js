import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  createAppointment,
  getAppointments,
  getAppointmentByCandidateId,
  sendAppointment,
  previewAppointment,
  acceptAppointment,
  convertCandidateToEmployee
} from "../controllers/appointmentController.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  createAppointment
);

router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  getAppointments
);

router.get(
  "/candidate/:candidateId",
  authMiddleware,
  authorizeRoles("admin", "hr", "recruiter", "candidate"),
  getAppointmentByCandidateId
);

router.get(
  "/candidate/:candidateId/preview",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  previewAppointment
);

router.post(
  "/candidate/:id/send",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  sendAppointment
);

router.put(
  "/candidate/:candidateId/accept",
  authMiddleware,
  authorizeRoles("admin", "hr", "candidate"),
  acceptAppointment
);

router.post(
  "/candidate/:candidateId/convert",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  convertCandidateToEmployee
);

export default router;
