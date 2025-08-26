// backend/routes/salary.js
import express from "express";
import authMiddleware from "../middleware/authMiddlware.js"; // keep your existing filename
import { getSalary, downloadSalaryPDF, deleteSalary } from "../controllers/salaryController.js";

const router = express.Router();

// Place the PDF route BEFORE the generic param route to avoid conflicts
router.get("/pdf/:id", authMiddleware, downloadSalaryPDF);

// Delete salary record
router.delete("/:id", authMiddleware, deleteSalary);

router.get("/:id/:role", authMiddleware, getSalary);

export default router;
