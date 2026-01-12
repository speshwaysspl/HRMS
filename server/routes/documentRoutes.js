import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { uploadDocumentS3 } from "../middleware/uploadDocumentS3.js";
import {
  uploadDocument as uploadDocumentController,
  getDocuments,
  updateDocumentStatus,
  deleteDocument,
} from "../controllers/documentController.js";

const router = express.Router();

router.post("/upload", authMiddleware, uploadDocumentS3.single("file"), uploadDocumentController);
router.get("/", authMiddleware, getDocuments);
router.put("/:id/status", authMiddleware, updateDocumentStatus);
router.delete("/:id", authMiddleware, deleteDocument);

export default router;
