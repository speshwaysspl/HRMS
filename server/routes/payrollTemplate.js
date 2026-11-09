// backend/routes/payrollTemplate.js
import express from "express";
import {
  createTemplate,
  getAllTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  getEmployeeTemplates,
  setDefaultTemplate,
  getTemplateStats,
  bulkSetDefaults,
  quickFixDefaults,
  getActiveEmployeesForPayslip
} from "../controllers/payrollTemplateController.js";
import verifyUser from "../middleware/authMiddlware.js";
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();
const adminOrHr = authorizeRoles('admin', 'hr');

// Create new payroll template
router.post("/", verifyUser, adminOrHr, createTemplate);
router.post("/create", verifyUser, adminOrHr, createTemplate);

// Get all templates for a specific employee
router.get("/employee/:employeeId", verifyUser, adminOrHr, getEmployeeTemplates);

// Get all templates (admin view with pagination and search)
router.get("/all", verifyUser, adminOrHr, getAllTemplates);

// Get template statistics
router.get("/stats", verifyUser, adminOrHr, getTemplateStats);

// Get active employees with templates for payslip generation (MUST be before /:id route)
router.get("/active-employees-for-payslip", verifyUser, adminOrHr, getActiveEmployeesForPayslip);

// Get single template by ID
router.get("/:id", verifyUser, adminOrHr, getTemplate);

// Update template
router.put("/:id", verifyUser, adminOrHr, updateTemplate);

// Delete template (soft delete)
router.delete("/:id", verifyUser, adminOrHr, deleteTemplate);

// Set template as default for employee
router.patch("/:id/set-default", verifyUser, adminOrHr, setDefaultTemplate);



// Bulk set templates as default (one per employee)
router.post("/bulk/set-defaults", verifyUser, adminOrHr, bulkSetDefaults);

// Quick fix defaults
router.post("/quick-fix-defaults", verifyUser, adminOrHr, quickFixDefaults);

export default router;