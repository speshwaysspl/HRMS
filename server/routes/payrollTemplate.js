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

const router = express.Router();

// Create new payroll template
router.post("/", verifyUser, createTemplate);
router.post("/create", verifyUser, createTemplate);

// Get all templates for a specific employee
router.get("/employee/:employeeId", verifyUser, getEmployeeTemplates);

// Get all templates (admin view with pagination and search)
router.get("/all", verifyUser, getAllTemplates);

// Get template statistics
router.get("/stats", verifyUser, getTemplateStats);

// Get active employees with templates for payslip generation (MUST be before /:id route)
router.get("/active-employees-for-payslip", verifyUser, getActiveEmployeesForPayslip);

// Get single template by ID
router.get("/:id", verifyUser, getTemplate);

// Update template
router.put("/:id", verifyUser, updateTemplate);

// Delete template (soft delete)
router.delete("/:id", verifyUser, deleteTemplate);

// Set template as default for employee
router.patch("/:id/set-default", verifyUser, setDefaultTemplate);



// Bulk set templates as default (one per employee)
router.post("/bulk/set-defaults", verifyUser, bulkSetDefaults);

// Quick fix defaults
router.post("/quick-fix-defaults", verifyUser, quickFixDefaults);

export default router;