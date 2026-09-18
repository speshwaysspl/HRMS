// backend/controllers/announcementController.js
import Announcement from "../models/Announcement.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import { uploadToS3, deleteFromS3 } from "../middleware/uploadAnnouncementS3.js";
import { getAnnouncementEmailTemplate, getAnnouncementEmailSubject } from "../utils/emailTemplates.js";
import { createAnnouncementNotification } from "./notificationController.js";
import { enqueueEmail } from "../utils/emailQueue.js";

const buildImageUrl = (imageUrl) => {
  return imageUrl || null;
};

// Helper to resolve targeted recipients based on scope
const resolveAnnouncementRecipients = async (scope, targetTeam, customRecipients) => {
  let list = [];
  if (typeof customRecipients === 'string' && customRecipients.trim()) {
    try { list = JSON.parse(customRecipients); } catch (e) { list = []; }
  } else if (Array.isArray(customRecipients)) {
    list = customRecipients;
  }

  // If the admin explicitly provided checked recipients:
  if (list && list.length > 0) {
    let teamId = null;
    if (scope === 'team' && targetTeam) {
      const team = await Team.findById(targetTeam);
      if (!team) throw new Error('Selected team was not found');
      teamId = team._id;
    }
    return { recipients: list, targetTeam: teamId };
  }

  if (scope === 'all') {
    return { recipients: [], targetTeam: null };
  }

  if (scope === 'specific') {
    return { recipients: list, targetTeam: null };
  }

  if (scope === 'team_leads') {
    // Users having team_lead role
    const leadUsers = await User.find({ role: 'team_lead' }).select('_id');
    const leadUserIds = new Set(leadUsers.map(u => u._id.toString()));

    // Also team leads from Team records
    const teams = await Team.find().select('leadId');
    teams.forEach(t => {
      if (t.leadId) leadUserIds.add(t.leadId.toString());
    });

    return { recipients: Array.from(leadUserIds), targetTeam: null };
  }

  if (scope === 'team') {
    if (!targetTeam) {
      throw new Error('Please select a team for this announcement');
    }
    const team = await Team.findById(targetTeam);
    if (!team) {
      throw new Error('Selected team was not found');
    }

    const teamUserIds = new Set();
    // Include the team lead
    if (team.leadId) {
      teamUserIds.add(team.leadId.toString());
    }

    // Resolve employee members to their corresponding User IDs
    const memberEmpIds = (team.members || [])
      .map(m => m.employeeId)
      .filter(Boolean);

    if (memberEmpIds.length > 0) {
      const memberEmployees = await Employee.find({ _id: { $in: memberEmpIds } }).select('userId');
      memberEmployees.forEach(emp => {
        if (emp.userId) teamUserIds.add(emp.userId.toString());
      });
    }

    return { recipients: Array.from(teamUserIds), targetTeam: team._id };
  }

  if (scope === 'team_members') {
    // Collect all employee IDs who are members across all teams
    const allTeams = await Team.find().select('members');
    const teamMemberEmpIds = new Set();
    allTeams.forEach(t => {
      (t.members || []).forEach(m => {
        if (m.employeeId) teamMemberEmpIds.add(m.employeeId.toString());
      });
    });

    // Find all active employees who are members of any team OR have an employee role
    const allEmployees = await Employee.find({ status: 'active' }).populate('userId', 'role');
    const memberUserIds = new Set();

    allEmployees.forEach(emp => {
      if (!emp.userId) return;
      const isTeamMember = teamMemberEmpIds.has(emp._id.toString());
      const roles = Array.isArray(emp.userId.role) ? emp.userId.role : [emp.userId.role];
      const hasEmployeeRole = roles.includes('employee');

      if (isTeamMember || hasEmployeeRole) {
        memberUserIds.add(emp.userId._id.toString());
      }
    });

    return { recipients: Array.from(memberUserIds), targetTeam: null };
  }

  return { recipients: [], targetTeam: null };
};

