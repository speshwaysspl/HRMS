// backend/routes/announcementRoutes.js
import express from "express";
import verifyUser from "../middleware/authMiddlware.js";
import {
  addAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController.js";
import { uploadAnnouncementS3 } from "../middleware/uploadAnnouncementS3.js";

const router = express.Router();

router.get("/", verifyUser, getAnnouncements);
router.post("/", verifyUser, uploadAnnouncementS3.single("image"), addAnnouncement);
router.get("/:id", verifyUser, getAnnouncement);
router.put("/:id", verifyUser, uploadAnnouncementS3.single("image"), updateAnnouncement);
router.delete("/:id", verifyUser, deleteAnnouncement);

export default router;
