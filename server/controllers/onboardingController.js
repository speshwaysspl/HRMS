import Candidate from "../models/Candidate.js";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import Document from "../models/Document.js";
import Offer from "../models/Offer.js";
import AuditLog from "../models/AuditLog.js";
import Appointment from "../models/Appointment.js";
import PayrollTemplate from "../models/PayrollTemplate.js";
import Department from "../models/Department.js";
import { saveFile } from "../utils/fileSaver.js";
import { enqueueEmail } from "../utils/emailQueue.js";
import bcrypt from "bcrypt";

// Helper to calculate candidate profile completion percentage
const calculateCompletion = (candidate) => {
  let total = 0;
  let filled = 0;

  // Personal Info (7 fields)
  const personalFields = ["firstName", "lastName", "dob", "gender", "bloodGroup", "nationality", "maritalStatus"];
  personalFields.forEach(f => {
    total++;
    if (candidate.personalInfo && candidate.personalInfo[f]) filled++;
  });

  // Contact Info (5 fields)
  const contactFields = ["currentAddress", "permanentAddress"];
  contactFields.forEach(f => {
    total++;
    if (candidate.contactInfo && candidate.contactInfo[f]) filled++;
  });
  
  total += 3; // emergencyContact.name, emergencyContact.relationship, emergencyContact.phone
  if (candidate.contactInfo && candidate.contactInfo.emergencyContact) {
    if (candidate.contactInfo.emergencyContact.name) filled++;
    if (candidate.contactInfo.emergencyContact.relationship) filled++;
    if (candidate.contactInfo.emergencyContact.phone) filled++;
  }

  // Education Details (1 check)
  total++;
  if (candidate.educationDetails && candidate.educationDetails.length > 0) {
    filled++;
  }

  // Professional Details (3 fields or 1 field if Fresher)
  const isFresher = candidate.professionalDetails && 
                    typeof candidate.professionalDetails.experience === "string" && 
                    candidate.professionalDetails.experience.toLowerCase() === "fresher";
  const profFields = isFresher ? ["experience"] : ["experience", "currentCompany", "currentSalary"];
  profFields.forEach(f => {
    total++;
    if (candidate.professionalDetails && 
        candidate.professionalDetails[f] !== undefined && 
        candidate.professionalDetails[f] !== null && 
        candidate.professionalDetails[f] !== "") {
      filled++;
    }
  });

  // Bank Details (3 fields)
  const bankFields = ["bankName", "accountNumber", "ifscCode"];
  bankFields.forEach(f => {
    total++;
    if (candidate.bankDetails && candidate.bankDetails[f]) filled++;
  });

  // Nominee Details (3 fields)
  const nomineeFields = ["nomineeName", "relationship", "contactNumber"];
  nomineeFields.forEach(f => {
    total++;
    if (candidate.nomineeDetails && candidate.nomineeDetails[f]) filled++;
  });

  return Math.round((filled / total) * 100);
};

// Fetch Candidate Profile (For Candidate Dashboard)
export const getCandidateProfile = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user._id })
      .populate("department", "dep_name")
      .populate("userId", "name email");

    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate profile not found" });
    }

    const offer = await Offer.findOne({ candidateId: candidate._id })
      .populate("department", "dep_name")
      .populate("reportingManager", "name email");

    const appointment = await Appointment.findOne({ candidateId: candidate._id })
      .populate("department", "dep_name");

    const documents = await Document.find({ candidateId: candidate._id });

    return res.status(200).json({
      success: true,
      candidate,
      offer,
      appointment,
      documents
    });
  } catch (error) {
    console.error("Get candidate profile error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching onboarding profile" });
  }
};

