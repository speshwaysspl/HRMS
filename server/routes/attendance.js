import express from "express";
import {
  saveAttendance,
  getAttendanceReport,
  getAllAttendance,
  exportAttendanceExcel,
  getTodayAttendance,
  getMonthlyAttendance,            // 🔹 new
  exportMonthlyAttendanceExcel,    // 🔹 new
} from "../controllers/attendanceController.js";
import authMiddleware from "../middleware/authMiddlware.js";

const router = express.Router();

// ================= Employee =================
router.post("/", authMiddleware, saveAttendance);
router.get("/report", authMiddleware, getAttendanceReport);
router.get("/today", authMiddleware, getTodayAttendance);

// ================= Admin =================
router.get("/admin/all", authMiddleware, getAllAttendance);          // day-wise
router.get("/admin/export", authMiddleware, exportAttendanceExcel);  // day-wise Excel

router.get("/admin/monthly", authMiddleware, getMonthlyAttendance);                  // 🔹 monthly
router.get("/admin/export/monthly", authMiddleware, exportMonthlyAttendanceExcel);   // 🔹 monthly Excel

export default router;
