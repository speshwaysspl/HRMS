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

const router = express.Router();

// Auto-fetch employee details by employee ID
router.get("/employee/:employeeId", verifyUser, getEmployeeDetails);



// Generate individual payslip with auto-calculations
router.post("/generate", verifyUser, generatePayslip);

// Calculate LOP for an employee
router.get("/calculate-lop", verifyUser, calculateLOP);

// Auto-generate monthly payslips for all employees
router.post("/auto-generate-monthly", verifyUser, autoGenerateMonthlyPayslips);

// Auto-generate payslips for selected employees
router.post("/auto-generate-selected", verifyUser, autoGenerateSelectedPayslips);

// Get payslip history with pagination
router.get("/history", verifyUser, getPayslipHistory);

// Download payslip PDF
router.get("/download/:id", verifyUser, downloadPayslipPDF);

// Test working days calculation
router.get("/test-working-days", verifyUser, testWorkingDays);

// Fix existing payslips with incorrect working days
router.post("/fix-working-days", verifyUser, fixWorkingDaysInPayslips);

// Preview payslip without saving
router.post("/preview", verifyUser, previewPayslip);

// Send payslip email
router.post("/send-email", verifyUser, sendPayslipEmail);

// Download preview PDF
router.post("/download-preview", verifyUser, downloadPreviewPDF);

export default router;