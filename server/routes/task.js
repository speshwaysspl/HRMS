import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { assignTask, updateTaskStatus, getTasks, deleteTask, editTask, locateTask } from "../controllers/taskController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Multer Storage - Memory storage to support S3 uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});


const router = express.Router();

router.post("/assign", authMiddleware, upload.single("file"), assignTask);
router.put("/:id/details", authMiddleware, upload.single("file"), editTask);
// "file" = legacy single proof (replaces all); "files" = new proofs to add (multi-upload).
router.put("/:id", authMiddleware, upload.fields([{ name: "file", maxCount: 1 }, { name: "files", maxCount: 10 }]), updateTaskStatus);
router.get("/", authMiddleware, getTasks);
router.get("/:id/locate", authMiddleware, locateTask);
router.delete("/:id", authMiddleware, deleteTask);

export default router;
