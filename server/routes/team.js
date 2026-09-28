import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { getTeamAttendance, saveTeamAttendance, exportTeamAttendance, exportAllTeamsAttendance } from "../controllers/teamAttendanceController.js";
import { createTeam, addMembers, getTeams, getTeamDetail, getTeamLeads, deleteTeam } from "../controllers/teamController.js";

const router = express.Router();

router.post("/add", authMiddleware, createTeam);
router.get("/leads", authMiddleware, getTeamLeads);
router.get("/attendance/export", authMiddleware, exportAllTeamsAttendance);
router.post("/members", authMiddleware, addMembers);
router.get("/", authMiddleware, getTeams);
router.get("/:id/attendance/export", authMiddleware, exportTeamAttendance);
router.get("/:id/attendance", authMiddleware, getTeamAttendance);
router.put("/:id/attendance", authMiddleware, saveTeamAttendance);
router.get("/:id", authMiddleware, getTeamDetail);
router.delete("/:id", authMiddleware, deleteTeam);

export default router;
