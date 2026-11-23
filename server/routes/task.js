import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { assignTask, updateTaskStatus, getTasks, deleteTask, editTask, locateTask } from "../controllers/taskController.js";
import multer from "multer";
import { getDocStreamFromS3 } from "../middleware/uploadDocumentS3.js";
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
// Streams a stored task file (work proof / attachment) from our S3 bucket so the web
// app can preview it in-page; the browser can't fetch S3 directly (CSP + no S3 CORS).
router.get("/file", authMiddleware, async (req, res) => {
  try {
    const file = await getDocStreamFromS3(String(req.query.url || ""));
    if (!file) return res.status(400).json({ success: false, error: "Invalid file url" });
    if (file.contentType) res.setHeader("Content-Type", file.contentType);
    if (file.contentLength) res.setHeader("Content-Length", file.contentLength);
    res.setHeader("Cache-Control", "private, max-age=300");
    file.body.pipe(res);
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode === 404 ? 404 : 500;
    return res.status(status).json({ success: false, error: "Could not load file" });
  }
});
router.get("/:id/locate", authMiddleware, locateTask);
router.delete("/:id", authMiddleware, deleteTask);

export default router;
