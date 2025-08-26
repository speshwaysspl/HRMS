import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import ExcelJS from "exceljs";
 
/**
 * Save or update attendance for logged-in employee
 */
export const saveAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ message: "Employee profile not found" });
 
    const { inTime, outTime, workMode, breaks, inLocation, outLocation, date } = req.body;
    let attendance = await Attendance.findOne({ userId: employee._id, date });
 
    if (!attendance) {
      if (!inTime) return res.status(400).json({ message: "In Time is required for first entry" });
      attendance = new Attendance({
        userId: employee._id,
 
               
        date,
        inTime,
        workMode,
        breaks: breaks || [],
        inLocation,
        outTime: "",
        outLocation: null,
      });
    } else {
      if (outTime) {
        if (attendance.outTime) return res.status(400).json({ message: "Out Time already set" });
        attendance.outTime = outTime;
        attendance.outLocation = outLocation;
      }
    }
 
    await attendance.save();
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: "Error saving attendance", error: error.message });
  }
};
 
/**
 * Employee: Get today's attendance
 */
export const getTodayAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ message: "Employee profile not found" });
 
    const today = new Date().toISOString().split("T")[0];
    const attendance = await Attendance.findOne({ userId: employee._id, date: today });
 
    res.status(200).json(attendance || null);
  } catch (error) {
    res.status(500).json({ message: "Error fetching today attendance", error: error.message });
  }
};
 
/**
 * Employee: Get own attendance report (optionally by date)
 */
export const getAttendanceReport = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ message: "Employee profile not found" });
 
    const { date } = req.query;
    const query = { userId: employee._id };
    if (date) query.date = date;
 
    const report = await Attendance.find(query).sort({ date: -1 });
    res.status(200).json(report || []);
  } catch (error) {
    res.status(500).json({ message: "Error fetching attendance report", error: error.message });
  }
};
 
/**
 * 🔹 Admin: Get all attendance (Day-wise)
 */
export const getAllAttendance = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
 
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required" });
 
    const employees = await Employee.find().populate('userId', 'name');
    const attendanceData = await Promise.all(
      employees.map(async (emp) => {
        const record = await Attendance.findOne({ userId: emp._id, date });
        let attendanceStatus = record?.inTime && record?.outTime
          ? "Present"
          : record?.inTime
          ? "Incomplete"
          : "Absent";
       
        // Apply Half Day logic (same as frontend)
        if (record?.inTime && record?.outTime) {
          const [h, m] = record.inTime.split(":").map(Number);
          if (h > 12 || (h === 12 && m > 0)) {
            attendanceStatus = "Half Day";
          }
        }
       
        return {
          employeeId: emp.employeeId,
          name: emp.userId?.name || "N/A",
          designation: emp.designation,
          date,
          inTime: record?.inTime || "Not Marked",
          outTime: record?.outTime || "Not Marked",
          workMode: record?.workMode || "N/A",
          inLocation: record?.inLocation?.area || "N/A",
          outLocation: record?.outLocation?.area || "N/A",
          status: attendanceStatus,
        };
      })
    );
 
    res.status(200).json(attendanceData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all attendance records", error: error.message });
  }
};
 
/**
 * 🔹 Admin: Get monthly attendance for a single employee
 */
export const getMonthlyAttendance = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
 
    const { month, employeeId, employeeName } = req.query;
    if (!month || (!employeeId && !employeeName))
      return res.status(400).json({ message: "Month and either Employee ID or Employee Name are required" });
 
    const [year, mon] = month.split("-");
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0);
 
    let employee;
    if (employeeId) {
      employee = await Employee.findOne({ employeeId }).populate('userId', 'name');
    } else if (employeeName) {
      const user = await User.findOne({ name: { $regex: new RegExp(employeeName, 'i') } });
      if (user) {
        employee = await Employee.findOne({ userId: user._id }).populate('userId', 'name');
      }
    }
    if (!employee) return res.status(404).json({ message: "Employee not found" });
 
    const records = await Attendance.find({
      userId: employee._id,
      date: { $gte: startDate.toISOString().split("T")[0], $lte: endDate.toISOString().split("T")[0] },
    }).sort({ date: 1 });
 
    const monthlyData = [];
    for (let d = 1; d <= endDate.getDate(); d++) {
      const currentDate = new Date(year, mon - 1, d).toISOString().split("T")[0];
      const record = records.find((r) => r.date === currentDate);
      let attendanceStatus = record?.inTime && record?.outTime
        ? "Present"
        : record?.inTime
        ? "Incomplete"
        : "Absent";
     
      // Apply Half Day logic (same as frontend)
      if (record?.inTime && record?.outTime) {
        const [h, m] = record.inTime.split(":").map(Number);
        if (h > 12 || (h === 12 && m > 0)) {
          attendanceStatus = "Half Day";
        }
      }
     
      monthlyData.push({
        employeeId: employee.employeeId,
        name: employee.userId?.name || "N/A",
        designation: employee.designation,
        date: currentDate,
        inTime: record?.inTime || "Not Marked",
        outTime: record?.outTime || "Not Marked",
        workMode: record?.workMode || "N/A",
        inLocation: record?.inLocation?.area || "N/A",
        outLocation: record?.outLocation?.area || "N/A",
        status: attendanceStatus,
      });
    }
 
    res.status(200).json(monthlyData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching monthly attendance", error: error.message });
  }
};
 