// 📌 Create
const addAnnouncement = async (req, res) => {
  try {
    const { title, description, scope = 'all', targetTeam = null, recipients = [], category = 'important' } = req.body;

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

    let resolved;
    try {
      resolved = await resolveAnnouncementRecipients(scope, targetTeam, recipients);
    } catch (resolveError) {
      return res.status(400).json({ success: false, error: resolveError.message });
    }

    const newAnnouncement = new Announcement({
      title,
      description,
      category: category || 'important',
      scope,
      targetTeam: resolved.targetTeam,
      recipients: resolved.recipients,
      createdBy: req.user._id,
      image: imageUrl,
      imageKey: imageKey, // Store S3 key for deletion
    });

    await newAnnouncement.save();

    // Create notifications in DB and emit real-time pop notifications to intended recipients
    const io = req.app.get('io');
    const ioForNotification = io; // Always emit pop notifications to intended recipients
    console.log('🔌 IO object available:', !!io);
    try {
      console.log('📢 Calling createAnnouncementNotification...');
      const hasSpecificRecipients = Array.isArray(newAnnouncement.recipients) && newAnnouncement.recipients.length > 0;
      const targetRecipients = hasSpecificRecipients ? newAnnouncement.recipients : (newAnnouncement.scope === 'all' ? null : []);
      await createAnnouncementNotification(newAnnouncement, req.user._id, ioForNotification, targetRecipients);
      console.log('✅ Announcement notification process completed');
    } catch (notificationError) {
      console.error('❌ Error sending announcement notifications:', notificationError);
    }

    // Send email notifications
    try {
      let employeesList = [];

      if (Array.isArray(newAnnouncement.recipients) && newAnnouncement.recipients.length > 0) {
        employeesList = await Employee.find({ status: 'active', userId: { $in: newAnnouncement.recipients } }).populate('userId', 'email name');
      } else if (newAnnouncement.scope === 'all') {
        employeesList = await Employee.find({ status: 'active' }).populate('userId', 'email name');
      }

      if (employeesList.length > 0) {
        const emailSubject = getAnnouncementEmailSubject(title, newAnnouncement.category);

        // Prepare email attachments if image exists
        let emailAttachments = [];
        if (req.file && req.file.buffer) {
          emailAttachments = [{
            filename: req.file.originalname || 'announcement-image.jpg',
            content: req.file.buffer,
            cid: 'announcement-image' // Content-ID for embedding in email
          }];
        }

        const emailPromises = employeesList.map(employee => {
          if (employee.userId && employee.userId.email) {
            // Use CID reference if image exists, otherwise pass null
            const emailImageUrl = req.file ? 'cid:announcement-image' : null;
            
            const emailHtml = getAnnouncementEmailTemplate({
              title,
              description,
              imageUrl: emailImageUrl,
              recipientName: employee.userId.name,
              createdAt: new Date(),
              category: newAnnouncement.category,
            });
            
            enqueueEmail(employee.userId.email, emailSubject, emailHtml, emailAttachments);
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        });

        await Promise.allSettled(emailPromises);
        console.log(`📧 Announcement emails processed for ${employeesList.length} employees`);
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
    const roles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role];
    const isAdmin = roles.includes('admin');
    const filter = isAdmin
      ? {}
      : {
          $or: [
            { recipients: req.user._id },
            { scope: 'all', recipients: { $size: 0 } },
            { scope: 'all', recipients: { $exists: false } }
          ]
        };

    const announcements = await Announcement.find(filter)
      .populate("createdBy", "name email")
      .populate("targetTeam", "name")
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
    const announcement = await Announcement.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("targetTeam", "name");

    if (!announcement) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }

    // Restrict visibility for non-admin users to only relevant announcements
    const roles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role];
    const isAdmin = roles.includes('admin');
    if (!isAdmin) {
      const hasRecipients = Array.isArray(announcement.recipients) && announcement.recipients.length > 0;
      const isRecipient = hasRecipients
        ? announcement.recipients.some((r) => (r._id || r).toString() === req.user._id.toString())
        : announcement.scope === 'all';
      if (!isRecipient) {
        return res.status(403).json({ success: false, error: "Unauthorized to view this announcement" });
      }
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
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }

    const { title, description, scope, targetTeam, recipients = [], category } = req.body;

    const newScope = scope || announcement.scope;
    const newTeam = targetTeam !== undefined ? targetTeam : announcement.targetTeam;

    let resolved;
    try {
      const customRecipients = recipients !== undefined && recipients !== null ? recipients : announcement.recipients;
      resolved = await resolveAnnouncementRecipients(
        newScope,
        newTeam,
        customRecipients
      );
    } catch (resolveError) {
      return res.status(400).json({ success: false, error: resolveError.message });
    }

    announcement.title = title || announcement.title;
    announcement.description = description || announcement.description;
    if (category) announcement.category = category;
    announcement.scope = newScope;
    announcement.targetTeam = resolved.targetTeam;
    announcement.recipients = resolved.recipients;

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
