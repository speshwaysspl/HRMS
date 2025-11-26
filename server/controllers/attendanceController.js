import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Leave from "../models/Leave.js";
import ExcelJS from "exceljs";
import { toISTDateString, toISTTimeString, getCurrentISTDateTime } from "../utils/dateTimeUtils.js";
 
/**
 * Save or update attendance for logged-in employee
 */
export const saveAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ message: "Employee profile not found" });

    const { inTime, outTime, workMode, breaks, inLocation, outLocation, date } = req.body;
    let attendance = await Attendance.findOne({ userId: employee._id, date });

    // Validate breaks: only one ongoing break (without end) allowed
    if (Array.isArray(breaks)) {
      const ongoingCount = breaks.filter(b => b && !b.end).length;
      if (ongoingCount > 1) {
        return res.status(400).json({ message: "Only one active break is allowed. End current break before starting another." });
      }
    }

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
      // Update existing record
      if (outTime) {
        if (attendance.outTime) return res.status(400).json({ message: "Out Time already set" });
        attendance.outTime = outTime;
        attendance.outLocation = outLocation;
      }
      // Update breaks if provided
      if (breaks) {
        // If already logged out, do not allow starting/keeping an ongoing break
        if (attendance.outTime && breaks.some(b => b && !b.end)) {
          return res.status(400).json({ message: "Cannot start or keep an active break after logout." });
        }
        attendance.breaks = breaks;
      }
      // Update work mode if provided
      if (workMode) {
        attendance.workMode = workMode;
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
 
    const today = toISTDateString(new Date());
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
        // Calculate working hours if both in and out times are available
        let workingHours = 0;
        let attendanceStatus = "Not Yet";
        
        // Check if there's a leave request approved for this date
        const leaveCheck = await Leave.findOne({
          employeeId: emp._id,
          startDate: { $lte: new Date(date) },
          endDate: { $gte: new Date(date) },
          status: "Approved"
        });
        const hasApprovedLeave = !!leaveCheck;
        
        if (hasApprovedLeave) {
          // Check if it's work from home leave
          if (leaveCheck.leaveType === "Work from Home") {
            // For work from home, also check time conditions if attendance record exists
            if (record?.inTime && record?.outTime) {
              // Calculate working hours for WFH
              const [inHour, inMin] = record.inTime.split(":").map(Number);
              const [outHour, outMin] = record.outTime.split(":").map(Number);
              
              workingHours = (outHour - inHour) + (outMin - inMin) / 60;
              if (workingHours < 0) workingHours += 24;
              
              // Subtract break times if any
              if (record.breaks && record.breaks.length > 0) {
                record.breaks.forEach(breakPeriod => {
                  if (breakPeriod.start && breakPeriod.end) {
                    const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                    const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                    
                    let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                    if (breakHours < 0) breakHours += 24;
                    
                    workingHours -= breakHours;
                  }
                });
              }
              
              // Combine WFH with time-based status
              if (workingHours >= 8) {
                attendanceStatus = workingHours > 8 ? "Work from Home + Overtime" : "Work from Home - Present";
              } else if (workingHours >= 4) {
                attendanceStatus = "Work from Home - Half Day";
              } else if (workingHours > 0) {
                attendanceStatus = "Work from Home - Incomplete";
              } else {
                attendanceStatus = "Work from Home - Not Marked";
              }
            } else if (record?.inTime && !record?.outTime) {
              attendanceStatus = "Work from Home - Incomplete";
            } else {
              attendanceStatus = "Work from Home - Not Marked";
            }
          } else {
            attendanceStatus = "Leave";
          }
        } else if (record?.inTime) {
          if (record?.outTime) {
            // Calculate working hours
            const [inHour, inMin] = record.inTime.split(":").map(Number);
            const [outHour, outMin] = record.outTime.split(":").map(Number);
            
            // Simple calculation (doesn't account for overnight shifts)
            workingHours = (outHour - inHour) + (outMin - inMin) / 60;
            if (workingHours < 0) workingHours += 24; // Handle overnight shifts
            
            // Subtract break times if any
            if (record.breaks && record.breaks.length > 0) {
              record.breaks.forEach(breakPeriod => {
                if (breakPeriod.start && breakPeriod.end) {
                  const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                  const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                  
                  let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                  if (breakHours < 0) breakHours += 24;
                  
                  workingHours -= breakHours;
                }
              });
            }
            
            // Determine status based on working hours
            if (workingHours >= 8) {
              attendanceStatus = workingHours > 8 ? "Present + Overtime" : "Present";
            } else if (workingHours >= 4) {
              attendanceStatus = "Half-Day";
            } else {
              attendanceStatus = "Absent";
            }
          } else {
            // Only in-time is marked, no out-time
            attendanceStatus = "Incomplete";
          }
        } else {
          // No attendance record - check if date has passed
          const today = new Date();
          const currentDateObj = new Date(date);
          
          // If the date has passed and no attendance record exists, mark as Absent
          if (currentDateObj < today && !hasApprovedLeave) {
            attendanceStatus = "Absent";
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
          breaks: record?.breaks || [],
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
 * 🔹 Employee: Get own monthly attendance
 */
export const getEmployeeMonthlyAttendance = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    console.log("Monthly attendance request - userId:", req.user._id, "month:", month);

    const [year, mon] = month.split("-");
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0);

    // Get employee data from the authenticated user
    const employee = await Employee.findOne({ userId: req.user._id }).populate('userId', 'name');
    if (!employee) {
      console.log("Employee not found for userId:", req.user._id);
      return res.status(404).json({ message: "Employee profile not found" });
    }

    console.log("Employee found:", employee._id);

    const records = await Attendance.find({
      userId: employee._id,
      date: { $gte: startDate.toISOString().split("T")[0], $lte: endDate.toISOString().split("T")[0] },
    }).sort({ date: 1 });

    console.log("Found attendance records:", records.length);
    console.log("Records:", records);

    const monthlyData = [];
    for (let d = 1; d <= endDate.getDate(); d++) {
      const currentDate = new Date(year, mon - 1, d).toISOString().split("T")[0];
      const record = records.find((r) => r.date === currentDate);
      
      // Calculate working hours if both in and out times are available
      let workingHours = 0;
      let attendanceStatus = "Not Yet";
      
      // Check if there's a leave request approved for this date
      const leaveCheck = await Leave.findOne({
        employeeId: employee._id,
        startDate: { $lte: new Date(currentDate) },
        endDate: { $gte: new Date(currentDate) },
        status: "Approved"
      });
      const hasApprovedLeave = !!leaveCheck;
      
      if (hasApprovedLeave) {
        // Check if it's work from home leave
        if (leaveCheck.leaveType === "Work from Home") {
          // For work from home, also check time conditions if attendance record exists
          if (record?.inTime && record?.outTime) {
            // Calculate working hours for WFH
            const [inHour, inMin] = record.inTime.split(":").map(Number);
            const [outHour, outMin] = record.outTime.split(":").map(Number);
            
            workingHours = (outHour - inHour) + (outMin - inMin) / 60;
            if (workingHours < 0) workingHours += 24;
            
            // Subtract break times if any
            if (record.breaks && record.breaks.length > 0) {
              record.breaks.forEach(breakPeriod => {
                if (breakPeriod.start && breakPeriod.end) {
                  const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                  const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                  
                  let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                  if (breakHours < 0) breakHours += 24;
                  
                  workingHours -= breakHours;
                }
              });
            }
            
            // Combine WFH with time-based status
            if (workingHours >= 8) {
              attendanceStatus = workingHours > 8 ? "Work from Home + Overtime" : "Work from Home - Present";
            } else if (workingHours >= 4) {
              attendanceStatus = "Work from Home - Half Day";
            } else if (workingHours > 0) {
              attendanceStatus = "Work from Home - Incomplete";
            } else {
              attendanceStatus = "Work from Home - Not Marked";
            }
          } else if (record?.inTime && !record?.outTime) {
            attendanceStatus = "Work from Home - Incomplete";
          } else {
            attendanceStatus = "Work from Home - Not Marked";
          }
        } else {
          attendanceStatus = "Leave";
        }
      } else if (record?.inTime) {
        if (record?.outTime) {
          // Calculate working hours
          const [inHour, inMin] = record.inTime.split(":").map(Number);
          const [outHour, outMin] = record.outTime.split(":").map(Number);
          
          // Simple calculation (doesn't account for overnight shifts)
          workingHours = (outHour - inHour) + (outMin - inMin) / 60;
          if (workingHours < 0) workingHours += 24; // Handle overnight shifts
          
          // Subtract break times if any
          if (record.breaks && record.breaks.length > 0) {
            record.breaks.forEach(breakPeriod => {
              if (breakPeriod.start && breakPeriod.end) {
                const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                
                let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                if (breakHours < 0) breakHours += 24;
                
                workingHours -= breakHours;
              }
            });
          }
          
          // Determine status based on working hours
          if (workingHours >= 8) {
            attendanceStatus = workingHours > 8 ? "Present + Overtime" : "Present";
          } else if (workingHours >= 4) {
            attendanceStatus = "Half-Day";
          } else {
            attendanceStatus = "Absent";
          }
        } else {
          // Only in-time is marked, no out-time
          attendanceStatus = "Incomplete";
        }
      } else {
        // No attendance record - check if date has passed
        const today = new Date();
        const currentDateObj = new Date(currentDate);
        
        // If the date has passed and no attendance record exists, mark as Absent
        if (currentDateObj < today && !hasApprovedLeave) {
          attendanceStatus = "Absent";
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
        breaks: record?.breaks || [],
        status: attendanceStatus,
        workingHours: workingHours.toFixed(2)
      });
    }

    res.status(200).json(monthlyData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching monthly attendance", error: error.message });
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
      // Calculate working hours if both in and out times are available
      let workingHours = 0;
      let attendanceStatus = "Not Yet";
      
      // Check if there's a leave request approved for this date
      const leaveCheck = await Leave.findOne({
        employeeId: employee._id,
        startDate: { $lte: new Date(currentDate) },
        endDate: { $gte: new Date(currentDate) },
        status: "Approved"
      });
      const hasApprovedLeave = !!leaveCheck;
      
      if (hasApprovedLeave) {
        // Check if it's work from home leave
        if (leaveCheck.leaveType === "Work from Home") {
          // For work from home, also check time conditions if attendance record exists
          if (record?.inTime && record?.outTime) {
            // Calculate working hours for WFH
            const [inHour, inMin] = record.inTime.split(":").map(Number);
            const [outHour, outMin] = record.outTime.split(":").map(Number);
            
            workingHours = (outHour - inHour) + (outMin - inMin) / 60;
            if (workingHours < 0) workingHours += 24;
            
            // Subtract break times if any
            if (record.breaks && record.breaks.length > 0) {
              record.breaks.forEach(breakPeriod => {
                if (breakPeriod.start && breakPeriod.end) {
                  const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                  const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                  
                  let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                  if (breakHours < 0) breakHours += 24;
                  
                  workingHours -= breakHours;
                }
              });
            }
            
            // Combine WFH with time-based status
            if (workingHours >= 8) {
              attendanceStatus = workingHours > 8 ? "Work from Home + Overtime" : "Work from Home - Present";
            } else if (workingHours >= 4) {
              attendanceStatus = "Work from Home - Half Day";
            } else if (workingHours > 0) {
              attendanceStatus = "Work from Home - Incomplete";
            } else {
              attendanceStatus = "Work from Home - Not Marked";
            }
          } else if (record?.inTime && !record?.outTime) {
            attendanceStatus = "Work from Home - Incomplete";
          } else {
            attendanceStatus = "Work from Home - Not Marked";
          }
        } else {
          attendanceStatus = "Leave";
        }
      } else if (record?.inTime) {
        if (record?.outTime) {
          // Calculate working hours
          const [inHour, inMin] = record.inTime.split(":").map(Number);
          const [outHour, outMin] = record.outTime.split(":").map(Number);
          
          // Simple calculation (doesn't account for overnight shifts)
          workingHours = (outHour - inHour) + (outMin - inMin) / 60;
          if (workingHours < 0) workingHours += 24; // Handle overnight shifts
          
          // Subtract break times if any
          if (record.breaks && record.breaks.length > 0) {
            record.breaks.forEach(breakPeriod => {
              if (breakPeriod.start && breakPeriod.end) {
                const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                
                let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                if (breakHours < 0) breakHours += 24;
                
                workingHours -= breakHours;
              }
            });
          }
          
          // Determine status based on working hours
          if (workingHours >= 8) {
            attendanceStatus = workingHours > 8 ? "Present + Overtime" : "Present";
          } else if (workingHours >= 4) {
            attendanceStatus = "Half-Day";
          } else {
            attendanceStatus = "Absent";
          }
        } else {
          // Only in-time is marked, no out-time
          attendanceStatus = "Incomplete";
        }
      } else {
        // No attendance record - check if date has passed
        const today = new Date();
        const currentDateObj = new Date(currentDate);
        
        // If the date has passed and no attendance record exists, mark as Absent
        if (currentDateObj < today && !hasApprovedLeave) {
          attendanceStatus = "Absent";
        }
      }
     
      // The Half Day logic is now handled in the working hours calculation above
      // No need for the previous logic that was based only on in-time
     
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
        breaks: record?.breaks || [],
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
        
        // Check if there's a leave request approved for this date
        const leaveCheck = await Leave.findOne({
          employeeId: emp._id,
          startDate: { $lte: new Date(date) },
          endDate: { $gte: new Date(date) },
          status: "Approved"
        });
        const hasApprovedLeave = !!leaveCheck;
        
        let workingHours = 0;
        let attendanceStatus = "Absent";
        
        if (hasApprovedLeave) {
          // Check if it's work from home leave
          if (leaveCheck.leaveType === "Work from Home") {
            // For work from home, also check time conditions if attendance record exists
            if (record?.inTime && record?.outTime) {
              // Calculate working hours for WFH
              const [inHour, inMin] = record.inTime.split(":").map(Number);
              const [outHour, outMin] = record.outTime.split(":").map(Number);
              
              workingHours = (outHour - inHour) + (outMin - inMin) / 60;
              if (workingHours < 0) workingHours += 24;
              
              // Subtract break times if any
              if (record.breaks && record.breaks.length > 0) {
                record.breaks.forEach(breakPeriod => {
                  if (breakPeriod.start && breakPeriod.end) {
                    const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                    const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                    
                    let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                    if (breakHours < 0) breakHours += 24;
                    
                    workingHours -= breakHours;
                  }
                });
              }
              
              // Combine WFH with time-based status
              if (workingHours >= 8) {
                attendanceStatus = workingHours > 8 ? "Work from Home + Overtime" : "Work from Home - Present";
              } else if (workingHours >= 4) {
                attendanceStatus = "Work from Home - Half Day";
              } else if (workingHours > 0) {
                attendanceStatus = "Work from Home - Incomplete";
              } else {
                attendanceStatus = "Work from Home - Not Marked";
              }
            } else if (record?.inTime && !record?.outTime) {
              attendanceStatus = "Work from Home - Incomplete";
            } else {
              attendanceStatus = "Work from Home - Not Marked";
            }
          } else {
            attendanceStatus = "Leave";
          }
        } else if (record?.inTime) {
          if (record?.outTime) {
            // Calculate working hours
            const [inHour, inMin] = record.inTime.split(":").map(Number);
            const [outHour, outMin] = record.outTime.split(":").map(Number);
            
            // Simple calculation (doesn't account for overnight shifts)
            workingHours = (outHour - inHour) + (outMin - inMin) / 60;
            if (workingHours < 0) workingHours += 24; // Handle overnight shifts
            
            // Subtract break times if any
            if (record.breaks && record.breaks.length > 0) {
              record.breaks.forEach(breakPeriod => {
                if (breakPeriod.start && breakPeriod.end) {
                  const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                  const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                  
                  let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                  if (breakHours < 0) breakHours += 24;
                  
                  workingHours -= breakHours;
                }
              });
            }
            
            // Determine status based on working hours
            if (workingHours >= 8) {
              attendanceStatus = workingHours > 8 ? "Present + Overtime" : "Present";
            } else if (workingHours >= 4) {
              attendanceStatus = "Half-Day";
            } else {
              attendanceStatus = "Absent";
            }
          } else {
            // Only in-time is marked, no out-time
            attendanceStatus = "Incomplete";
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
          breaks: record?.breaks || [],
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
      { header: "Breaks", key: "breaks", width: 30 },
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
      // Calculate working hours if both in and out times are available
      let workingHours = 0;
      let attendanceStatus = "Absent";
      
      // Check if there's a leave request approved for this date
      const leaveCheck = await Leave.findOne({
        employeeId: employee._id,
        startDate: { $lte: new Date(currentDate) },
        endDate: { $gte: new Date(currentDate) },
        status: "Approved"
      });
      const hasApprovedLeave = !!leaveCheck;
      
      if (hasApprovedLeave) {
        // Check if it's work from home leave
        if (leaveCheck.leaveType === "Work from Home") {
          // For work from home, also check time conditions if attendance record exists
          if (record?.inTime && record?.outTime) {
            // Calculate working hours for WFH
            const [inHour, inMin] = record.inTime.split(":").map(Number);
            const [outHour, outMin] = record.outTime.split(":").map(Number);
            
            workingHours = (outHour - inHour) + (outMin - inMin) / 60;
            if (workingHours < 0) workingHours += 24;
            
            // Subtract break times if any
            if (record.breaks && record.breaks.length > 0) {
              record.breaks.forEach(breakPeriod => {
                if (breakPeriod.start && breakPeriod.end) {
                  const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                  const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                  
                  let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                  if (breakHours < 0) breakHours += 24;
                  
                  workingHours -= breakHours;
                }
              });
            }
            
            // Combine WFH with time-based status
            if (workingHours >= 8) {
              attendanceStatus = workingHours > 8 ? "Work from Home + Overtime" : "Work from Home - Present";
            } else if (workingHours >= 4) {
              attendanceStatus = "Work from Home - Half Day";
            } else if (workingHours > 0) {
              attendanceStatus = "Work from Home - Incomplete";
            } else {
              attendanceStatus = "Work from Home - Not Marked";
            }
          } else if (record?.inTime && !record?.outTime) {
            attendanceStatus = "Work from Home - Incomplete";
          } else {
            attendanceStatus = "Work from Home - Not Marked";
          }
        } else {
          attendanceStatus = "Leave";
        }
      } else if (record?.inTime) {
        if (record?.outTime) {
          // Calculate working hours
          const [inHour, inMin] = record.inTime.split(":").map(Number);
          const [outHour, outMin] = record.outTime.split(":").map(Number);
          
          // Simple calculation (doesn't account for overnight shifts)
          workingHours = (outHour - inHour) + (outMin - inMin) / 60;
          if (workingHours < 0) workingHours += 24; // Handle overnight shifts
          
          // Subtract break times if any
          if (record.breaks && record.breaks.length > 0) {
            record.breaks.forEach(breakPeriod => {
              if (breakPeriod.start && breakPeriod.end) {
                const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                
                let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                if (breakHours < 0) breakHours += 24;
                
                workingHours -= breakHours;
              }
            });
          }
          
          // Determine status based on working hours
          if (workingHours >= 8) {
            attendanceStatus = workingHours > 8 ? "Present + Overtime" : "Present";
          } else if (workingHours >= 4) {
            attendanceStatus = "Half-Day";
          } else {
            attendanceStatus = "Absent";
          }
        } else {
          // Only in-time is marked, no out-time
          attendanceStatus = "Incomplete";
        }
      }
     
      // Filter by status if provided
      if (status && status !== "All" && attendanceStatus !== status) {
        continue;
      }
     
      const breaksText = record?.breaks?.length > 0 
        ? record.breaks.map((b, idx) => `Break ${idx + 1}: ${b.start} - ${b.end || 'Ongoing'}`).join('; ')
        : 'No breaks';
      
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
        breaks: breaksText,
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
 
 
