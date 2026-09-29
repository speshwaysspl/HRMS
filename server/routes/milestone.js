import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { getMilestones, createMilestone, updateMilestone, deleteMilestone } from "../controllers/milestoneController.js";

const router = express.Router();

router.get("/", authMiddleware, getMilestones);
router.post("/", authMiddleware, createMilestone);
router.put("/:id", authMiddleware, updateMilestone);
router.delete("/:id", authMiddleware, deleteMilestone);

export default router;
