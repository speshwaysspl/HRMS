import AccountDeletionRequest from "../models/AccountDeletionRequest.js";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import Notification from "../models/Notification.js";

/**
 * Submit an account deletion request (accessible via mobile app, web dashboard, or public web URL).
 */
export const requestAccountDeletion = async (req, res) => {
  try {
    let { identifier, reason } = req.body;
    let userId = req.user?._id;
    let employee = null;
    let user = null;

    if (userId) {
      user = await User.findById(userId);
      employee = await Employee.findOne({ userId }).populate("department");
      if (!identifier) {
        identifier = user?.email || employee?.employeeId;
      }
    } else {
      if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
        return res.status(400).json({
          success: false,
          error: "Please provide your registered email address or Employee ID."
        });
      }
      identifier = identifier.trim();

      // Search by email or employeeId
      user = await User.findOne({ email: new RegExp(`^${identifier}$`, "i") });
      if (user) {
        employee = await Employee.findOne({ userId: user._id }).populate("department");
      } else {
        employee = await Employee.findOne({ employeeId: identifier }).populate("department");
        if (employee) {
          user = await User.findById(employee.userId);
        }
      }
    }

    if (!user && !employee) {
      return res.status(404).json({
        success: false,
        error: "No employee account was found matching the provided email or Employee ID."
      });
    }

    const resolvedUserId = user?._id || employee?.userId;
    const resolvedEmpId = employee?._id;
    const resolvedName = user?.name || "Employee";
    const resolvedEmail = user?.email || identifier;
    const resolvedEmpCode = employee?.employeeId || "--";
    const deptName = employee?.department?.dep_name || employee?.department?.name || "";

    // Check for an existing pending request
    const existingPending = await AccountDeletionRequest.findOne({
      $or: [
        { userId: resolvedUserId },
        { identifier: new RegExp(`^${resolvedEmail}$`, "i") }
      ],
      status: "pending"
    });

    if (existingPending) {
      return res.status(200).json({
        success: true,
        message: "An account deletion request is already submitted and pending review by your organization's HR/Admin.",
        requestId: existingPending._id
      });
    }

    const requestedVia = req.user ? (req.headers["x-client"] === "mobile" ? "mobile_app" : "web_portal") : "public_url";

    const newRequest = new AccountDeletionRequest({
      employeeId: resolvedEmpId,
      userId: resolvedUserId,
      identifier: resolvedEmail,
      name: resolvedName,
      department: deptName,
      reason: reason?.trim() || "Employee requested account deletion",
      status: "pending",
      requestedVia
    });

    await newRequest.save();

    // Notify all Admin and HR users
    const adminsAndHrs = await User.find({
      role: { $in: ["admin", "hr"] }
    }).select("_id");

    if (adminsAndHrs.length > 0) {
      const sender = resolvedUserId || adminsAndHrs[0]._id;
      const notifications = adminsAndHrs.map((admin) => ({
        type: "other",
        title: `Account Deletion Request: ${resolvedName}`,
        message: `Employee ${resolvedName} (${resolvedEmpCode} / ${resolvedEmail}) has submitted an account deletion request. Please review and verify.`,
        recipientId: admin._id,
        senderId: sender,
        relatedId: newRequest._id
      }));

      await Notification.insertMany(notifications).catch((err) => {
        console.error("Failed to insert deletion notifications:", err);
      });
    }

    return res.status(201).json({
      success: true,
      message: "Your account deletion request has been submitted. HR/Admin will verify your request and process account and eligible data deletion.",
      requestId: newRequest._id
    });
  } catch (error) {
    console.error("requestAccountDeletion error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to submit account deletion request. Please try again later."
    });
  }
};

/**
 * Get all account deletion requests (Admin / HR view).
 */
export const getAccountDeletionRequests = async (req, res) => {
  try {
    const requests = await AccountDeletionRequest.find()
      .populate("userId", "name email role")
      .populate("employeeId", "employeeId designation")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests
    });
  } catch (error) {
    console.error("getAccountDeletionRequests error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch account deletion requests."
    });
  }
};