// Update Candidate Profile (Draft Save & Completion Calculation)
export const updateCandidateProfile = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user._id });
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate profile not found" });
    }

    // Merge request body into schema sections
    if (req.body.personalInfo) candidate.personalInfo = { ...candidate.personalInfo, ...req.body.personalInfo };
    if (req.body.contactInfo) {
      candidate.contactInfo = { 
        ...candidate.contactInfo, 
        ...req.body.contactInfo,
        emergencyContact: {
          ...candidate.contactInfo?.emergencyContact,
          ...req.body.contactInfo.emergencyContact
        }
      };
    }
    if (req.body.educationDetails) candidate.educationDetails = req.body.educationDetails;
    if (req.body.professionalDetails) candidate.professionalDetails = { ...candidate.professionalDetails, ...req.body.professionalDetails };
    if (req.body.bankDetails) candidate.bankDetails = { ...candidate.bankDetails, ...req.body.bankDetails };
    if (req.body.nomineeDetails) candidate.nomineeDetails = { ...candidate.nomineeDetails, ...req.body.nomineeDetails };

    // Calculate progress
    candidate.profileCompletionPercentage = calculateCompletion(candidate);
    
    // Automatically progress status if moving beyond applied
    if (candidate.status === "Applied" && candidate.profileCompletionPercentage > 0) {
      candidate.status = "Pre-Onboarding";
    }

    candidate.updatedAt = Date.now();
    await candidate.save();

    return res.status(200).json({
      success: true,
      message: "Profile progress saved as draft",
      candidate
    });
  } catch (error) {
    console.error("Update candidate profile error:", error);
    return res.status(500).json({ success: false, error: "Server error saving profile draft" });
  }
};

// Candidate Onboarding Document Upload
export const uploadOnboardingDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const { docType } = req.body; // e.g. "Aadhaar", "PAN", "Degree Certificate"
    if (!docType) {
      return res.status(400).json({ success: false, error: "Document type is required" });
    }

    const candidate = await Candidate.findOne({ userId: req.user._id });
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate record not found" });
    }

    // Upload to S3 (or Local Fallback)
    const uploadResult = await saveFile(req.file, "onboarding_docs");

    // Check if document of this type already exists for candidate
    let doc = await Document.findOne({ candidateId: candidate._id, fileType: docType });

    if (doc) {
      // Overwrite/update fileUrl
      doc.fileUrl = uploadResult.url;
      doc.fileKey = uploadResult.key;
      doc.originalName = req.file.originalname;
      doc.status = "Pending"; // reset status for verification
      doc.comments = "";
      doc.updatedAt = Date.now();
      await doc.save();
    } else {
      doc = new Document({
        candidateId: candidate._id,
        uploadedBy: req.user._id,
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        fileType: docType,
        originalName: req.file.originalname,
        status: "Pending"
      });
      await doc.save();
    }

    // Update candidate status and timeline
    candidate.activityTimeline.push({
      activity: `Document Uploaded: ${docType}`,
      performedBy: req.user._id
    });
    await candidate.save();

    return res.status(200).json({ success: true, message: `${docType} uploaded successfully`, document: doc });
  } catch (error) {
    console.error("Upload document error:", error);
    return res.status(500).json({ success: false, error: "Server error uploading onboarding document" });
  }
};

// Fetch Onboarding Documents (Candidate Dashboard / HR Verify)
export const getOnboardingDocuments = async (req, res) => {
  try {
    const { candidateId } = req.params;
    let query = {};

    if (candidateId) {
      query.candidateId = candidateId;
    } else {
      // If user has candidate role, restrict to their own documents
      if (req.user.role.includes("candidate")) {
        const candidate = await Candidate.findOne({ userId: req.user._id });
        if (!candidate) {
          return res.status(404).json({ success: false, error: "Candidate not found" });
        }
        query.candidateId = candidate._id;
      }
      // Otherwise (admin/hr), query matches all documents
    }

    const documents = await Document.find(query)
      .populate("candidateId", "fullName candidateId position")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error("Get onboarding documents error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching documents" });
  }
};

