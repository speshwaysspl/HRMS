import LeaveType from "../models/LeaveType.js";
import Leave from "../models/Leave.js";
import Employee from "../models/Employee.js";

const DEFAULT_LEAVE_TYPES = [
  { name: "Sick Leave", monthlyQuota: 1, annualQuota: 12 },
  { name: "Casual Leave", monthlyQuota: 1, annualQuota: 12 },
  { name: "Annual Leave", monthlyQuota: 1.25, annualQuota: 15 },
  { name: "Work from Home", monthlyQuota: 2, annualQuota: 24 },
];

const ensureDefaultLeaveTypes = async () => {
  const count = await LeaveType.countDocuments();
  if (count === 0) {
    await LeaveType.insertMany(DEFAULT_LEAVE_TYPES);
  } else {
    const existing = await LeaveType.find({ monthlyQuota: { $exists: false } });
    for (const lt of existing) {
      const mq = lt.annualQuota ? Math.round((lt.annualQuota / 12) * 10) / 10 : 1;
      await LeaveType.updateOne({ _id: lt._id }, { $set: { monthlyQuota: mq } });
    }
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
    let { name, monthlyQuota, annualQuota, requiresApproval } = req.body;
    if (!name || (monthlyQuota === undefined && annualQuota === undefined)) {
      return res.status(400).json({ success: false, error: "Name and monthly quota are required" });
    }
    if (monthlyQuota === undefined) {
      monthlyQuota = annualQuota ? Math.round((annualQuota / 12) * 10) / 10 : 1;
    }
    if (annualQuota === undefined) {
      annualQuota = Math.round(monthlyQuota * 12);
    }
    const existing = await LeaveType.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, error: "Leave type already exists" });
    }
    const leaveType = new LeaveType({
      name,
      monthlyQuota,
      annualQuota,
      requiresApproval: requiresApproval !== false,
    });
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
    let { name, monthlyQuota, annualQuota, requiresApproval, isActive } = req.body;
    if (monthlyQuota !== undefined && annualQuota === undefined) {
      annualQuota = Math.round(monthlyQuota * 12);
    } else if (annualQuota !== undefined && monthlyQuota === undefined) {
      monthlyQuota = annualQuota ? Math.round((annualQuota / 12) * 10) / 10 : 1;
    }
    const updateData = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (monthlyQuota !== undefined) updateData.monthlyQuota = monthlyQuota;
    if (annualQuota !== undefined) updateData.annualQuota = annualQuota;
    if (requiresApproval !== undefined) updateData.requiresApproval = requiresApproval;
    if (isActive !== undefined) updateData.isActive = isActive;

    const leaveType = await LeaveType.findByIdAndUpdate(id, updateData, { new: true });
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

// Compute remaining balance per leave type for the logged-in employee, current calendar month/year
const getLeaveBalance = async (req, res) => {
  try {
    await ensureDefaultLeaveTypes();
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee profile not found" });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    const leaveTypes = await LeaveType.find({ isActive: true }).sort({ name: 1 });

    const approvedLeaves = await Leave.find({
      employeeId: employee._id,
      status: "Approved",
      startDate: { $gte: yearStart, $lte: yearEnd },
    });

    const usedThisYearByType = {};
    const usedThisMonthByType = {};

    approvedLeaves.forEach((leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      usedThisYearByType[leave.leaveType] = (usedThisYearByType[leave.leaveType] || 0) + days;

      if (start >= monthStart && start <= monthEnd) {
        usedThisMonthByType[leave.leaveType] = (usedThisMonthByType[leave.leaveType] || 0) + days;
      }
    });

    const balance = leaveTypes.map((lt) => {
      const mq = lt.monthlyQuota !== undefined ? lt.monthlyQuota : (lt.annualQuota ? Math.round((lt.annualQuota / 12) * 10) / 10 : 1);
      const aq = lt.annualQuota || Math.round(mq * 12);
      const usedThisMonth = usedThisMonthByType[lt.name] || 0;
      const usedThisYear = usedThisYearByType[lt.name] || 0;
      return {
        leaveType: lt.name,
        monthlyQuota: mq,
        annualQuota: aq,
        used: usedThisMonth,
        remaining: Math.max(0, mq - usedThisMonth),
        usedThisMonth,
        remainingThisMonth: Math.max(0, mq - usedThisMonth),
        usedThisYear,
        remainingThisYear: Math.max(0, aq - usedThisYear),
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
