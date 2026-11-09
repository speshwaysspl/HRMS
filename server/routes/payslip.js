// backend/routes/payslip.js
import express from "express";
import {
  getEmployeeDetails,
  generatePayslip,
  calculateLOP,
  autoGenerateMonthlyPayslips,
  autoGenerateSelectedPayslips,
  getPayslipHistory,
  downloadPayslipPDF,
  testWorkingDays,
  fixWorkingDaysInPayslips,
  previewPayslip,
  sendPayslipEmail,
  downloadPreviewPDF
} from "../controllers/payslipController.js";
import verifyUser from "../middleware/authMiddlware.js";
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();
const adminOrHr = authorizeRoles('admin', 'hr');

// Auto-fetch employee details by employee ID
router.get("/employee/:employeeId", verifyUser, adminOrHr, getEmployeeDetails);



// Generate individual payslip with auto-calculations
router.post("/generate", verifyUser, adminOrHr, generatePayslip);

// Calculate LOP for an employee
router.get("/calculate-lop", verifyUser, adminOrHr, calculateLOP);

// Auto-generate monthly payslips for all employees
router.post("/auto-generate-monthly", verifyUser, adminOrHr, autoGenerateMonthlyPayslips);

// Auto-generate payslips for selected employees
router.post("/auto-generate-selected", verifyUser, adminOrHr, autoGenerateSelectedPayslips);

// Get payslip history with pagination
router.get("/history", verifyUser, getPayslipHistory);

// Download payslip PDF
router.get("/download/:id", verifyUser, downloadPayslipPDF);

// Test working days calculation
router.get("/test-working-days", verifyUser, adminOrHr, testWorkingDays);

// Fix existing payslips with incorrect working days
router.post("/fix-working-days", verifyUser, adminOrHr, fixWorkingDaysInPayslips);

// Preview payslip without saving
router.post("/preview", verifyUser, adminOrHr, previewPayslip);

// Send payslip email
router.post("/send-email", verifyUser, adminOrHr, sendPayslipEmail);

// Download preview PDF
router.post("/download-preview", verifyUser, adminOrHr, downloadPreviewPDF);

export default router;