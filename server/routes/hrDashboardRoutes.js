import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  getHRDashboardSummary,
  exportHRDashboardReport
} from "../controllers/hrDashboardController.js";

const router = express.Router();

router.get(
  "/summary",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  getHRDashboardSummary
);

router.get(
  "/export",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  exportHRDashboardReport
);

export default router;