// HR Verify / Approve / Reject Document
export const verifyOnboardingDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const { status, comments } = req.body; // status: "Approved" or "Rejected"

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    doc.status = status;
    doc.comments = comments || "";
    doc.updatedAt = Date.now();
    await doc.save();

    const candidate = await Candidate.findById(doc.candidateId);
    if (candidate) {
      candidate.activityTimeline.push({
        activity: `Document ${doc.fileType} ${status}. Comments: ${comments || "None"}`,
        performedBy: req.user._id
      });
      await candidate.save();

      // If rejected, send notification email
      if (status === "Rejected") {
        const emailHtml = `
          <h2>Document Rejected Alert ⚠️</h2>
          <p>Dear <b>${candidate.fullName}</b>,</p>
          <p>Your uploaded document <b>${doc.fileType}</b> has been rejected by HR.</p>
          <p><b>HR Comments:</b> ${comments || "Please re-upload a clear file."}</p>
          <p>Please log in to the portal and re-upload the document for verification.</p>
        `;
        enqueueEmail(candidate.email, `Document Verification Rejected: ${doc.fileType}`, emailHtml);
      }
    }

    return res.status(200).json({ success: true, message: `Document status set to ${status}`, document: doc });
  } catch (error) {
    console.error("Verify document error:", error);
    return res.status(500).json({ success: false, error: "Server error verifying document" });
  }
};

