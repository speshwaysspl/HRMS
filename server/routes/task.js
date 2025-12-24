import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { assignTask, updateTaskStatus, getTasks, deleteTask } from "../controllers/taskController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join("public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const router = express.Router();

router.post("/assign", authMiddleware, assignTask);
router.put("/:id", authMiddleware, upload.single("file"), updateTaskStatus);
router.get("/", authMiddleware, getTasks);
router.delete("/:id", authMiddleware, deleteTask);

export default router;
