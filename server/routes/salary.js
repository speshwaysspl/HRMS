// backend/routes/salary.js
import express from "express";
import authMiddleware from "../middleware/authMiddlware.js"; // keep your existing filename
import { getSalary, downloadSalaryPDF, deleteSalary } from "../controllers/salaryController.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();
const adminOrHr = authorizeRoles('admin', 'hr');

// Place the PDF route BEFORE the generic param route to avoid conflicts
router.get("/pdf/:id", authMiddleware, downloadSalaryPDF);

// Delete salary record
router.delete("/:id", authMiddleware, adminOrHr, deleteSalary);

router.get("/:id/:role", authMiddleware, getSalary);

export default router;
