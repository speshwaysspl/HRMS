import Candidate from "../models/Candidate.js";
import CandidateProfile from "../models/CandidateProfile.js";
import CandidateDocument from "../models/CandidateDocument.js";
import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import bcrypt from "bcrypt";
import { enqueueEmail } from "../utils/emailQueue.js";
import { createNotification } from "./notificationController.js";
import { uploadDocToS3 } from "../middleware/uploadDocumentS3.js";
import { generateOfferLetterPDFBuffer } from "../utils/offerPdfGenerator.js";
import Offer from "../models/Offer.js";
import Appointment from "../models/Appointment.js";
import Document from "../models/Document.js";
import { generateAppointmentLetterPDFBuffer } from "../utils/appointmentPdfGenerator.js";
import { saveFile, deleteFile } from "../utils/fileSaver.js";


// Utility to create activity logs
const logActivity = async (candidateId, userId, action, details) => {
  try {
    const log = new AuditLog({ candidateId, userId, action, details });
    await log.save();
  } catch (err) {
    console.error("Audit log error:", err);
  }
};

// Generate and email candidate offer letter PDF and upload it to S3/dashboard
const generateAndSendOfferLetter = async (candidate, profile, req) => {
  try {
    // 1. Populate department
    const populatedCandidate = await Candidate.findById(candidate._id).populate("department");
    
    // 2. Generate PDF Buffer
    const pdfCandidate = {
      ...populatedCandidate.toObject(),
      offerDate: new Date()
    };
    const pdfBuffer = await generateOfferLetterPDFBuffer(pdfCandidate, profile);
    
    // 3. Upload to S3
    const fileObj = {
      originalname: `Offer_Letter_${populatedCandidate.fullName.replace(/\s+/g, "_")}.pdf`,
      buffer: pdfBuffer,
      mimetype: "application/pdf"
    };
    const uploadResult = await uploadDocToS3(fileObj);
    
    if (uploadResult.success) {
      // 4. Save to Candidate record
      candidate.offerLetterUrl = uploadResult.url;
      candidate.offerLetterKey = uploadResult.key;
      await candidate.save();
      
      // Log Activity
      await logActivity(candidate._id, req.user?._id || candidate.userId, "Offer Letter Generated", "Official offer letter generated and uploaded to dashboard");
      
      // 5. Send Email
      const emailHtml = `
        <h2>Official Offer Letter from SPESHWAY SOLUTIONS PVT LTD ✉️</h2>
        <p>Dear <b>${populatedCandidate.fullName}</b>,</p>
        <p>Congratulations! We are pleased to inform you that your pre-onboarding documents and profile verification have been successfully completed.</p>
        <p>Accordingly, we have generated your official offer letter for the position of <b>${populatedCandidate.position}</b> in the <b>${populatedCandidate.department?.dep_name || 'Technology'}</b> department.</p>
        <p>Your offer letter is attached to this email and is also available in your candidate dashboard for review and download.</p>
        <p>Please log in to the onboarding portal to review the offer details and accept the offer:</p>
        <p><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Login to Dashboard</a></p>
        <p>Regards,<br/>HR Team<br/>SPESHWAY SOLUTIONS PVT LTD</p>
      `;
      enqueueEmail(populatedCandidate.email, "Official Offer Letter - SPESHWAY SOLUTIONS PVT LTD", emailHtml, [
        {
          filename: `Offer_Letter_${populatedCandidate.fullName.replace(/\s+/g, "_")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error generating/sending offer letter:", error);
    return false;
  }
};

// Create Candidate (HR/Admin Action)
export const createCandidate = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, position, departmentId, password } = req.body;

    if (!fullName || !email || !mobileNumber || !position || !departmentId || !password) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    const newUser = new User({
      name: fullName,
      email,
      password: hashedPassword,
      role: ["candidate"]
    });
    const savedUser = await newUser.save();

    // Create Candidate
    const newCandidate = new Candidate({
      fullName,
      email,
      mobileNumber,
      position,
      department: departmentId,
      userId: savedUser._id,
      status: "Applied"
    });
    const savedCandidate = await newCandidate.save();

    // Initialize blank Profile
    const newProfile = new CandidateProfile({
      candidateId: savedCandidate._id,
      userId: savedUser._id
    });
    await newProfile.save();

    // Initialize blank Document array
    const newDoc = new CandidateDocument({
      candidateId: savedCandidate._id,
      userId: savedUser._id,
      documents: []
    });
    await newDoc.save();

    // Log Activity
    await logActivity(savedCandidate._id, req.user._id, "Candidate Created", `Account generated with ID ${savedCandidate.candidateId}`);

    // Send notification
    const io = req.io || req.app.get("io");
    const adminUsers = await User.find({ role: "admin" });
    for (const admin of adminUsers) {
      await createNotification({
        type: "candidate_created",
        title: "New Candidate Created",
        message: `${fullName} has applied for the position of ${position}`,
        recipientId: admin._id,
        senderId: req.user._id,
        relatedId: savedCandidate._id
      }, io);
    }

    return res.status(200).json({ success: true, candidate: savedCandidate });
  } catch (error) {
    console.error("Create candidate error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get all Candidates
export const getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find()
      .populate("userId", "name email role")
      .populate("department", "dep_name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, candidates });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get Candidate Details (HR/Admin or Candidate themselves)
export const getCandidateDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let candidate = await Candidate.findById(id)
      .populate("userId", "name email role")
      .populate("department", "dep_name");

    if (!candidate) {
      candidate = await Candidate.findOne({ userId: id })
        .populate("userId", "name email role")
        .populate("department", "dep_name");
    }

    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const profile = await CandidateProfile.findOne({ candidateId: candidate._id });
    const docs = await CandidateDocument.findOne({ candidateId: candidate._id });
    const logs = await AuditLog.find({ candidateId: candidate._id })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, candidate, profile, docs, logs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Update Candidate Details
export const updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobileNumber, position, departmentId, status, password, designation, joiningDate, expectedJoiningDate, reportingTime, ctc, interviewDate, zoomMeetingLink } = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });

    if (email && email !== candidate.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, error: "Email already in use" });
      }
    }

    const oldStatus = candidate.status;
    const oldInterviewDate = candidate.interviewDate;
    const oldZoomMeetingLink = candidate.zoomMeetingLink;

    candidate.fullName = fullName || candidate.fullName;
    candidate.email = email || candidate.email;
    candidate.mobileNumber = mobileNumber || candidate.mobileNumber;
    candidate.position = position || candidate.position;
    candidate.department = departmentId || candidate.department;
    if (designation !== undefined) candidate.designation = designation;
    if (joiningDate !== undefined) candidate.joiningDate = joiningDate === "" ? null : joiningDate;
    if (expectedJoiningDate !== undefined) candidate.expectedJoiningDate = expectedJoiningDate === "" ? null : expectedJoiningDate;
    if (reportingTime !== undefined) candidate.reportingTime = reportingTime;
    if (ctc !== undefined) candidate.ctc = ctc === "" ? null : Number(ctc);
    
    // New fields
    if (interviewDate !== undefined) {
      candidate.interviewDate = interviewDate === "" ? null : interviewDate;
    }
    if (zoomMeetingLink !== undefined) {
      candidate.zoomMeetingLink = zoomMeetingLink;
    }

    if (status && status !== candidate.status) {
      candidate.status = status;
      await logActivity(candidate._id, req.user._id, "Status Updated", `Status manually updated to ${status}`);
    }

    const updatedCandidate = await candidate.save();

    // Also update the associated User document if it exists
    if (candidate.userId) {
      const user = await User.findById(candidate.userId);
      if (user) {
        user.name = fullName || user.name;
        user.email = email || user.email;
        if (password) {
          user.password = await bcrypt.hash(password, 10);
        }
        await user.save();
      }
    }

    // Send welcome email if status is changed to Selected
    const statusChangedToSelected = (updatedCandidate.status === "Selected" && oldStatus !== "Selected");
    if (statusChangedToSelected) {
      let welcomePassword = password;
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

    // Send email if status is changed to Selected
    if (statusChangedToSelected) {
      const selectionEmailHtml = `
        <h2 style="color: #0f766e; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Congratulations! Application Status Update 🎉</h2>
        <p>Dear <b>${updatedCandidate.fullName}</b>,</p>
        <p>We are absolutely thrilled to inform you that you have been <strong>selected</strong> for the position of <b>${updatedCandidate.position}</b> at <strong>Speshway Solutions</strong>!</p>
        
        <p>Our interview panel was highly impressed by your skills, experience, and the conversations we had during the recruitment process. We believe your expertise will be a fantastic addition to our team and will help us achieve new milestones.</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 20px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; margin-bottom: 12px; color: #14532d; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Next Steps in the Onboarding Process</h4>
          <p style="margin-bottom: 8px; font-size: 14px; color: #1f2937;">To initiate your pre-onboarding, please look out for our next email which will contain:</p>
          <ul style="padding-left: 20px; margin-bottom: 0; font-size: 14px; color: #1f2937; line-height: 1.6;">
            <li style="margin-bottom: 6px;">Your temporary credentials to access the <strong>Speshway HRMS Onboarding Portal</strong>.</li>
            <li style="margin-bottom: 6px;">Instructions for completing your candidate profile and uploading the required documents for verification.</li>
            <li style="margin-bottom: 0;">Your official employment offer letter details.</li>
          </ul>
        </div>
        
        <p>Should you have any immediate questions or require any clarification, please feel free to reach out to our Talent Acquisition team by replying to this email.</p>
        
        <p>Once again, congratulations on your selection! We are excited to embark on this journey together and look forward to welcoming you aboard.</p>
        
        <p style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">Best regards,<br/>
        <strong>Talent Acquisition Operations</strong><br/>
        Speshway Solutions Pvt. Ltd.</p>
      `;

      enqueueEmail(
        updatedCandidate.email,
        `Congratulations! Selection Status Update - Speshway Solutions 🎉`,
        selectionEmailHtml
      );
    }

    return res.status(200).json({ success: true, candidate: updatedCandidate });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Delete Candidate
export const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });

    const userId = candidate.userId;

    await Candidate.findByIdAndDelete(id);
    await CandidateProfile.findOneAndDelete({ candidateId: id });
    await CandidateDocument.findOneAndDelete({ candidateId: id });
    await AuditLog.deleteMany({ candidateId: id });
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    return res.status(200).json({ success: true, message: "Candidate deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Update Candidate Profile (Candidate Action)
export const updateCandidateProfile = async (req, res) => {
  try {
    const { personalDetails, contactDetails, education, professionalDetails, bankDetails, nomineeDetails } = req.body;
    const userId = req.user._id;

    const candidate = await Candidate.findOne({ userId });
    if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });

    let profile = await CandidateProfile.findOne({ candidateId: candidate._id });
    if (!profile) {
      profile = new CandidateProfile({ candidateId: candidate._id, userId });
    }

    if (personalDetails) profile.personalDetails = { ...profile.personalDetails, ...personalDetails };
    if (contactDetails) profile.contactDetails = { ...profile.contactDetails, ...contactDetails };
    if (education) profile.education = { ...profile.education, ...education };
    if (professionalDetails) profile.professionalDetails = { ...profile.professionalDetails, ...professionalDetails };
    if (bankDetails) profile.bankDetails = { ...profile.bankDetails, ...bankDetails };
    if (nomineeDetails) profile.nomineeDetails = { ...profile.nomineeDetails, ...nomineeDetails };

    await profile.save();

    // Log Activity
    await logActivity(candidate._id, userId, "Profile Updated", `Profile completion at ${profile.completionPercentage}%`);

    // Transition status if 100% complete
    if (profile.completionPercentage === 100 && (candidate.status === "Selected" || candidate.status === "Pre-Onboarding")) {
      candidate.status = "Profile Completed";
      await candidate.save();

      // Notify HR
      const io = req.io || req.app.get("io");
      const hrs = await User.find({ role: { $in: ["admin", "hr"] } });
      for (const hr of hrs) {
        await createNotification({
          type: "profile_completed",
          title: "Candidate Profile Completed",
          message: `${candidate.fullName} has completed their onboarding profile.`,
          recipientId: hr._id,
          senderId: userId,
          relatedId: candidate._id
        }, io);
      }
    }

    return res.status(200).json({ success: true, profile, status: candidate.status });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Upload Candidate Document (Candidate Action)
export const uploadCandidateDocument = async (req, res) => {
  try {
    const { documentType } = req.body;
    const file = req.file;
    const userId = req.user._id;

    if (!documentType || !file) {
      return res.status(400).json({ success: false, error: "Document type and file are required" });
    }

    const candidate = await Candidate.findOne({ userId });
    if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });

    // S3 Upload
    const uploadResult = await uploadDocToS3(file);
    if (!uploadResult.success) {
      return res.status(500).json({ success: false, error: "S3 upload failed" });
    }

    let candidateDoc = await CandidateDocument.findOne({ candidateId: candidate._id });
    if (!candidateDoc) {
      candidateDoc = new CandidateDocument({ candidateId: candidate._id, userId, documents: [] });
    }

    // Check if document of this type already exists, remove or overwrite
    const existingIndex = candidateDoc.documents.findIndex(d => d.documentType === documentType);
    const newDocItem = {
      documentType,
      fileUrl: uploadResult.url,
      fileKey: uploadResult.key,
      uploadedAt: new Date(),
      status: "Pending"
    };

    if (existingIndex > -1) {
      candidateDoc.documents[existingIndex] = newDocItem;
    } else {
      candidateDoc.documents.push(newDocItem);
    }

    await candidateDoc.save();

    // Log Activity
    await logActivity(candidate._id, userId, "Document Uploaded", `${documentType} uploaded by candidate`);

    // Transition status to Documents Uploaded
    if (candidate.status === "Profile Completed" || candidate.status === "Selected") {
      candidate.status = "Documents Uploaded";
      await candidate.save();
    }

    return res.status(200).json({ success: true, documents: candidateDoc.documents, status: candidate.status });
  } catch (error) {
    console.error("Doc upload error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Submit For Verification (Candidate Action)
export const submitForVerification = async (req, res) => {
  try {
    const userId = req.user._id;
    const candidate = await Candidate.findOne({ userId });
    if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });

    candidate.status = "Verification Pending";
    await candidate.save();

    await logActivity(candidate._id, userId, "Submitted for Verification", "Pre-onboarding checklist submitted for HR review");

    // Send notifications to HR/Admin
    const io = req.io || req.app.get("io");
    const hrs = await User.find({ role: { $in: ["admin", "hr"] } });
    for (const hr of hrs) {
      await createNotification({
        type: "documents_uploaded",
        title: "Verification Request",
        message: `${candidate.fullName} has submitted documents for verification.`,
        recipientId: hr._id,
        senderId: userId,
        relatedId: candidate._id
      }, io);
    }

    return res.status(200).json({ success: true, status: candidate.status });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Verify/Approve/Reject Document (HR Action)
export const verifyCandidateDocument = async (req, res) => {
  try {
    const { candidateId, documentType, status, rejectionReason, comment } = req.body;
    const hrUserId = req.user._id;

    if (!candidateId || !documentType || !status) {
      return res.status(400).json({ success: false, error: "Candidate ID, Document type and verification status are required" });
    }

    const candidateDoc = await CandidateDocument.findOne({ candidateId });
    if (!candidateDoc) return res.status(404).json({ success: false, error: "Documents not found" });

    const docIndex = candidateDoc.documents.findIndex(d => d.documentType === documentType);
    if (docIndex === -1) return res.status(404).json({ success: false, error: "Specific document type not found" });

    const docItem = candidateDoc.documents[docIndex];
    docItem.status = status;
    
    if (status === "Rejected") {
      docItem.rejectionReason = rejectionReason || "Incomplete or blurry upload";
    } else {
      docItem.rejectionReason = "";
    }

    if (comment) {
      docItem.comments.push({
        author: hrUserId,
        text: comment
      });
    }

    await candidateDoc.save();

    const candidate = await Candidate.findById(candidateId);
    
    // Log Activity
    await logActivity(candidateId, hrUserId, `Document ${status}`, `${documentType} review complete. Status: ${status}`);

    // Send Socket & DB Notification to Candidate
    const io = req.io || req.app.get("io");
    const notifType = status === "Approved" ? "document_approved" : "document_rejected";
    const notifTitle = status === "Approved" ? "Document Approved" : "Document Rejected";
    const notifMessage = status === "Approved" 
      ? `Your ${documentType} has been approved.` 
      : `Your ${documentType} was rejected. Reason: ${rejectionReason}`;

    await createNotification({
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      recipientId: candidate.userId,
      senderId: hrUserId,
      relatedId: candidate._id
    }, io);

    // If document is rejected, we demote status to let them reupload
    if (status === "Rejected") {
      candidate.status = "Documents Uploaded"; // lets them edit/reupload
      await candidate.save();
    } else {
      // Check if all required documents are approved
      const profile = await CandidateProfile.findOne({ candidateId });
      const requiredTypes = ["Aadhaar Card", "PAN Card", "Resume", "Passport Photo", "Degree Certificate", "Passbook"];
      const approvedDocTypes = candidateDoc.documents
        .filter(d => d.status === "Approved")
        .map(d => d.documentType);
      
      const allRequiredApproved = requiredTypes.every(type => {
        if (type === "Aadhaar Card") {
          return approvedDocTypes.includes("Aadhaar Card") || approvedDocTypes.includes("Aadhaar");
        }
        if (type === "PAN Card") {
          return approvedDocTypes.includes("PAN Card") || approvedDocTypes.includes("PAN");
        }
        if (type === "Degree Certificate") {
          return approvedDocTypes.includes("Degree Certificate") || approvedDocTypes.includes("Degree");
        }
        if (type === "Passbook") {
          return approvedDocTypes.includes("Passbook") || approvedDocTypes.includes("Bank Passbook");
        }
        return approvedDocTypes.includes(type);
      });

      if (allRequiredApproved && profile?.completionPercentage === 100) {
        candidate.status = "Ready For Offer";
        candidate.verificationDate = new Date();
        await candidate.save();

        await logActivity(candidateId, hrUserId, "Verification Completed", "All required documents approved, candidate ready for offer");

        // Automatically generate and dispatch the offer letter PDF
        await generateAndSendOfferLetter(candidate, profile, req);

        // Notify Admins/HR
        const hrs = await User.find({ role: { $in: ["admin", "hr"] } });
        for (const hr of hrs) {
          await createNotification({
            type: "verification_completed",
            title: "Candidate Ready for Offer",
            message: `${candidate.fullName} has completed all verification checkpoints.`,
            recipientId: hr._id,
            senderId: hrUserId,
            relatedId: candidate._id
          }, io);
        }
      }
    }

    return res.status(200).json({ success: true, documents: candidateDoc.documents, status: candidate.status });
  } catch (error) {
    console.error("Verify document error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Send reminder to candidate for incomplete profile (HR Action)
export const sendReminder = async (req, res) => {
  try {
    const { candidateId } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });

    const profile = await CandidateProfile.findOne({ candidateId });
    const missingItems = [];
    if (!profile?.bankDetails?.accountHolderName) missingItems.push("Bank Details");
    if (!profile?.education?.degree) missingItems.push("Education Details");
    if (!profile?.emergencyContact?.name) missingItems.push("Emergency Contacts");

    const emailHtml = `
      <h2>Onboarding Progress Reminder ⏰</h2>
      <p>Dear <b>${candidate.fullName}</b>,</p>
      <p>This is a gentle reminder that your pre-onboarding profile is incomplete.</p>
      <p>Current completion status: <b>${profile?.completionPercentage || 0}%</b></p>
      <p>Please log in and complete the following sections:</p>
      <ul>
        ${missingItems.map(item => `<li>${item}</li>`).join("")}
      </ul>
      <p>Completing these sections promptly ensures there are no delays in generating your official offer letter.</p>
      <p><a href="${process.env.CLIENT_URL || "https://www.speshwayhrms.com"}" style="background-color: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Onboarding Portal Login</a></p>
    `;
    
    enqueueEmail(candidate.email, "Action Required: Complete your Pre-Onboarding Profile ⏰", emailHtml);
    await logActivity(candidateId, req.user._id, "Reminder Sent", `Reminder email dispatched regarding missing: ${missingItems.join(", ")}`);

    return res.status(200).json({ success: true, message: "Reminder email sent successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Mark candidate as ready for offer / finalize (HR Action)
export const finalizeOfferReady = async (req, res) => {
  try {
    const { candidateId } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });

    candidate.status = "Ready For Offer";
    candidate.verificationDate = new Date();
    await candidate.save();

    await logActivity(candidateId, req.user._id, "Marked as Offer Ready", "Candidate finalized for offer generation");

    // Automatically generate/regenerate and dispatch the offer letter PDF
    const profile = await CandidateProfile.findOne({ candidateId });
    await generateAndSendOfferLetter(candidate, profile, req);

    return res.status(200).json({ success: true, candidate });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Fetch HR Dashboard Stats (Overview KPIs + RechartsFunnel)
export const getDashboardStats = async (req, res) => {
  try {
    const total = await Candidate.countDocuments();
    const selected = await Candidate.countDocuments({ status: "Selected" });
    const preOnboarding = await Candidate.countDocuments({ status: "Pre-Onboarding" });
    const readyForOffer = await Candidate.countDocuments({ status: "Ready For Offer" });

    // Pending Profile counts
    const incompleteProfiles = await CandidateProfile.find({ completionPercentage: { $lt: 100 } });
    const incompleteCandidateIds = incompleteProfiles.map(p => p.candidateId);
    const pendingProfile = await Candidate.countDocuments({ _id: { $in: incompleteCandidateIds }, status: { $ne: "Ready For Offer" } });

    // Pending document verification
    const pendingVerification = await Candidate.countDocuments({ status: "Verification Pending" });

    // Verified candidates count
    const verified = await Candidate.countDocuments({ status: "Ready For Offer" });

    // Rejected documents count (how many candidates have at least 1 document rejected)
    const docsWithRejection = await CandidateDocument.find({ "documents.status": "Rejected" });
    const rejectedDocsCount = docsWithRejection.length;

    // Funnel counts (pipeline status counts)
    const pipelineCounts = {
      Selected: await Candidate.countDocuments({ status: "Selected" }),
      PreOnboarding: await Candidate.countDocuments({ status: "Pre-Onboarding" }),
      ProfileCompleted: await Candidate.countDocuments({ status: "Profile Completed" }),
      DocumentsUploaded: await Candidate.countDocuments({ status: "Documents Uploaded" }),
      VerificationPending: await Candidate.countDocuments({ status: "Verification Pending" }),
      ReadyForOffer: await Candidate.countDocuments({ status: "Ready For Offer" })
    };

    // Department counts
    const departments = await Department.find();
    const departmentWise = [];
    for (const dep of departments) {
      const count = await Candidate.countDocuments({ department: dep._id });
      departmentWise.push({ name: dep.dep_name, count });
    }

    // Monthly trends (aggregate counts by month of current year)
    const currentYear = new Date().getFullYear();
    const monthlyTrends = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let m = 0; m < 12; m++) {
      const start = new Date(currentYear, m, 1);
      const end = new Date(currentYear, m + 1, 0, 23, 59, 59);
      const count = await Candidate.countDocuments({ createdAt: { $gte: start, $lte: end } });
      monthlyTrends.push({ month: months[m], count });
    }

    // Recent activities (top 15 log logs)
    const recentActivities = await AuditLog.find()
      .populate("candidateId", "fullName position")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(15);

    return res.status(200).json({
      success: true,
      kpis: {
        total,
        selected,
        preOnboarding,
        pendingProfile,
        pendingVerification,
        verified,
        rejectedDocsCount,
        readyForOffer
      },
      pipeline: [
        { stage: "Selected", value: pipelineCounts.Selected },
        { stage: "Account Created", value: pipelineCounts.PreOnboarding },
        { stage: "Profile Completed", value: pipelineCounts.ProfileCompleted },
        { stage: "Documents Uploaded", value: pipelineCounts.DocumentsUploaded },
        { stage: "Verification Pending", value: pipelineCounts.VerificationPending },
        { stage: "Ready For Offer", value: pipelineCounts.ReadyForOffer }
      ],
      departmentWise,
      monthlyTrends,
      recentActivities
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Preview Offer Letter PDF dynamically
export const previewOfferLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const { designation, joiningDate, reportingTime, ctc } = req.query;

    const candidate = await Candidate.findById(id).populate("department");
    if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });

    // Temporary override from query parameters for instant preview reflection
    if (designation !== undefined) candidate.designation = designation;
    if (joiningDate !== undefined) candidate.joiningDate = joiningDate === "" ? null : joiningDate;
    if (reportingTime !== undefined) candidate.reportingTime = reportingTime;
    if (ctc !== undefined) candidate.ctc = ctc === "" ? null : Number(ctc);

    const profile = await CandidateProfile.findOne({ candidateId: candidate._id });
    
    // Generate PDF Buffer with overrides and current date
    const pdfCandidate = {
      ...candidate.toObject(),
      designation: designation !== undefined ? designation : candidate.designation,
      joiningDate: joiningDate !== undefined ? (joiningDate === "" ? null : joiningDate) : candidate.joiningDate,
      reportingTime: reportingTime !== undefined ? reportingTime : candidate.reportingTime,
      ctc: ctc !== undefined ? (ctc === "" ? null : Number(ctc)) : candidate.ctc,
      offerDate: new Date()
    };
    
    const pdfBuffer = await generateOfferLetterPDFBuffer(pdfCandidate, profile);
    
    // Stream directly as inline PDF preview
    const fileName = `Offer_Letter_${candidate.fullName.replace(/\s+/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    console.error("Preview offer letter error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const sendBothOfferAndAppointment = async (req, res) => {
  try {
    const { id } = req.params; // Candidate ID
    const {
      designation,
      department,
      reportingManager,
      salaryPackage, // this is CTC in INR (e.g. 600000)
      joiningDate,
      reportingTime,
      workLocation,
      probationPeriod,
      noticePeriod,
      expiryDate
    } = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const profile = await CandidateProfile.findOne({ candidateId: candidate._id });

    // -------------------------------------------------------------
    // PART 1: GENERATE AND SEND OFFER LETTER
    // -------------------------------------------------------------
    let offer = await Offer.findOne({ candidateId: candidate._id });
    let offerVersion = 1;

    if (offer) {
      offerVersion = offer.version + 1;
      offer.versionHistory.push({
        designation: offer.designation,
        salaryPackage: offer.salaryPackage,
        joiningDate: offer.joiningDate,
        version: offer.version,
        updatedAt: offer.updatedAt,
        updatedBy: req.user._id
      });

      if (offer.offerLetterKey) {
        try {
          await deleteFile(offer.offerLetterKey);
        } catch (err) {
          console.error("Delete old offer file failed:", err);
        }
      }

      offer.designation = designation;
      offer.department = department;
      offer.reportingManager = reportingManager;
      offer.salaryPackage = salaryPackage;
      offer.joiningDate = joiningDate;
      offer.reportingTime = reportingTime;
      offer.workLocation = workLocation;
      offer.probationPeriod = probationPeriod;
      offer.noticePeriod = noticePeriod;
      offer.expiryDate = expiryDate;
      offer.version = offerVersion;
    } else {
      offer = new Offer({
        candidateId: candidate._id,
        designation,
        department,
        reportingManager,
        salaryPackage,
        joiningDate,
        reportingTime,
        workLocation,
        probationPeriod,
        noticePeriod,
        expiryDate
      });
    }

    const pdfCandidateOffer = {
      ...candidate.toObject(),
      designation: designation || candidate.designation,
      ctc: salaryPackage || candidate.ctc,
      joiningDate: joiningDate || candidate.joiningDate,
      reportingTime: reportingTime || candidate.reportingTime,
      offerDate: new Date()
    };

    const offerPdfBuffer = await generateOfferLetterPDFBuffer(pdfCandidateOffer, profile);

    const candidateName = candidate.fullName.replace(/\s+/g, "_");
    const pseudoOfferFile = {
      originalname: `${candidateName}_offerletter.pdf`,
      buffer: offerPdfBuffer,
      mimetype: "application/pdf"
    };

    const offerUploadResult = await saveFile(pseudoOfferFile, "offers");
    offer.offerLetterUrl = offerUploadResult.url;
    offer.offerLetterKey = offerUploadResult.key;
    offer.status = "Sent";
    offer.updatedAt = Date.now();
    await offer.save();

    // -------------------------------------------------------------
    // PART 2: GENERATE AND SEND APPOINTMENT LETTER
    // -------------------------------------------------------------
    let appointment = await Appointment.findOne({ candidateId: candidate._id });
    if (appointment) {
      if (appointment.appointmentLetterKey) {
        try {
          await deleteFile(appointment.appointmentLetterKey);
        } catch (err) {
          console.error("Delete old appointment file failed:", err);
        }
      }
      appointment.designation = designation;
      appointment.department = department;
      appointment.salaryPackage = salaryPackage;
      appointment.joiningDate = joiningDate;
      appointment.reportingTime = reportingTime;
      appointment.probationPeriod = probationPeriod;
      appointment.noticePeriod = noticePeriod;
    } else {
      appointment = new Appointment({
        candidateId: candidate._id,
        designation,
        department,
        salaryPackage,
        joiningDate,
        reportingTime,
        probationPeriod,
        noticePeriod
      });
    }

    const pdfCandidateAppointment = {
      ...candidate.toObject(),
      designation,
      salaryPackage,
      joiningDate,
      reportingTime,
      probationPeriod,
      noticePeriod
    };

    const appointmentPdfBuffer = await generateAppointmentLetterPDFBuffer(pdfCandidateAppointment);

    const pseudoAppointmentFile = {
      originalname: `${candidateName}_appointmentletter.pdf`,
      buffer: appointmentPdfBuffer,
      mimetype: "application/pdf"
    };

    const appointmentUploadResult = await saveFile(pseudoAppointmentFile, "appointments");
    appointment.appointmentLetterUrl = appointmentUploadResult.url;
    appointment.appointmentLetterKey = appointmentUploadResult.key;
    appointment.status = "Sent";
    appointment.updatedAt = Date.now();
    await appointment.save();

    // -------------------------------------------------------------
    // PART 3: UPDATE CANDIDATE STATUS AND SEND EMAILS
    // -------------------------------------------------------------
    candidate.status = "Appointment Sent"; // Final status after both are sent
    candidate.activityTimeline.push({
      activity: `Offer (v${offerVersion}) & Appointment Letters Sent`,
      performedBy: req.user._id
    });
    await candidate.save();

    // Audit Log
    const auditLog = new AuditLog({
      action: "OFFER_AND_APPOINTMENT_SENT",
      performedBy: req.user._id,
      candidateId: candidate._id,
      details: `Offer and Appointment letters sent simultaneously to ${candidate.fullName}`
    });
    await auditLog.save();

    // Emails
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const portalUrl = `${clientUrl}/login`;

    // Combined Email Body HTML
    const combinedEmailHtml = `
      <h2 style="color: #0f766e; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Congratulations! Employment Documents Package 🎉</h2>
      <p>Dear <b>${candidate.fullName}</b>,</p>
      <p>We are absolutely delighted to extend our official offer of employment and letter of appointment for the position of <b>${designation}</b> at <strong>Speshway Solutions</strong>.</p>
      <p>We were highly impressed by your qualifications, skills, and experience, and we believe you will be a vital addition to our growing team.</p>
      
      <!-- Key Details Card -->
      <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h4 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Employment Package Highlights</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 140px;"><strong>Role / Designation:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${designation}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;"><strong>Joining Date:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${new Date(joiningDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;"><strong>Reporting Time:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${reportingTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;"><strong>Compensation (CTC):</strong></td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">₹${(salaryPackage / 100000).toFixed(2)} LPA (₹${Number(salaryPackage).toLocaleString('en-IN')} Per Annum)</td>
          </tr>
        </table>
      </div>

      <p>Attached to this email, you will find your official <strong>Employment Offer Letter</strong> and <strong>Letter of Appointment</strong>. Please review them carefully.</p>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 14px; color: #14532d;">
        <strong>Next Steps:</strong>
        <ol style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.5;">
          <li>Open and read the attached PDF documents.</li>
          <li>Click the button below to log in to the Speshway Onboarding Portal.</li>
          <li>Review and accept the documents online.</li>
          <li>Complete any remaining profile verification steps prior to your start date.</li>
        </ol>
      </div>

      <!-- CTA Button -->
      <div style="margin: 30px 0; text-align: center;">
        <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          Log in to Onboarding Portal
        </a>
      </div>

      <p style="font-size: 13px; color: #64748b;">Please complete the online acceptance by <b>${new Date(expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</b> to secure your position.</p>
      
      <p>If you have any questions or need clarifications regarding your role, benefits, or onboarding requirements, feel free to reply to this email.</p>
      
      <p>Once again, congratulations! We are excited to welcome you to the Speshway family.</p>
      
      <p style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">Best regards,<br/>
      <strong>Talent Acquisition Operations</strong><br/>
      Speshway Solutions Pvt. Ltd.</p>
    `;

    enqueueEmail(candidate.email, "Employment Offer & Letter of Appointment - Speshway Solutions 📜🎉", combinedEmailHtml, [
      {
        filename: `${candidateName}_offerletter.pdf`,
        content: offerPdfBuffer,
        contentType: "application/pdf"
      },
      {
        filename: `${candidateName}_appointmentletter.pdf`,
        content: appointmentPdfBuffer,
        contentType: "application/pdf"
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Offer and Appointment letters sent successfully",
      offer,
      appointment
    });
  } catch (error) {
    console.error("Send both error:", error);
    return res.status(500).json({ success: false, error: `Server error sending letters: ${error.message}` });
  }
};
