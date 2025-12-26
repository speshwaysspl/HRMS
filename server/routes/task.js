import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { assignTask, updateTaskStatus, getTasks, deleteTask } from "../controllers/taskController.js";
import { uploadDocument } from "../middleware/uploadDocument.js";

const router = express.Router();

router.post("/assign", authMiddleware, assignTask);
router.put("/:id", authMiddleware, uploadDocument.single("file"), updateTaskStatus);
router.get("/", authMiddleware, getTasks);
router.delete("/:id", authMiddleware, deleteTask);

export default router;
