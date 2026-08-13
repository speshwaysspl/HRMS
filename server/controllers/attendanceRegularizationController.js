import AttendanceRegularization from "../models/AttendanceRegularization.js";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";

const requestRegularization = async (req, res) => {
  try {
    const { date, requestedInTime, requestedOutTime, reason } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ success: false, error: "date and reason are required" });
    }

    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee profile not found" });
    }

    const regularization = new AttendanceRegularization({
      employeeId: employee._id,
      date,
      requestedInTime,
      requestedOutTime,
      reason,
    });
    await regularization.save();

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

    return res.status(200).json({ success: true, regularization });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to update regularization request" });
  }
};

export { requestRegularization, getMyRegularizations, getPendingRegularizations, decideRegularization };