// HR convert candidate to full Employee
export const convertCandidateToEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id).populate("userId");
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const offer = await Offer.findOne({ candidateId: candidate._id }).populate("department", "dep_name");
    if (!offer || offer.status !== "Accepted") {
      return res.status(400).json({ success: false, error: "Candidate must accept offer letter first" });
    }

    // Check if employee already exists for user
    const existingEmployee = await Employee.findOne({ userId: candidate.userId._id });
    if (existingEmployee) {
      return res.status(400).json({ success: false, error: "Candidate is already converted to an employee record" });
    }

    // Save original email to send welcome mail
    const originalEmail = candidate.email;

    // Generate permanent email and password
    const nameStr = candidate.fullName.replace(/[\.\-_,]/g, " ").trim();
    const words = nameStr.split(/\s+/).filter(Boolean);
    let emailPrefix = "";
    if (words.length >= 2) {
      emailPrefix = (words[0][0] + words[1]).toLowerCase();
    } else if (words.length === 1) {
      emailPrefix = words[0].toLowerCase();
    } else {
      emailPrefix = "employee";
    }

    let permEmail = `${emailPrefix}@speshway.com`;
    let count = 1;
    while (true) {
      const existingUser = await User.findOne({ 
        email: permEmail, 
        _id: { $ne: candidate.userId?._id } 
      });
      const existingCandidate = await Candidate.findOne({ 
        email: permEmail, 
        _id: { $ne: candidate._id } 
      });
      if (!existingUser && !existingCandidate) {
        break;
      }
      permEmail = `${emailPrefix}${count}@speshway.com`;
      count++;
    }
    const permPassword = `${permEmail.split("@")[0]}123`;
    const hashedPassword = await bcrypt.hash(permPassword, 10);

    // Generate Employee ID (e.g. EMP001, EMP002)
    const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
    let nextNum = 1;
    if (lastEmployee && lastEmployee.employeeId) {
      const match = lastEmployee.employeeId.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0]) + 1;
      }
    }
    const employeeId = `EMP${String(nextNum).padStart(3, "0")}`;

    // Create Employee record
    const newEmployee = new Employee({
      userId: candidate.userId._id,
      employeeId,
      dob: candidate.personalInfo?.dob || null,
      joiningDate: offer.joiningDate,
      gender: candidate.personalInfo?.gender || "",
      mobilenumber: candidate.mobileNumber,
      designation: offer.designation,
      department: offer.department?._id || offer.department,
      status: "active"
    });

    await newEmployee.save();

    // Create a default PayrollTemplate for the new employee
    try {
      const fullSalary = parseFloat(((offer.salaryPackage || 0) / 12).toFixed(2));
      let basicSalary = 0;
      let da = 0;
      let hra = 0;
      let conveyance = 0;
      let medicalallowances = 0;
      let specialallowances = 0;
      
      if (fullSalary > 2850) {
        const remaining = fullSalary - 2850;
        basicSalary = parseFloat((remaining * 0.40).toFixed(2));
        da = parseFloat((remaining * 0.22).toFixed(2));
        hra = parseFloat((remaining * 0.20).toFixed(2));
        conveyance = 1600;
        medicalallowances = 1250;
        specialallowances = parseFloat((remaining * 0.18).toFixed(2));
      } else {
        basicSalary = parseFloat(fullSalary.toFixed(2));
      }

      const defaultTemplate = new PayrollTemplate({
        employeeId: newEmployee._id,
        templateName: `${candidate.fullName} - Default Template`,
        name: candidate.fullName,
        designation: offer.designation,
        department: offer.department?.dep_name || "",
        joiningDate: offer.joiningDate,
        location: offer.workLocation || "Hyderabad",
        bankname: candidate.bankDetails?.bankName || "",
        bankaccountnumber: candidate.bankDetails?.accountNumber || "",
        pan: "",
        uan: "",
        basicSalary,
        da,
        hra,
        conveyance,
        medicalallowances,
        specialallowances,
        proftax: fullSalary <= 20000 ? 150 : 200,
        pf: Math.round(basicSalary * 0.24),
        autoCalculatePF: true,
        pfPercentage: 24,
        deductions: 0,
        isActive: true,
        isDefault: true,
        createdBy: req.user?._id || candidate.userId?._id
      });
      
      await defaultTemplate.save();
    } catch (templateError) {
      console.error("Error creating default payroll template during candidate conversion:", templateError);
    }

    // Map candidate documents to employee
    await Document.updateMany({ candidateId: candidate._id }, { employeeId: newEmployee._id });

    // Update User Roles, email and password to employee credentials
    const user = await User.findById(candidate.userId._id);
    if (user) {
      user.role = ["employee"];
      user.email = permEmail;
      user.password = hashedPassword;
      await user.save();
    }

    // Update Candidate status and update candidate email
    candidate.email = permEmail;
    candidate.status = "Employee Created";
    candidate.activityTimeline.push({
      activity: `Converted to active employee. Employee ID: ${employeeId}`,
      performedBy: req.user._id
    });
    await candidate.save();

    // Create Audit Log
    const auditLog = new AuditLog({
      action: "EMPLOYEE_CONVERTED",
      performedBy: req.user._id,
      candidateId: candidate._id,
      employeeId: newEmployee._id,
      details: `Candidate ${candidate.fullName} converted to Employee ${employeeId}`
    });
    await auditLog.save();

    // Send Welcoming Employee Email with Permanent credentials notification to originalEmail
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #0f172a; margin-top: 0;">Welcome to the Team! Your Account is Fully Activated 🎉</h2>
        <p>Dear <b>${candidate.fullName}</b>,</p>
        <p>We are thrilled to officially welcome you to <strong>Speshway Solutions</strong>.</p>
        <p>Your employee account has been successfully activated for the position of <b>${offer.designation}</b>.</p>
        <p>Your official <b>Employee ID</b> is: <b>${employeeId}</b></p>
        
        <p>Please note that your candidate portal credentials have been deactivated. To access the HRMS portal for attendance logging, payslip access, leave applications, and more, please use your new permanent employee credentials:</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #007bff; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <h4 style="margin-top: 0; margin-bottom: 8px; color: #1e293b;">Permanent Access Credentials</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; width: 120px;"><strong>Portal Link:</strong></td>
              <td style="padding: 4px 0;"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="color: #007bff; text-decoration: none; font-weight: bold;">HRMS Portal Login</a></td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Username/Email:</strong></td>
              <td style="padding: 4px 0; font-weight: bold; font-family: monospace;">${permEmail}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Password:</strong></td>
              <td style="padding: 4px 0; font-weight: bold; font-family: monospace;">${permPassword}</td>
            </tr>
          </table>
        </div>
        
        <p style="margin-top: 24px; text-align: center;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Log in to HRMS Portal</a>
        </p>
        
        <p style="margin-top: 24px; font-size: 12px; color: #64748b;">
          Note: Your candidate credentials are now disabled, and you can only log in using the permanent credentials above.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="margin-bottom: 0; font-size: 14px; color: #64748b;">Regards,<br/><b>HR Team</b><br/>Speshway Solutions Pvt Ltd.</p>
      </div>
    `;

    enqueueEmail(originalEmail, "Your Employee Account is Activated! 🎉 - Speshway Solutions", emailHtml);

    return res.status(200).json({
      success: true,
      message: `Converted to Employee record successfully. Employee ID: ${employeeId}`,
      employee: newEmployee
    });
  } catch (error) {
    console.error("Convert to employee error:", error);
    return res.status(500).json({ success: false, error: "Server error converting candidate to employee" });
  }
};
