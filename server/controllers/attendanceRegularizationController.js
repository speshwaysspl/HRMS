import AttendanceRegularization from "../models/AttendanceRegularization.js";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import { createNotification } from "./notificationController.js";
import { toISTDateString } from "../utils/dateTimeUtils.js";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const requestRegularization = async (req, res) => {
  try {
    const { date, requestedInTime, requestedOutTime, reason } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ success: false, error: "date and reason are required" });
    }

    // "Forgot to check out" style requests are for a past day only.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= toISTDateString(new Date())) {
      return res.status(400).json({ success: false, error: "Pick a past date" });
    }
    if (!requestedInTime && !requestedOutTime) {
      return res.status(400).json({ success: false, error: "Enter a check-in or check-out time" });
    }
    if ((requestedInTime && !TIME_RE.test(requestedInTime)) || (requestedOutTime && !TIME_RE.test(requestedOutTime))) {
      return res.status(400).json({ success: false, error: "Times must be HH:MM" });
    }

    const employee = await Employee.findOne({ userId: req.user._id }).populate("userId", "name");
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee profile not found" });
    }

    const duplicate = await AttendanceRegularization.findOne({ employeeId: employee._id, date, status: "Pending" });
    if (duplicate) {
      return res.status(409).json({ success: false, error: "You already have a pending request for this date" });
    }

    const regularization = new AttendanceRegularization({
      employeeId: employee._id,
      date,
      requestedInTime,
      requestedOutTime,
      reason,
    });
    await regularization.save();

    // Notify approvers: admins/HR plus the employee's reporting manager.
    try {
      const io = req.app.get("io");
      const approverIds = new Set(
        (await User.find({ role: { $in: ["admin", "hr"] } }).select("_id")).map((u) => u._id.toString())
      );
      if (employee.reportsTo) {
        const manager = await Employee.findById(employee.reportsTo).select("userId");
        if (manager?.userId) approverIds.add(manager.userId.toString());
      }
      const times = [requestedInTime && `in ${requestedInTime}`, requestedOutTime && `out ${requestedOutTime}`].filter(Boolean).join(", ");
      for (const recipientId of approverIds) {
        await createNotification({
          type: "regularization_request",
          title: "Attendance correction request",
          message: `${employee.userId?.name || "An employee"} requested a correction for ${date} (${times}).`,
          recipientId,
          senderId: req.user._id,
          relatedId: regularization._id,
        }, io);
      }
    } catch (e) {
      console.error("Regularization request notification failed:", e.message);
    }

    return res.status(200).json({ success: true, regularization });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to submit regularization request" });
  }
};

const getMyRegularizations = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee profile not found" });
    }
    const regularizations = await AttendanceRegularization.find({ employeeId: employee._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, regularizations });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch regularization requests" });
  }
};

// Approver view: admin/HR see all pending; team leads see their direct reports' pending requests
const getPendingRegularizations = async (req, res) => {
  try {
    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const isAdminOrHR = userRoles.includes("admin") || userRoles.includes("hr");

    let query = { status: "Pending" };
    if (!isAdminOrHR) {
      const approverEmployee = await Employee.findOne({ userId: req.user._id });
      if (!approverEmployee) {
        return res.status(404).json({ success: false, error: "Employee profile not found" });
      }
      const directReports = await Employee.find({ reportsTo: approverEmployee._id }).select("_id");
      query.employeeId = { $in: directReports.map((e) => e._id) };
    }

    const regularizations = await AttendanceRegularization.find(query)
      .populate({ path: "employeeId", populate: { path: "userId", select: "name" } })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, regularizations });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch pending regularization requests" });
  }
};

const decideRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "Approved" | "Rejected"
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const regularization = await AttendanceRegularization.findById(id);
    if (!regularization) {
      return res.status(404).json({ success: false, error: "Regularization request not found" });
    }
    if (regularization.status !== "Pending") {
      return res.status(409).json({ success: false, error: `Request already ${regularization.status.toLowerCase()}` });
    }

    regularization.status = status;
    regularization.approvedBy = req.user._id;
    await regularization.save();

    if (status === "Approved") {
      const update = {};
      if (regularization.requestedInTime) update.inTime = regularization.requestedInTime;
      if (regularization.requestedOutTime) update.outTime = regularization.requestedOutTime;

      await Attendance.findOneAndUpdate(
        { userId: regularization.employeeId, date: regularization.date },
        { $set: update, $setOnInsert: { userId: regularization.employeeId, date: regularization.date } },
        { upsert: true, new: true }
      );
    }

    try {
      const emp = await Employee.findById(regularization.employeeId).select("userId");
      if (emp?.userId) {
        await createNotification({
          type: status === "Approved" ? "regularization_approved" : "regularization_rejected",
          title: `Attendance correction ${status.toLowerCase()}`,
          message: `Your correction request for ${regularization.date} was ${status.toLowerCase()}.`,
          recipientId: emp.userId,
          senderId: req.user._id,
          relatedId: regularization._id,
        }, req.app.get("io"));
      }
    } catch (e) {
      console.error("Regularization decision notification failed:", e.message);
    }

    return res.status(200).json({ success: true, regularization });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to update regularization request" });
  }
};

export { requestRegularization, getMyRegularizations, getPendingRegularizations, decideRegularization };
