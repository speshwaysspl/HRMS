import ExcelJS from "exceljs";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";

// Builds a simple weekly attendance + leave summary workbook (Buffer) for Admin/HR
export const buildWeeklySummaryReport = async () => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startStr = weekAgo.toISOString().split("T")[0];
  const endStr = now.toISOString().split("T")[0];

  const employees = await Employee.find({ status: "active" }).populate("userId", "name");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Weekly Summary");
  sheet.columns = [
    { header: "Employee ID", key: "employeeId", width: 15 },
    { header: "Name", key: "name", width: 25 },
    { header: "Days Present", key: "daysPresent", width: 15 },
    { header: "Days Absent/No Record", key: "daysAbsent", width: 20 },
    { header: "Approved Leaves (this week)", key: "leaves", width: 25 },
  ];

  for (const emp of employees) {
    const attendanceRecords = await Attendance.find({
      userId: emp._id,
      date: { $gte: startStr, $lte: endStr },
    });
    const daysPresent = attendanceRecords.filter((r) => r.inTime).length;
    const daysAbsent = 7 - daysPresent;

    const leaves = await Leave.countDocuments({
      employeeId: emp._id,
      status: "Approved",
      startDate: { $lte: new Date(endStr) },
      endDate: { $gte: new Date(startStr) },
    });

    sheet.addRow({
      employeeId: emp.employeeId,
      name: emp.userId?.name || "-",
      daysPresent,
      daysAbsent: Math.max(0, daysAbsent),
      leaves,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename: `Weekly_Summary_${endStr}.xlsx` };
};
