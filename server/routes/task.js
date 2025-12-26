import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { assignTask, updateTaskStatus, getTasks, deleteTask } from "../controllers/taskController.js";
import multer from "multer";
import path from "path";
const storage = multer.memoryStorage();

const upload = multer({ storage });

const router = express.Router();

router.post("/assign", authMiddleware, assignTask);
router.put("/:id", authMiddleware, upload.single("file"), updateTaskStatus);
router.get("/", authMiddleware, getTasks);
router.delete("/:id", authMiddleware, deleteTask);

export default router;
