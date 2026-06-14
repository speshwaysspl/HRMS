import Offer from "../models/Offer.js";
import Candidate from "../models/Candidate.js";
import Document from "../models/Document.js";
import AuditLog from "../models/AuditLog.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import { generateOfferLetterPDFBuffer } from "../utils/offerPdfGenerator.js";
import CandidateProfile from "../models/CandidateProfile.js";
import { saveFile, deleteFile } from "../utils/fileSaver.js";
import { enqueueEmail } from "../utils/emailQueue.js";
import fs from "fs";
import path from "path";

// Create or update Offer Letter
export const createOffer = async (req, res) => {
  try {
    const {
      candidateId,
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
    } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    // Verify all uploaded documents are Approved
    const candidateDocs = await Document.find({ candidateId });
    const hasUnapproved = candidateDocs.some(d => d.status !== "Approved");
    if (candidateDocs.length === 0 || hasUnapproved) {
      return res.status(400).json({
        success: false,
        error: "Cannot generate offer letter. Candidate must have all uploaded documents verified (Approved) by HR first."
      });
    }

    const dept = await Department.findById(department);
    const departmentName = dept ? dept.dep_name : "General";

    // Check if an offer already exists
    let offer = await Offer.findOne({ candidateId });
    let version = 1;

    if (offer) {
      // Archive current version
      version = offer.version + 1;
      offer.versionHistory.push({
        designation: offer.designation,
        salaryPackage: offer.salaryPackage,
        joiningDate: offer.joiningDate,
        version: offer.version,
        updatedAt: offer.updatedAt,
        updatedBy: req.user._id
      });

      // Delete old file
      if (offer.offerLetterKey) {
        await deleteFile(offer.offerLetterKey);
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
      offer.version = version;
      offer.status = "Pending";
    } else {
      offer = new Offer({
        candidateId,
        designation,
        department,
        reportingManager,
        salaryPackage,
        joiningDate,
        reportingTime,
        workLocation,
        probationPeriod,
        noticePeriod,
        expiryDate,
        status: "Pending"
      });
    }

    // Fetch profile
    const profile = await CandidateProfile.findOne({ candidateId: candidate._id });

    // Temporarily apply offer values to candidate object for PDF generation
    const pdfCandidate = {
      ...candidate.toObject(),
      designation: designation || candidate.designation,
      ctc: salaryPackage || candidate.ctc,
      joiningDate: joiningDate || candidate.joiningDate,
      reportingTime: reportingTime || candidate.reportingTime,
      offerDate: new Date()
    };

    // Generate PDF Kit 7-page PDF Buffer
    const pdfBuffer = await generateOfferLetterPDFBuffer(pdfCandidate, profile);

    // Save PDF
    const pseudoFile = {
      originalname: `OfferLetter_${candidate.candidateId}.pdf`,
      buffer: pdfBuffer,
      mimetype: "application/pdf"
    };

    const uploadResult = await saveFile(pseudoFile, "offers");
    offer.offerLetterUrl = uploadResult.url;
    offer.offerLetterKey = uploadResult.key;
    offer.updatedAt = Date.now();

    await offer.save();

    // Log Activity in Candidate Timeline
    candidate.activityTimeline.push({
      activity: `Offer Letter Generated (v${version})`,
      performedBy: req.user._id
    });
    await candidate.save();

    return res.status(200).json({
      success: true,
      message: `Offer letter generated successfully (v${version})`,
      offer
    });
  } catch (error) {
    console.error("Create offer error:", error);
    return res.status(500).json({ success: false, error: `Server error generating offer: ${error.message}` });
  }
};

// Get All Offers
export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate("candidateId", "fullName email candidateId status")
      .populate("department", "dep_name");
    return res.status(200).json({ success: true, offers });
  } catch (error) {
    console.error("Get offers error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching offers" });
  }
};

// Get Offer by Candidate ID
export const getOfferByCandidateId = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const offer = await Offer.findOne({ candidateId })
      .populate("department", "dep_name")
      .populate("reportingManager", "name email");

    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found for this candidate" });
    }

    return res.status(200).json({ success: true, offer });
  } catch (error) {
    console.error("Get offer by candidate error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching candidate offer" });
  }
};

