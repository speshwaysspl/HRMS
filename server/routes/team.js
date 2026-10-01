import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { getTeamAttendance, saveTeamAttendance, exportTeamAttendance, exportAllTeamsAttendance } from "../controllers/teamAttendanceController.js";
import { createTeam, addMembers, getTeams, getTeamDetail, getTeamLeads, deleteTeam, updateTeam, removeMember, logTeamReport } from "../controllers/teamController.js";

const router = express.Router();

router.post("/add", authMiddleware, createTeam);
router.get("/leads", authMiddleware, getTeamLeads);
router.get("/attendance/export", authMiddleware, exportAllTeamsAttendance);
router.post("/members", authMiddleware, addMembers);
router.get("/", authMiddleware, getTeams);
router.get("/:id/attendance/export", authMiddleware, exportTeamAttendance);
router.get("/:id/attendance", authMiddleware, getTeamAttendance);
router.post("/:id/report-log", authMiddleware, logTeamReport);
router.put("/:id/attendance", authMiddleware, saveTeamAttendance);
router.get("/:id", authMiddleware, getTeamDetail);
router.put("/:id", authMiddleware, updateTeam);
router.delete("/:id/members/:employeeId", authMiddleware, removeMember);
router.delete("/:id", authMiddleware, deleteTeam);

export default router;
