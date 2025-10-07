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
import { createAnnouncementNotification } from "../controllers/notificationController.js";

const router = express.Router();

// Get all announcements
router.get("/", verifyUser, getAnnouncements);

// Add new announcement
router.post("/", verifyUser, uploadAnnouncementS3.single("image"), addAnnouncement);

// Test notification endpoint
router.post("/test-notification", verifyUser, async (req, res) => {
  try {
    console.log('🧪 Testing announcement notification...');
    const io = req.app.get('io');
    
    const testAnnouncement = {
      _id: 'test-id',
      title: 'Test Announcement',
      content: 'This is a test announcement for debugging notifications'
    };
    
    await createAnnouncementNotification(testAnnouncement, req.user._id, io);
    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get announcement by ID
router.get("/:id", verifyUser, getAnnouncement);

// Update announcement
router.put("/:id", verifyUser, uploadAnnouncementS3.single("image"), updateAnnouncement);

// Delete announcement
router.delete("/:id", verifyUser, deleteAnnouncement);

export default router;
