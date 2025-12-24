import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { createTeam, addMembers, getTeams, getTeamDetail, getTeamLeads, deleteTeam } from "../controllers/teamController.js";

const router = express.Router();

router.post("/add", authMiddleware, createTeam);
router.get("/leads", authMiddleware, getTeamLeads);
router.post("/members", authMiddleware, addMembers);
router.get("/", authMiddleware, getTeams);
router.get("/:id", authMiddleware, getTeamDetail);
router.delete("/:id", authMiddleware, deleteTeam);

export default router;
