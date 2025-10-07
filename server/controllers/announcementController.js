// backend/controllers/announcementController.js
import Announcement from "../models/Announcement.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import { uploadToS3, deleteFromS3 } from "../middleware/uploadAnnouncementS3.js";
import { getAnnouncementEmailTemplate, getAnnouncementEmailSubject } from "../utils/emailTemplates.js";
import { createAnnouncementNotification } from "./notificationController.js";

const buildImageUrl = (imageUrl) => {
  return imageUrl || null;
};

// 📌 Create
const addAnnouncement = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: "Title and description are required" });
    }

    // Handle image upload
    let imageUrl = null;
    let imageKey = null;
    if (req.file) {
      try {
        const uploadResult = await uploadToS3(req.file);
        imageUrl = uploadResult.url;
        imageKey = uploadResult.key;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({ success: false, error: "Failed to upload image" });
      }
    }

    const newAnnouncement = new Announcement({
      title,
      description,
      createdBy: req.user._id,
      image: imageUrl,
      imageKey: imageKey, // Store S3 key for deletion
    });

    await newAnnouncement.save();

    // Send real-time notifications to all employees
    const io = req.app.get('io');
    console.log('🔌 IO object available:', !!io);
    if (io) {
      try {
        console.log('📢 Calling createAnnouncementNotification...');
        await createAnnouncementNotification(newAnnouncement, req.user._id, io);
        console.log('✅ Announcement notification process completed');
      } catch (notificationError) {
        console.error('❌ Error sending announcement notifications:', notificationError);
      }
    } else {
      console.log('⚠️ IO object not available - notifications will not be sent');
    }

    // Send email notifications to all employees
    try {
      // Get all active employees with their user details
      const employees = await Employee.find({ status: "active" }).populate('userId', 'email name');
      
      if (employees.length > 0) {
        // Create professional email content
        const emailSubject = getAnnouncementEmailSubject(title);

        // Send personalized emails to all employees
        const emailPromises = employees.map(employee => {
          if (employee.userId && employee.userId.email) {
            // Generate personalized email template for each employee
            const emailHtml = getAnnouncementEmailTemplate({
              title,
              description,
              imageUrl,
              recipientName: employee.userId.name,
              createdAt: new Date()
            });
            
            return sendEmail(employee.userId.email, emailSubject, emailHtml)
              .catch(error => {
                console.error(`Failed to send email to ${employee.userId.email}:`, error);
                return null; // Continue with other emails even if one fails
              });
          }
          return Promise.resolve(null);
        });

        await Promise.allSettled(emailPromises);
        console.log(`📧 Announcement emails sent to ${employees.length} employees`);
      }
    } catch (emailError) {
      console.error("Error sending announcement emails:", emailError);
      // Don't fail the announcement creation if email sending fails
    }

    return res.status(201).json({
      success: true,
      message: "Announcement created and notifications sent",
      announcement: {
        ...newAnnouncement.toObject(),
        imageUrl: buildImageUrl(imageUrl),
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
      imageUrl: buildImageUrl(a.image),
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
        imageUrl: buildImageUrl(announcement.image),
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
      // Delete old image from S3 if exists
      if (announcement.imageKey) {
        try {
          await deleteFromS3(announcement.imageKey);
        } catch (deleteError) {
          console.error("Error deleting old image from S3:", deleteError);
          // Continue with upload even if delete fails
        }
      }

      // Upload new image to S3
      try {
        const uploadResult = await uploadToS3(req.file);
        announcement.image = uploadResult.url;
        announcement.imageKey = uploadResult.key;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({ success: false, error: "Failed to upload new image" });
      }
    }

    await announcement.save();

    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      announcement: {
        ...announcement.toObject(),
        imageUrl: buildImageUrl(announcement.image),
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

    // Delete image from S3 if exists
    if (announcement.imageKey) {
      try {
        await deleteFromS3(announcement.imageKey);
      } catch (deleteError) {
        console.error("Error deleting image from S3:", deleteError);
        // Continue with announcement deletion even if S3 delete fails
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
