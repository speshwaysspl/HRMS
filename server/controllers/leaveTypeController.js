import LeaveType from "../models/LeaveType.js";
import Leave from "../models/Leave.js";
import Employee from "../models/Employee.js";

const DEFAULT_LEAVE_TYPES = [
  { name: "Sick Leave", annualQuota: 12 },
  { name: "Casual Leave", annualQuota: 12 },
  { name: "Annual Leave", annualQuota: 15 },
  { name: "Work from Home", annualQuota: 24 },
];

const ensureDefaultLeaveTypes = async () => {
  const count = await LeaveType.countDocuments();
  if (count === 0) {
    await LeaveType.insertMany(DEFAULT_LEAVE_TYPES);
  }
};

const getLeaveTypes = async (req, res) => {
  try {
    await ensureDefaultLeaveTypes();
    const activeOnly = req.query.activeOnly === "true";
    const query = activeOnly ? { isActive: true } : {};
    const leaveTypes = await LeaveType.find(query).sort({ name: 1 });
    return res.status(200).json({ success: true, leaveTypes });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch leave types" });
  }
};

const addLeaveType = async (req, res) => {
  try {
    const { name, annualQuota, requiresApproval } = req.body;
    if (!name || annualQuota === undefined) {
      return res.status(400).json({ success: false, error: "name and annualQuota are required" });
    }
    const existing = await LeaveType.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, error: "Leave type already exists" });
    }
    const leaveType = new LeaveType({ name, annualQuota, requiresApproval: requiresApproval !== false });
    await leaveType.save();
    return res.status(200).json({ success: true, leaveType });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to add leave type" });
  }
};

const updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, annualQuota, requiresApproval, isActive } = req.body;
    const leaveType = await LeaveType.findByIdAndUpdate(
      id,
      { name, annualQuota, requiresApproval, isActive, updatedAt: new Date() },
      { new: true }
    );
    if (!leaveType) {
      return res.status(404).json({ success: false, error: "Leave type not found" });
    }
    return res.status(200).json({ success: true, leaveType });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to update leave type" });
  }
};

const deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await LeaveType.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Leave type not found" });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to delete leave type" });
  }
};

// Compute remaining balance per leave type for the logged-in employee, current calendar year
const getLeaveBalance = async (req, res) => {
  try {
    await ensureDefaultLeaveTypes();
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee profile not found" });
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    const leaveTypes = await LeaveType.find({ isActive: true }).sort({ name: 1 });

    const approvedLeaves = await Leave.find({
      employeeId: employee._id,
      status: "Approved",
      startDate: { $gte: yearStart, $lte: yearEnd },
    });

    const usedByType = {};
    approvedLeaves.forEach((leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      usedByType[leave.leaveType] = (usedByType[leave.leaveType] || 0) + days;
    });

    const balance = leaveTypes.map((lt) => {
      const used = usedByType[lt.name] || 0;
      return {
        leaveType: lt.name,
        annualQuota: lt.annualQuota,
        used,
        remaining: Math.max(0, lt.annualQuota - used),
      };
    });

    return res.status(200).json({ success: true, balance });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to compute leave balance" });
  }
};

export {
  getLeaveTypes,
  addLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getLeaveBalance,
};
