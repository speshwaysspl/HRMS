import Candidate from "../models/Candidate.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { saveFile, deleteFile } from "../utils/fileSaver.js";
import bcrypt from "bcrypt";
import { enqueueEmail } from "../utils/emailQueue.js";

// Helper to generate next candidate ID & temp employee ID
const getNextIds = async () => {
  const lastCandidate = await Candidate.findOne().sort({ createdAt: -1 });
  let nextNum = 1;
  if (lastCandidate && lastCandidate.candidateId) {
    const match = lastCandidate.candidateId.match(/\d+/);
    if (match) {
      nextNum = parseInt(match[0]) + 1;
    }
  }

  // Find highest TEMP ID
  const lastTemp = await Candidate.findOne().sort({ tempEmployeeId: -1 });
  let nextTempNum = 1;
  if (lastTemp && lastTemp.tempEmployeeId) {
    const match = lastTemp.tempEmployeeId.match(/\d+/);
    if (match) {
      nextTempNum = parseInt(match[0]) + 1;
    }
  }

  return {
    candidateId: `CAN${String(nextNum).padStart(3, "0")}`,
    tempEmployeeId: `TEMP${String(nextTempNum).padStart(3, "0")}`
  };
};

// Create Candidate
export const createCandidate = async (req, res) => {
  try {
    console.log("Create Candidate Request Body:", req.body);
    const {
      fullName,
      email,
      mobileNumber,
      position,
      department,
      expectedJoiningDate,
      experience,
      currentCompany,
      password
    } = req.body;

    // Check if candidate already exists
    const existingCandidate = await Candidate.findOne({ email });
    if (existingCandidate) {
      return res.status(400).json({ success: false, error: "Candidate with this email already exists" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "A user with this email already exists" });
    }

    // Generate IDs
    const { candidateId, tempEmployeeId } = await getNextIds();

    // Generate password
    const rawPassword = password || `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Create User account for Candidate Portal
    const newUser = new User({
      name: fullName,
      email: email,
      password: hashedPassword,
      role: ["candidate"]
    });
    const savedUser = await newUser.save();

    // Handle resume upload
    let resumeUrl = "";
    let resumeKey = "";
    if (req.file) {
      try {
        const uploadResult = await saveFile(req.file, "resumes");
        resumeUrl = uploadResult.url;
        resumeKey = uploadResult.key;
      } catch (err) {
        console.error("Failed to upload resume:", err);
      }
    }

    // Create Candidate
    const newCandidate = new Candidate({
      candidateId,
      tempEmployeeId,
      userId: savedUser._id,
      fullName,
      email,
      mobileNumber,
      position,
      department,
      expectedJoiningDate,
      experience,
      currentCompany,
      resumeUrl,
      resumeKey,
      status: "Applied",
      activityTimeline: [
        {
          activity: "Candidate Created",
          performedBy: req.user._id
        }
      ]
    });

    await newCandidate.save();

    // Log action
    const auditLog = new AuditLog({
      action: "CANDIDATE_CREATED",
      performedBy: req.user._id,
      candidateId: newCandidate._id,
      details: `Candidate created: ${fullName} (${candidateId})`
    });
    await auditLog.save();

    return res.status(201).json({
      success: true,
      message: "Candidate created successfully.",
      candidate: newCandidate
    });
  } catch (error) {
    console.error("Create candidate error:", error);
    return res.status(500).json({ success: false, error: "Server error creating candidate" });
  }
};

// Get Candidates (with Search, Filter, Pagination)
export const getCandidates = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.department) {
      query.department = req.query.department;
    }

    // Search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { mobileNumber: searchRegex },
        { candidateId: searchRegex }
      ];
    }

    const total = await Candidate.countDocuments(query);
    const candidates = await Candidate.find(query)
      .populate("department", "dep_name")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      candidates,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get candidates error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching candidates" });
  }
};

// Get Single Candidate
export const getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id)
      .populate("department", "dep_name")
      .populate("userId", "name email")
      .populate("notes.addedBy", "name role")
      .populate("activityTimeline.performedBy", "name role");

    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    return res.status(200).json({ success: true, candidate });
  } catch (error) {
    console.error("Get candidate error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching candidate details" });
  }
};

// Edit Candidate
export const updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const oldStatus = candidate.status;
    const oldInterviewDate = candidate.interviewDate;
    const oldZoomMeetingLink = candidate.zoomMeetingLink;

    // Handle resume update if a new file is uploaded
    if (req.file) {
      // Delete old resume
      if (candidate.resumeKey) {
        await deleteFile(candidate.resumeKey);
      }
      const uploadResult = await saveFile(req.file, "resumes");
      candidate.resumeUrl = uploadResult.url;
      candidate.resumeKey = uploadResult.key;
    }

    // Update fields
    if (req.body.fullName) candidate.fullName = req.body.fullName;
    if (req.body.email) {
      if (req.body.email !== candidate.email) {
        const existingCandidate = await Candidate.findOne({ email: req.body.email });
        if (existingCandidate) {
          return res.status(400).json({ success: false, error: "Candidate with this email already exists" });
        }
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
          return res.status(400).json({ success: false, error: "A user with this email already exists" });
        }
      }
      candidate.email = req.body.email;
    }
    if (req.body.mobileNumber) candidate.mobileNumber = req.body.mobileNumber;
    if (req.body.position) candidate.position = req.body.position;
    if (req.body.department) candidate.department = req.body.department;
    
    if (req.body.expectedJoiningDate !== undefined) {
      candidate.expectedJoiningDate = req.body.expectedJoiningDate === "" ? null : req.body.expectedJoiningDate;
    }
    if (req.body.status) candidate.status = req.body.status;

    // New interview scheduling fields
    if (req.body.interviewDate !== undefined) {
      candidate.interviewDate = req.body.interviewDate === "" ? null : req.body.interviewDate;
    }
    if (req.body.zoomMeetingLink !== undefined) {
      candidate.zoomMeetingLink = req.body.zoomMeetingLink;
    }

    candidate.updatedAt = Date.now();

    // Also update User full name, email or password if changed
    const userUpdate = {};
    if (req.body.fullName) userUpdate.name = req.body.fullName;
    if (req.body.email) userUpdate.email = req.body.email;
    if (req.body.password) {
      userUpdate.password = await bcrypt.hash(req.body.password, 10);
    }
    if (Object.keys(userUpdate).length > 0 && candidate.userId) {
      await User.findByIdAndUpdate(candidate.userId, userUpdate);
    }

    // Log activity
    candidate.activityTimeline.push({
      activity: "Candidate Details Updated",
      performedBy: req.user._id
    });

    const updatedCandidate = await candidate.save();
    await updatedCandidate.populate("department", "dep_name");

    // Send welcome email if status is changed to Selected
    const statusChangedToSelected = (updatedCandidate.status === "Selected" && oldStatus !== "Selected");
    if (statusChangedToSelected) {
      let welcomePassword = req.body.password;
      if (!welcomePassword) {
        welcomePassword = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
        const hashedPassword = await bcrypt.hash(welcomePassword, 10);
        if (candidate.userId) {
          await User.findByIdAndUpdate(candidate.userId, { password: hashedPassword });
        }
      }

      const emailHtml = `
        <h2 style="color: #1e3a8a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Welcome to Speshway Solutions! 🎉</h2>
        <p>Dear <b>${updatedCandidate.fullName}</b>,</p>
        <p>We are delighted to welcome you to the <strong>Speshway Solutions</strong> family! Your candidate onboarding portal account has been successfully activated.</p>
        <p>Please log in to the portal using the credentials below to complete your profile details and upload the required documents for verification.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 8px; padding: 20px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Portal Access Credentials</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 150px;"><strong>Portal Link:</strong></td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 600;"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="color: #2563eb; text-decoration: underline;">Onboarding Portal Login</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Username (Email):</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${updatedCandidate.email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Temporary Password:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${welcomePassword}</td>
            </tr>
          </table>
          <p style="margin-top: 12px; font-size: 12px; color: #64748b; font-style: italic;">* Note: For security reasons, you will be prompted to change this temporary password upon your very first login.</p>
        </div>
        
        <div style="margin: 24px 0; text-align: center;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Get Started with Onboarding</a>
        </div>
        
        <p>Should you face any difficulties or have questions, please feel free to reach out to the HR Operations Team at any time.</p>
        
        <p>Congratulations once again, and we look forward to working with you!</p>
        
        <p style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">Best regards,<br/>
        <strong>HR Operations & Onboarding Team</strong><br/>
        Speshway Solutions Pvt. Ltd.</p>
      `;

      enqueueEmail(updatedCandidate.email, "Welcome to Speshway Solutions Onboarding Portal 🎉", emailHtml);
    }

    // Send email if status is Interview Scheduled and relevant info changed or is set
    const statusChangedToScheduled = (updatedCandidate.status === "Interview Scheduled" && oldStatus !== "Interview Scheduled");
    const scheduleDetailsChanged = (updatedCandidate.status === "Interview Scheduled" && (
      oldInterviewDate?.toString() !== updatedCandidate.interviewDate?.toString() ||
      oldZoomMeetingLink !== updatedCandidate.zoomMeetingLink
    ));

    if (statusChangedToScheduled || scheduleDetailsChanged) {
      if (updatedCandidate.interviewDate && updatedCandidate.zoomMeetingLink) {
        // Format date/time nicely for email
        const formattedDateTime = new Date(updatedCandidate.interviewDate).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
          timeZoneName: "short"
        });

        const emailHtml = `
          <h2 style="color: #1e3a8a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Interview Call Scheduled 📅</h2>
          <p>Dear <b>${updatedCandidate.fullName}</b>,</p>
          <p>Thank you for your interest in joining <strong>Speshway Solutions</strong>. We have reviewed your application and would like to invite you for an interview for the position of <b>${updatedCandidate.position}</b>.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 8px; padding: 20px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <h4 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Interview Invitation Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 120px;"><strong>Position:</strong></td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${updatedCandidate.position}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Date & Time:</strong></td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${formattedDateTime}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Platform:</strong></td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">Zoom Video Conference</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Meeting Link:</strong></td>
                <td style="padding: 6px 0;"><a href="${updatedCandidate.zoomMeetingLink}" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: underline;">Join Zoom Meeting</a></td>
              </tr>
            </table>
          </div>
          
          <div style="margin: 24px 0; text-align: center;">
            <a href="${updatedCandidate.zoomMeetingLink}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Join Virtual Lobby</a>
          </div>
          
          <h3 style="color: #0f172a; font-size: 16px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Important Guidelines for the Interview:</h3>
          <ul style="padding-left: 20px; margin-bottom: 24px; line-height: 1.6;">
            <li style="margin-bottom: 8px;"><strong>Stable Internet:</strong> Ensure a reliable, high-speed connection to avoid disruptions.</li>
            <li style="margin-bottom: 8px;"><strong>Environment:</strong> Conduct the call from a quiet, well-lit, and professional space.</li>
            <li style="margin-bottom: 8px;"><strong>Punctuality:</strong> Please join the meeting <b>5 minutes prior</b> to the scheduled slot.</li>
            <li style="margin-bottom: 8px;"><strong>Documents:</strong> Keep a digital copy of your updated resume and any portfolio references ready to share.</li>
          </ul>
          
          <p>If you need to reschedule or have any questions, please reply directly to this email or contact our recruitment desk.</p>
          
          <p>We are excited to learn more about your experience and fit for this role. Good luck!</p>
          
          <p style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">Best regards,<br/>
          <strong>Talent Acquisition Operations</strong><br/>
          Speshway Solutions Pvt. Ltd.</p>
        `;

        enqueueEmail(
          updatedCandidate.email,
          `Interview Scheduled - Speshway Solutions 📅`,
          emailHtml
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Candidate updated successfully",
      candidate: updatedCandidate
    });
  } catch (error) {
    console.error("Update candidate error:", error);
    return res.status(500).json({ success: false, error: "Server error updating candidate" });
  }
};

// Delete Candidate
export const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    // Delete resume file
    if (candidate.resumeKey) {
      await deleteFile(candidate.resumeKey);
    }

    // Delete User login record
    await User.findByIdAndDelete(candidate.userId);

    // Delete Candidate record
    await Candidate.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Candidate and associated portal user deleted" });
  } catch (error) {
    console.error("Delete candidate error:", error);
    return res.status(500).json({ success: false, error: "Server error deleting candidate" });
  }
};

// Add Note
export const addCandidateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ success: false, error: "Note content is required" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    candidate.notes.push({
      note,
      addedBy: req.user._id
    });

    candidate.activityTimeline.push({
      activity: `Note added: "${note.substring(0, 30)}..."`,
      performedBy: req.user._id
    });

    await candidate.save();

    const updated = await Candidate.findById(id)
      .populate("notes.addedBy", "name role")
      .populate("activityTimeline.performedBy", "name role");

    return res.status(200).json({
      success: true,
      message: "Note added successfully",
      notes: updated.notes
    });
  } catch (error) {
    console.error("Add note error:", error);
    return res.status(500).json({ success: false, error: "Server error adding note" });
  }
};

// Update Candidate Status
export const updateCandidateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: "Status is required" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const oldStatus = candidate.status;
    candidate.status = status;
    candidate.activityTimeline.push({
      activity: `Status changed from ${oldStatus} to ${status}`,
      performedBy: req.user._id
    });

    await candidate.save();

    // Send welcome email if status is changed to Selected
    if (status === "Selected" && oldStatus !== "Selected") {
      const welcomePassword = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedPassword = await bcrypt.hash(welcomePassword, 10);
      if (candidate.userId) {
        await User.findByIdAndUpdate(candidate.userId, { password: hashedPassword });
      }

      const emailHtml = `
        <h2 style="color: #1e3a8a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Welcome to Speshway Solutions! 🎉</h2>
        <p>Dear <b>${candidate.fullName}</b>,</p>
        <p>We are delighted to welcome you to the <strong>Speshway Solutions</strong> family! Your candidate onboarding portal account has been successfully activated.</p>
        <p>Please log in to the portal using the credentials below to complete your profile details and upload the required documents for verification.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 8px; padding: 20px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Portal Access Credentials</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 150px;"><strong>Portal Link:</strong></td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 600;"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="color: #2563eb; text-decoration: underline;">Onboarding Portal Login</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Username (Email):</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${candidate.email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Temporary Password:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${welcomePassword}</td>
            </tr>
          </table>
          <p style="margin-top: 12px; font-size: 12px; color: #64748b; font-style: italic;">* Note: For security reasons, you will be prompted to change this temporary password upon your very first login.</p>
        </div>
        
        <div style="margin: 24px 0; text-align: center;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Get Started with Onboarding</a>
        </div>
        
        <p>Should you face any difficulties or have questions, please feel free to reach out to the HR Operations Team at any time.</p>
        
        <p>Congratulations once again, and we look forward to working with you!</p>
        
        <p style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">Best regards,<br/>
        <strong>HR Operations & Onboarding Team</strong><br/>
        Speshway Solutions Pvt. Ltd.</p>
      `;

      enqueueEmail(candidate.email, "Welcome to Speshway Solutions Onboarding Portal 🎉", emailHtml);
    }

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      candidate
    });
  } catch (error) {
    console.error("Update status error:", error);
    return res.status(500).json({ success: false, error: "Server error updating status" });
  }
};

// Update Candidate Account Active Status
export const updateCandidateAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: "isActive must be a boolean value" 
      });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ 
        success: false, 
        error: "Candidate not found" 
      });
    }

    candidate.isActive = isActive;
    candidate.updatedAt = Date.now();
    candidate.activityTimeline.push({
      activity: `Account ${isActive ? 'activated' : 'deactivated'}`,
      performedBy: req.user._id
    });

    await candidate.save();

    return res.status(200).json({ 
      success: true, 
      message: `Candidate account ${isActive ? 'activated' : 'deactivated'}`,
      candidate
    });
  } catch (error) {
    console.error("Update candidate account status error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Server error updating candidate account status" 
    });
  }
};
