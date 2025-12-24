import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { uploadDocument } from "../middleware/uploadDocument.js";
import {
  uploadDocument as uploadDocumentController,
  getDocuments,
  updateDocumentStatus,
  deleteDocument,
} from "../controllers/documentController.js";

const router = express.Router();

router.post("/upload", authMiddleware, uploadDocument.single("file"), uploadDocumentController);
router.get("/", authMiddleware, getDocuments);
router.put("/:id/status", authMiddleware, updateDocumentStatus);
router.delete("/:id", authMiddleware, deleteDocument);

export default router;