/**
 * 🔹 Admin: Export Day-wise Attendance to Excel
 */
export const exportAttendanceExcel = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
 
    const { date, status } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required" });
 
    const employees = await Employee.find().populate('userId', 'name');
    let attendanceData = await Promise.all(
      employees.map(async (emp) => {
        const record = await Attendance.findOne({ userId: emp._id, date });
        let attendanceStatus = record?.inTime && record?.outTime
          ? "Present"
          : record?.inTime
          ? "Incomplete"
          : "Absent";
       
        // Apply Half Day logic (same as frontend)
        if (record?.inTime && record?.outTime) {
          const [h, m] = record.inTime.split(":").map(Number);
          if (h > 12 || (h === 12 && m > 0)) {
            attendanceStatus = "Half Day";
          }
        }
       
        return {
          employeeId: emp.employeeId,
          name: emp.userId?.name || "N/A",
          designation: emp.designation,
          date,
          inTime: record?.inTime || "Not Marked",
          outTime: record?.outTime || "Not Marked",
          workMode: record?.workMode || "N/A",
          inLocation: record?.inLocation?.area || "N/A",
          outLocation: record?.outLocation?.area || "N/A",
          status: attendanceStatus,
        };
      })
    );
 
    // Filter by status if provided
    if (status && status !== "All") {
      attendanceData = attendanceData.filter(data => data.status === status);
    }
 
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance");
    sheet.columns = [
      { header: "Employee ID", key: "employeeId", width: 20 },
      { header: "Name", key: "name", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Date", key: "date", width: 15 },
      { header: "In Time", key: "inTime", width: 15 },
      { header: "Out Time", key: "outTime", width: 15 },
      { header: "Work Mode", key: "workMode", width: 20 },
      { header: "In Location", key: "inLocation", width: 25 },
      { header: "Out Location", key: "outLocation", width: 25 },
      { header: "Status", key: "status", width: 15 },
    ];
    sheet.addRows(attendanceData);
 
    res.setHeader("Content-Disposition", `attachment; filename="attendance_${date}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Error exporting Excel", error: error.message });
  }
};
 
/**
 * 🔹 Admin: Export Monthly Attendance (per employee) to Excel
 */
export const exportMonthlyAttendanceExcel = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
 
    const { month, employeeId, employeeName, status } = req.query;
    if (!month || (!employeeId && !employeeName))
      return res.status(400).json({ message: "Month and either Employee ID or Employee Name are required" });
 
    const [year, mon] = month.split("-");
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0);
 
    let employee;
    if (employeeId) {
      employee = await Employee.findOne({ employeeId }).populate('userId', 'name');
    } else if (employeeName) {
      const user = await User.findOne({ name: { $regex: new RegExp(employeeName, 'i') } });
      if (user) {
        employee = await Employee.findOne({ userId: user._id }).populate('userId', 'name');
      }
    }
    if (!employee) return res.status(404).json({ message: "Employee not found" });
 
    const records = await Attendance.find({
      userId: employee._id,
      date: { $gte: startDate.toISOString().split("T")[0], $lte: endDate.toISOString().split("T")[0] },
    }).sort({ date: 1 });
 
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Monthly Attendance");
    sheet.columns = [
      { header: "Employee ID", key: "employeeId", width: 20 },
      { header: "Name", key: "name", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Date", key: "date", width: 15 },
      { header: "In Time", key: "inTime", width: 15 },
      { header: "Out Time", key: "outTime", width: 15 },
      { header: "Work Mode", key: "workMode", width: 20 },
      { header: "In Location", key: "inLocation", width: 25 },
      { header: "Out Location", key: "outLocation", width: 25 },
      { header: "Status", key: "status", width: 15 },
    ];
 
    for (let d = 1; d <= endDate.getDate(); d++) {
      const currentDate = new Date(year, mon - 1, d).toISOString().split("T")[0];
      const record = records.find((r) => r.date === currentDate);
      let attendanceStatus = record?.inTime && record?.outTime
        ? "Present"
        : record?.inTime
        ? "Incomplete"
        : "Absent";
     
      // Apply Half Day logic (same as frontend)
      if (record?.inTime && record?.outTime) {
        const [h, m] = record.inTime.split(":").map(Number);
        if (h > 12 || (h === 12 && m > 0)) {
          attendanceStatus = "Half Day";
        }
      }
     
      // Filter by status if provided
      if (status && status !== "All" && attendanceStatus !== status) {
        continue;
      }
     
      sheet.addRow({
        employeeId: employee.employeeId,
        name: employee.userId?.name || "N/A",
        designation: employee.designation,
        date: currentDate,
        inTime: record?.inTime || "Not Marked",
        outTime: record?.outTime || "Not Marked",
        workMode: record?.workMode || "N/A",
        inLocation: record?.inLocation?.area || "N/A",
        outLocation: record?.outLocation?.area || "N/A",
        status: attendanceStatus,
      });
    }
 
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_${employeeId}_${month}.xlsx"`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Error exporting monthly Excel", error: error.message });
  }
};
 
 