// Send Offer
export const sendOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id).populate("department", "dep_name");
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }

    const candidate = await Candidate.findById(offer.candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const profile = await CandidateProfile.findOne({ candidateId: candidate._id });

    // Temporarily apply offer values to candidate object for PDF generation
    const pdfCandidate = {
      ...candidate.toObject(),
      designation: offer.designation || candidate.designation,
      ctc: offer.salaryPackage || candidate.ctc,
      joiningDate: offer.joiningDate || candidate.joiningDate,
      reportingTime: offer.reportingTime || candidate.reportingTime,
      offerDate: new Date()
    };

    // ALWAYS regenerate the PDF to ensure the date (using current date in IST) is up-to-date
    const pdfBuffer = await generateOfferLetterPDFBuffer(pdfCandidate, profile);

    // Delete old file
    if (offer.offerLetterKey) {
      try {
        await deleteFile(offer.offerLetterKey);
      } catch (err) {
        console.error("Error deleting old offer letter file:", err);
      }
    }

    // Save newly generated PDF with current date
    const pseudoFile = {
      originalname: `OfferLetter_${candidate.candidateId}.pdf`,
      buffer: pdfBuffer,
      mimetype: "application/pdf"
    };

    const uploadResult = await saveFile(pseudoFile, "offers");
    offer.offerLetterUrl = uploadResult.url;
    offer.offerLetterKey = uploadResult.key;

    // Update status
    offer.status = "Sent";
    offer.updatedAt = Date.now();
    await offer.save();

    candidate.status = "Offer Sent";
    candidate.activityTimeline.push({
      activity: "Offer Letter Sent to Candidate",
      performedBy: req.user._id
    });
    await candidate.save();

    const clientUrl = process.env.CLIENT_URL || "https://www.speshwayhrms.com";
    const portalUrl = `${clientUrl}/login`;

    const emailHtml = `
      <h2>Employment Offer Letter 🎉</h2>
      <p>Dear <b>${candidate.fullName}</b>,</p>
      <p>We are delighted to extend an offer of employment for the position of <b>${offer.designation}</b> at Speshway Solutions.</p>
      <p>Please log in to your onboarding portal to review and accept the offer letter. The copy of your offer letter is also attached to this email.</p>
      <p><b>Link to Portal:</b> <a href="${portalUrl}">${portalUrl}</a></p>
      <p>Please accept the offer on or before <b>${new Date(offer.expiryDate).toLocaleDateString()}</b>.</p>
      <br/>
      <p>Regards,</p>
      <p><b>HR Team</b></p>
    `;

    const attachments = [];
    attachments.push({
      filename: `OfferLetter_${candidate.candidateId}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf"
    });

    enqueueEmail(candidate.email, "Employment Offer Letter - Speshway Solutions 📜", emailHtml, attachments);

    return res.status(200).json({ success: true, message: "Offer letter sent to candidate successfully", offer });
  } catch (error) {
    console.error("Send offer error:", error);
    return res.status(500).json({ success: false, error: "Server error sending offer letter" });
  }
};

// Revoke Offer
export const revokeOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }

    offer.status = "Revoked";
    offer.updatedAt = Date.now();
    await offer.save();

    const candidate = await Candidate.findById(offer.candidateId);
    if (candidate) {
      candidate.status = "Selected"; // Revert to Selected status
      candidate.activityTimeline.push({
        activity: "Offer Letter Revoked",
        performedBy: req.user._id
      });
      await candidate.save();
    }

    return res.status(200).json({ success: true, message: "Offer letter revoked", offer });
  } catch (error) {
    console.error("Revoke offer error:", error);
    return res.status(500).json({ success: false, error: "Server error revoking offer" });
  }
};

// Candidate Accept Offer (Candidate Portal)
export const acceptOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }

    if (offer.status !== "Sent") {
      return res.status(400).json({ success: false, error: "Offer cannot be accepted in its current state" });
    }

    offer.status = "Accepted";
    offer.acceptanceDate = Date.now();
    await offer.save();

    const candidate = await Candidate.findById(offer.candidateId);
    if (candidate) {
      candidate.status = "Offer Accepted";
      candidate.activityTimeline.push({
        activity: "Offer Letter Accepted by Candidate",
        performedBy: req.user._id
      });
      await candidate.save();
    }

    // Log to Audit Log
    const auditLog = new AuditLog({
      action: "OFFER_ACCEPTED",
      performedBy: req.user._id,
      candidateId: offer.candidateId,
      details: `Offer letter accepted by ${candidate.fullName}`
    });
    await auditLog.save();

    // Notify HR
    const hrAdmin = await User.findOne({ role: "admin" });
    if (hrAdmin) {
      const emailHtml = `
        <h2>Offer Accepted Notification 🔔</h2>
        <p>Candidate <b>${candidate.fullName}</b> (${candidate.candidateId}) has accepted the employment offer for the role of <b>${offer.designation}</b>.</p>
        <p>You can now log in to the admin dashboard and convert them to an active employee record.</p>
      `;
      enqueueEmail(hrAdmin.email, `Offer Accepted - ${candidate.fullName}`, emailHtml);
    }

    return res.status(200).json({ success: true, message: "Offer letter accepted successfully", offer });
  } catch (error) {
    console.error("Accept offer error:", error);
    return res.status(500).json({ success: false, error: "Server error accepting offer" });
  }
};

// Candidate Reject Offer (Candidate Portal)
// Preview Offer Letter
export const previewOffer = async (req, res) => {
  try {
    const {
      candidateId,
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
    } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const dept = await Department.findById(department);
    const departmentName = dept ? dept.dep_name : "General";

    const profile = await CandidateProfile.findOne({ candidateId: candidate._id });

    // Temporarily apply offer values to candidate object for PDF generation
    const pdfCandidate = {
      ...candidate.toObject(),
      designation: designation || candidate.designation,
      ctc: salaryPackage || candidate.ctc,
      joiningDate: joiningDate || candidate.joiningDate,
      reportingTime: reportingTime || candidate.reportingTime,
      offerDate: new Date()
    };

    // Generate PDF Kit 7-page PDF Buffer
    const pdfBuffer = await generateOfferLetterPDFBuffer(pdfCandidate, profile);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="OfferLetter_Preview_${candidate.candidateId}.pdf"`,
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Preview offer error:", error);
    return res.status(500).json({ success: false, error: "Server error generating preview" });
  }
};

export const rejectOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }

    if (offer.status !== "Sent") {
      return res.status(400).json({ success: false, error: "Offer cannot be rejected in its current state" });
    }

    offer.status = "Rejected";
    offer.rejectionReason = reason;
    await offer.save();

    const candidate = await Candidate.findById(offer.candidateId);
    if (candidate) {
      candidate.status = "Selected"; // revert back
      candidate.activityTimeline.push({
        activity: `Offer Letter Rejected by Candidate. Reason: ${reason}`,
        performedBy: req.user._id
      });
      await candidate.save();
    }

    // Log to Audit Log
    const auditLog = new AuditLog({
      action: "OFFER_REJECTED",
      performedBy: req.user._id,
      candidateId: offer.candidateId,
      details: `Offer letter rejected by ${candidate.fullName}. Reason: ${reason}`
    });
    await auditLog.save();

    // Notify HR
    const hrAdmin = await User.findOne({ role: "admin" });
    if (hrAdmin) {
      const emailHtml = `
        <h2>Offer Rejected Notification 🔔</h2>
        <p>Candidate <b>${candidate.fullName}</b> (${candidate.candidateId}) has rejected the employment offer for the role of <b>${offer.designation}</b>.</p>
        <p><b>Reason:</b> ${reason || "No reason provided"}</p>
      `;
      enqueueEmail(hrAdmin.email, `Offer Rejected - ${candidate.fullName}`, emailHtml);
    }

    return res.status(200).json({ success: true, message: "Offer letter rejected", offer });
  } catch (error) {
    console.error("Reject offer error:", error);
    return res.status(500).json({ success: false, error: "Server error rejecting offer" });
  }
};
