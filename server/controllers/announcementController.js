// backend/controllers/announcementController.js
import Announcement from "../models/Announcement.js";
import path from "path";
import fs from "fs";

const buildImageUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/announcements/${filename}`;
};

// 📌 Create
const addAnnouncement = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: "Title and description are required" });
    }

    const imageFilename = req.file ? req.file.filename : null;

    const newAnnouncement = new Announcement({
      title,
      description,
      createdBy: req.user._id,
      image: imageFilename,
    });

    await newAnnouncement.save();

    return res.status(201).json({
      success: true,
      message: "Announcement created",
      announcement: {
        ...newAnnouncement.toObject(),
        imageUrl: buildImageUrl(req, imageFilename),
      },
    });
  } catch (error) {
    console.error("Add announcement error:", error);
    return res.status(500).json({ success: false, error: "Server error creating announcement" });
  }
};

// 📌 Read All
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const mapped = announcements.map((a) => ({
      ...a.toObject(),
      imageUrl: buildImageUrl(req, a.image),
    }));

    return res.status(200).json({ success: true, announcements: mapped });
  } catch (error) {
    console.error("Get announcements error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching announcements" });
  }
};

// 📌 Read One
const getAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate("createdBy", "name email");

    if (!announcement) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }

    return res.status(200).json({
      success: true,
      announcement: {
        ...announcement.toObject(),
        imageUrl: buildImageUrl(req, announcement.image),
      },
    });
  } catch (error) {
    console.error("Get announcement error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching announcement" });
  }
};

// 📌 Update
const updateAnnouncement = async (req, res) => {
  try {
    const { title, description } = req.body;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }

    // Update text fields
    announcement.title = title || announcement.title;
    announcement.description = description || announcement.description;

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (announcement.image) {
        const oldImagePath = path.join("public", "uploads", "announcements", announcement.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      announcement.image = req.file.filename;
    }

    await announcement.save();

    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      announcement: {
        ...announcement.toObject(),
        imageUrl: buildImageUrl(req, announcement.image),
      },
    });
  } catch (error) {
    console.error("Update announcement error:", error);
    return res.status(500).json({ success: false, error: "Server error updating announcement" });
  }
};

// 📌 Delete
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }

    // Only creator can delete
    if (req.user._id.toString() !== announcement.createdBy.toString()) {
      return res.status(403).json({ success: false, error: "Unauthorized to delete this announcement" });
    }

    // Delete image if exists
    if (announcement.image) {
      const imgPath = path.join("public", "uploads", "announcements", announcement.image);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await Announcement.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return res.status(500).json({ success: false, error: "Server error deleting announcement" });
  }
};

export {
  addAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
