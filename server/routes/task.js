import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { assignTask, updateTaskStatus, getTasks, deleteTask } from "../controllers/taskController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Multer Storage - Memory storage to support S3 uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});


const router = express.Router();

router.post("/assign", authMiddleware, assignTask);
router.put("/:id", authMiddleware, upload.single("file"), updateTaskStatus);
router.get("/", authMiddleware, getTasks);
router.delete("/:id", authMiddleware, deleteTask);

export default router;
