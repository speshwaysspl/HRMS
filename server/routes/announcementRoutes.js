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
import { uploadAnnouncement } from "../middleware/uploadAnnouncement.js";

const router = express.Router();

router.get("/", verifyUser, getAnnouncements);
router.post("/", verifyUser, uploadAnnouncement.single("image"), addAnnouncement);
router.get("/:id", verifyUser, getAnnouncement);
router.put("/:id", verifyUser, uploadAnnouncement.single("image"), updateAnnouncement);
router.delete("/:id", verifyUser, deleteAnnouncement);

export default router;
