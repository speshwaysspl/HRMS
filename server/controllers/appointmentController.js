import Appointment from "../models/Appointment.js";
import Candidate from "../models/Candidate.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Document from "../models/Document.js";
import Offer from "../models/Offer.js";
import AuditLog from "../models/AuditLog.js";
import Department from "../models/Department.js";
import PayrollTemplate from "../models/PayrollTemplate.js";
import { generateAppointmentLetterPDFBuffer } from "../utils/appointmentPdfGenerator.js";
import { saveFile, deleteFile } from "../utils/fileSaver.js";
import { enqueueEmail } from "../utils/emailQueue.js";
import bcrypt from "bcrypt";

// Helper to calculate employee ID (copied from onboardingController)
const getNextEmployeeId = async () => {
  const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
  let nextNum = 1;
  if (lastEmployee && lastEmployee.employeeId) {
    const match = lastEmployee.employeeId.match(/\d+/);
    if (match) {
      nextNum = parseInt(match[0]) + 1;
    }
  }
  return `EMP${String(nextNum).padStart(3, "0")}`;
};

// Create or update Appointment Details
export const createAppointment = async (req, res) => {
  try {
    const {
      candidateId,
      designation,
      department,
      salaryPackage,
      joiningDate,
      reportingTime,
      probationPeriod,
      noticePeriod
    } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    let appointment = await Appointment.findOne({ candidateId });
    if (appointment) {
      // Delete old file
      if (appointment.appointmentLetterKey) {
        await deleteFile(appointment.appointmentLetterKey);
      }
      appointment.designation = designation;
      appointment.department = department;
      appointment.salaryPackage = salaryPackage;
      appointment.joiningDate = joiningDate;
      appointment.reportingTime = reportingTime;
      appointment.probationPeriod = probationPeriod;
      appointment.noticePeriod = noticePeriod;
      appointment.status = "Pending";
    } else {
      appointment = new Appointment({
        candidateId,
        designation,
        department,
        salaryPackage,
        joiningDate,
        reportingTime,
        probationPeriod,
        noticePeriod,
        status: "Pending"
      });
    }

    const pdfCandidate = {
      ...candidate.toObject(),
      designation,
      salaryPackage,
      joiningDate,
      reportingTime,
      probationPeriod,
      noticePeriod
    };

    const pdfBuffer = await generateAppointmentLetterPDFBuffer(pdfCandidate);
    const pseudoFile = {
      originalname: `AppointmentLetter_${candidate.candidateId}.pdf`,
      buffer: pdfBuffer,
      mimetype: "application/pdf"
    };

    const uploadResult = await saveFile(pseudoFile, "appointments");
    appointment.appointmentLetterUrl = uploadResult.url;
    appointment.appointmentLetterKey = uploadResult.key;
    appointment.updatedAt = Date.now();

    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment details saved successfully",
      appointment
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Preview Appointment PDF dynamically (no saving to DB/disk)
export const previewAppointment = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { designation, joiningDate, reportingTime, salaryPackage, probationPeriod, noticePeriod } = req.query;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const pdfCandidate = {
      ...candidate.toObject(),
      designation: designation || candidate.position || "Associate Software Engineer",
      joiningDate: joiningDate ? new Date(joiningDate) : (candidate.expectedJoiningDate || new Date()),
      reportingTime: reportingTime || "09:00",
      salaryPackage: salaryPackage ? parseFloat(salaryPackage) : 480000,
      probationPeriod: probationPeriod || "six months",
      noticePeriod: noticePeriod || "one month"
    };

    const pdfBuffer = await generateAppointmentLetterPDFBuffer(pdfCandidate);
    const fileName = `Appointment_Letter_Preview_${candidate.fullName.replace(/\s+/g, "_")}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Length": pdfBuffer.length
    });
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Preview appointment error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Send Appointment Letter (saves PDF, updates candidate status, sends Email)
export const sendAppointment = async (req, res) => {
  try {
    const { id } = req.params; // Candidate ID
    
    // Find candidate
    const candidate = await Candidate.findById(id).populate("userId");
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const {
      designation,
      department,
      salaryPackage,
      joiningDate,
      reportingTime,
      probationPeriod,
      noticePeriod
    } = req.body;

    // Check if appointment already exists, or create new
    let appointment = await Appointment.findOne({ candidateId: candidate._id });
    if (!appointment) {
      appointment = new Appointment({
        candidateId: candidate._id,
        designation,
        department,
        salaryPackage,
        joiningDate,
        reportingTime,
        status: "Pending"
      });
    } else {
      appointment.designation = designation;
      appointment.department = department;
      appointment.salaryPackage = salaryPackage;
      appointment.joiningDate = joiningDate;
      appointment.reportingTime = reportingTime;
    }

    const pdfCandidate = {
      ...candidate.toObject(),
      designation,
      salaryPackage,
      joiningDate,
      reportingTime,
      probationPeriod,
      noticePeriod
    };

    // Regenerate and upload
    const pdfBuffer = await generateAppointmentLetterPDFBuffer(pdfCandidate);
    
    if (appointment.appointmentLetterKey) {
      try {
        await deleteFile(appointment.appointmentLetterKey);
      } catch (err) {
        console.error("Delete old file failed:", err);
      }
    }

    const pseudoFile = {
      originalname: `AppointmentLetter_${candidate.candidateId}.pdf`,
      buffer: pdfBuffer,
      mimetype: "application/pdf"
    };

    const uploadResult = await saveFile(pseudoFile, "appointments");
    appointment.appointmentLetterUrl = uploadResult.url;
    appointment.appointmentLetterKey = uploadResult.key;
    appointment.status = "Sent";
    appointment.updatedAt = Date.now();
    await appointment.save();

    // Update Candidate status to Appointment Sent
    candidate.status = "Appointment Sent";
    candidate.activityTimeline.push({
      activity: "Appointment Letter Sent to Candidate",
      performedBy: req.user?._id || candidate.userId?._id
    });
    await candidate.save();

    // Log Audit Log
    const auditLog = new AuditLog({
      action: "APPOINTMENT_SENT",
      performedBy: req.user?._id || candidate.userId?._id,
      candidateId: candidate._id,
      details: `Appointment letter sent to ${candidate.fullName}`
    });
    await auditLog.save();

    // Send Onboarding Appointment Ready Email with PDF attached
    const emailHtml = `
      <h2>Your Appointment Letter is Ready! 🎉</h2>
      <p>Dear <b>${candidate.fullName}</b>,</p>
      <p>We are pleased to inform you that your Letter of Appointment is ready.</p>
      <p>Please log in to your onboarding portal to review and accept the appointment letter. A copy of the appointment letter is also attached to this email.</p>
      <p><b>Link to Portal:</b> <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Log in to HRMS Portal</a></p>
      <br/>
      <p>Regards,</p>
      <p><b>HR Team</b></p>
      <p>Speshway Solutions Pvt Ltd.</p>
    `;

    enqueueEmail(candidate.email, "Letter of Appointment - Speshway Solutions 📜", emailHtml, [
      {
        filename: `AppointmentLetter_${candidate.candidateId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf"
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Appointment letter sent to candidate successfully",
      appointment
    });
  } catch (error) {
    console.error("Send appointment error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Candidate Accept Appointment
export const acceptAppointment = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const appointment = await Appointment.findOne({ candidateId });
    if (!appointment) {
      return res.status(404).json({ success: false, error: "Appointment not found" });
    }

    if (appointment.status !== "Sent") {
      return res.status(400).json({ success: false, error: "Appointment cannot be accepted in its current state" });
    }

    appointment.status = "Accepted";
    appointment.updatedAt = Date.now();
    await appointment.save();

    const candidate = await Candidate.findById(candidateId);
    if (candidate) {
      candidate.status = "Appointment Accepted";
      candidate.activityTimeline.push({
        activity: "Appointment Letter Accepted by Candidate",
        performedBy: req.user?._id || candidate.userId?._id
      });
      await candidate.save();

      // Log to Audit Log
      const auditLog = new AuditLog({
        action: "APPOINTMENT_ACCEPTED",
        performedBy: req.user?._id || candidate.userId?._id,
        candidateId: candidate._id,
        details: `Appointment letter accepted by ${candidate.fullName}`
      });
      await auditLog.save();

      // Notify HR
      const hrAdmin = await User.findOne({ role: "admin" });
      if (hrAdmin) {
        const emailHtml = `
          <h2>Appointment Accepted Notification 🔔</h2>
          <p>Candidate <b>${candidate.fullName}</b> (${candidate.candidateId}) has accepted their Letter of Appointment.</p>
          <p>You can now log in to the admin/hr dashboard and convert them to an active employee record.</p>
        `;
        enqueueEmail(hrAdmin.email, `Appointment Accepted - ${candidate.fullName}`, emailHtml);
      }
    }

    return res.status(200).json({ success: true, message: "Appointment letter accepted successfully", appointment });
  } catch (error) {
    console.error("Accept appointment error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// HR/Admin converts candidate to permanent active employee
export const convertCandidateToEmployee = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const candidate = await Candidate.findById(candidateId).populate("userId");
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const appointment = await Appointment.findOne({ candidateId }).populate("department", "dep_name");
    if (!appointment) {
      return res.status(404).json({ success: false, error: "Appointment details not found" });
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

    // Check if employee record already exists
    let employee = await Employee.findOne({ userId: candidate.userId?._id });
    let employeeId = "";
    if (!employee) {
      employeeId = await getNextEmployeeId();

      // Create Employee record
      employee = new Employee({
        userId: candidate.userId?._id,
        employeeId,
        dob: candidate.personalInfo?.dob || null,
        joiningDate: appointment.joiningDate,
        gender: candidate.personalInfo?.gender || "",
        mobilenumber: candidate.mobileNumber,
        designation: appointment.designation,
        department: appointment.department?._id || appointment.department,
        status: "active"
      });
      await employee.save();

      // Create default PayrollTemplate for the new employee
      try {
        const offer = await Offer.findOne({ candidateId: candidate._id });

        const fullSalary = parseFloat(((appointment.salaryPackage || 0) / 12).toFixed(2));
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
          employeeId: employee._id,
          templateName: `${candidate.fullName} - Default Template`,
          name: candidate.fullName,
          designation: appointment.designation,
          department: appointment.department?.dep_name || "",
          joiningDate: appointment.joiningDate,
          location: offer?.workLocation || "Hyderabad",
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
      await Document.updateMany({ candidateId: candidate._id }, { employeeId: employee._id });

      // Update User Roles, email and password to employee credentials
      const user = await User.findById(candidate.userId?._id);
      if (user) {
        user.role = ["employee"];
        user.email = permEmail;
        user.password = hashedPassword;
        await user.save();
      }

      // Update Candidate status to Employee Created and update candidate email
      candidate.email = permEmail;
      candidate.status = "Employee Created";
      candidate.activityTimeline.push({
        activity: `Converted to active employee. Employee ID: ${employeeId}`,
        performedBy: req.user?._id || candidate.userId?._id
      });
      await candidate.save();

      // Create Audit Log
      const auditLog = new AuditLog({
        action: "EMPLOYEE_CONVERTED",
        performedBy: req.user?._id || candidate.userId?._id,
        candidateId: candidate._id,
        employeeId: employee._id,
        details: `Candidate ${candidate.fullName} converted to Employee ${employeeId} by HR`
      });
      await auditLog.save();
    } else {
      employeeId = employee.employeeId;
    }

    // Send Welcoming Employee Email with Permanent credentials notification to originalEmail
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #0f172a; margin-top: 0;">Welcome to the Team! Your Account is Fully Activated 🎉</h2>
        <p>Dear <b>${candidate.fullName}</b>,</p>
        <p>We are thrilled to officially welcome you to <strong>Speshway Solutions</strong>.</p>
        <p>Your employee account has been successfully activated for the position of <b>${appointment.designation}</b>.</p>
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

    enqueueEmail(originalEmail, "Welcome to Speshway Solutions - Account Activated! 📜", emailHtml);

    return res.status(200).json({
      success: true,
      message: "Candidate converted to active employee successfully",
      employeeId
    });
  } catch (error) {
    console.error("Convert candidate error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get All Appointments
export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("candidateId", "fullName email candidateId status")
      .populate("department", "dep_name");
    return res.status(200).json({ success: true, appointments });
  } catch (error) {
    console.error("Get appointments error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching appointments" });
  }
};

// Get Appointment by Candidate ID
export const getAppointmentByCandidateId = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const appointment = await Appointment.findOne({ candidateId })
      .populate("department", "dep_name");
    if (!appointment) {
      return res.status(404).json({ success: false, error: "Appointment details not found" });
    }
    return res.status(200).json({ success: true, appointment });
  } catch (error) {
    console.error("Get appointment error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching appointment details" });
  }
};
