import Department from "../models/Department.js";
import Employee from "../models/Employee.js"
import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import Salary from "../models/Salary.js";
import Notification from "../models/Notification.js";

const getSummary = async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments();

        const totalDepartments = await Department.countDocuments();

        const totalSalaries = await Employee.aggregate([
            {$group: {_id: null, totalSalary: {$sum : "$salary"}}}
        ])

        const employeeAppliedForLeave = await Leave.distinct('employeeId')

        const leaveStatus = await Leave.aggregate([
            {$group: {
                _id: "$status",
                count: {$sum: 1}
            }}
        ])

        const leaveSummary = {
            appliedFor: employeeAppliedForLeave.length,
            approved: leaveStatus.find(item => item._id === "Approved")?.count || 0,
            rejected: leaveStatus.find(item => item._id === "Rejected")?.count || 0,
            pending: leaveStatus.find(item => item._id === "Pending")?.count || 0,
        }

        return res.status(200).json({
            success: true,
            totalEmployees,
            totalDepartments,
            totalSalary: totalSalaries[0]?.totalSalary || 0,
            leaveSummary
        })
    }catch(error) {
        console.log(error.message)
        return res.status(500).json({success: false, error: "dashboard summary error"})
    }
}

const getEmployeeDashboardStats = async (req, res) => {
    try {
        // Get employee from authenticated user
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) {
            return res.status(404).json({ success: false, error: "Employee profile not found" });
        }

        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().toISOString().substring(0, 7);

        // 1. Today's Attendance Status
        const todayAttendance = await Attendance.findOne({ 
            userId: employee._id, 
            date: today 
        });

        let attendanceStatus = "Absent";
        let workingHours = 0;
        
        // Check if there's a leave request approved for this date
        const leaveCheck = await Leave.findOne({
            employeeId: employee._id,
            startDate: { $lte: new Date(today) },
            endDate: { $gte: new Date(today) },
            status: "Approved"
        });
        const hasApprovedLeave = !!leaveCheck;
        
        if (hasApprovedLeave) {
            attendanceStatus = "Leave";
        } else if (todayAttendance) {
            if (todayAttendance.inTime && todayAttendance.outTime) {
                // Calculate working hours using the same logic as attendance controller
                const [inHour, inMin] = todayAttendance.inTime.split(":").map(Number);
                const [outHour, outMin] = todayAttendance.outTime.split(":").map(Number);
                
                workingHours = (outHour - inHour) + (outMin - inMin) / 60;
                if (workingHours < 0) workingHours += 24; // Handle overnight shifts
                
                // Subtract break times if any
                if (todayAttendance.breaks && todayAttendance.breaks.length > 0) {
                    todayAttendance.breaks.forEach(breakPeriod => {
                        if (breakPeriod.start && breakPeriod.end) {
                            const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                            const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                            
                            let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                            if (breakHours < 0) breakHours += 24;
                            
                            workingHours -= breakHours;
                        }
                    });
                }
                
                // Round working hours
                workingHours = Math.round(workingHours * 100) / 100;
                
                // Determine status based on working hours
                if (workingHours >= 8) {
                    attendanceStatus = workingHours > 8 ? "Present + Overtime" : "Present";
                } else if (workingHours >= 4) {
                    attendanceStatus = "Half Day";
                } else {
                    attendanceStatus = "Absent";
                }
            } else if (todayAttendance.inTime) {
                // Only in-time is marked, no out-time
                attendanceStatus = "Checked In";
            }
        }

        // 2. Monthly Attendance Summary
        const [year, month] = currentMonth.split('-');
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const monthlyAttendance = await Attendance.find({
            userId: employee._id,
            date: { 
                $gte: startDate.toISOString().split('T')[0], 
                $lte: endDate.toISOString().split('T')[0] 
            }
        });

        // Get approved leaves for the month
        const monthlyLeaves = await Leave.find({
            employeeId: employee._id,
            status: "Approved",
            $or: [
                {
                    startDate: { 
                        $gte: startDate.toISOString().split('T')[0], 
                        $lte: endDate.toISOString().split('T')[0] 
                    }
                },
                {
                    endDate: { 
                        $gte: startDate.toISOString().split('T')[0], 
                        $lte: endDate.toISOString().split('T')[0] 
                    }
                },
                {
                    startDate: { $lte: startDate.toISOString().split('T')[0] },
                    endDate: { $gte: endDate.toISOString().split('T')[0] }
                }
            ]
        });

        // Create a set of leave dates for quick lookup
        const leaveDates = new Set();
        monthlyLeaves.forEach(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                leaveDates.add(d.toISOString().split('T')[0]);
            }
        });

        // Calculate detailed monthly statistics
        let presentDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let leaveDays = 0;
        let overtimeDays = 0;
        let notYetDays = 0;

        // Process each attendance record
        console.log('=== MONTHLY ATTENDANCE PROCESSING ===');
        console.log('Total monthly attendance records:', monthlyAttendance.length);
        
        monthlyAttendance.forEach(attendance => {
            const attendanceDate = attendance.date;
            console.log(`\nProcessing attendance for date: ${attendanceDate}`);
            console.log('InTime:', attendance.inTime, 'OutTime:', attendance.outTime);
            
            // Check if this date is a leave day
            if (leaveDates.has(attendanceDate)) {
                console.log('Date is a leave day, incrementing leaveDays');
                leaveDays++;
                return;
            }

            if (attendance.inTime && attendance.outTime) {
                // Calculate working hours
                const inTime = new Date(`${attendanceDate}T${attendance.inTime}`);
                const outTime = new Date(`${attendanceDate}T${attendance.outTime}`);
                let workingHours = (outTime - inTime) / (1000 * 60 * 60);
                
                console.log('InTime parsed:', inTime);
                console.log('OutTime parsed:', outTime);
                console.log('Raw working hours:', workingHours);

                // Subtract break time if available
                if (attendance.breakTime) {
                    const breakHours = attendance.breakTime / 60; // Convert minutes to hours
                    workingHours -= breakHours;
                    console.log('Break time subtracted:', breakHours, 'Final working hours:', workingHours);
                }

                // Round working hours
                workingHours = Math.round(workingHours * 100) / 100;
                console.log('Rounded working hours:', workingHours);

                // Determine status based on working hours
                if (workingHours >= 8) {
                    if (workingHours > 8) {
                        console.log('Marking as overtime day');
                        overtimeDays++;
                    } else {
                        console.log('Marking as present day');
                        presentDays++;
                    }
                } else if (workingHours >= 4) {
                    console.log('Marking as half day');
                    halfDays++;
                } else {
                    console.log('Marking as absent day (insufficient hours)');
                    absentDays++;
                }
            } else if (attendance.inTime) {
                // Only in-time marked, consider as incomplete/absent for monthly stats
                console.log('Only inTime marked, marking as absent');
                absentDays++;
            } else {
                // No attendance marked
                console.log('No attendance marked, marking as absent');
                absentDays++;
            }
        });

        // Calculate total working days and account for days not in attendance records
        const totalWorkingDays = endDate.getDate();
        const recordedDays = monthlyAttendance.length;
        const unrecordedDays = totalWorkingDays - recordedDays;
        
        console.log('\n=== UNRECORDED DAYS PROCESSING ===');
        console.log('Total working days in month:', totalWorkingDays);
        console.log('Recorded days:', recordedDays);
        console.log('Unrecorded days:', unrecordedDays);
        
        // Add unrecorded days as absent or not yet (unless they are leave days)
        const currentDate = new Date();
        console.log('Current date:', currentDate.toISOString().split('T')[0]);
        
        for (let day = 1; day <= totalWorkingDays; day++) {
            const checkDate = new Date(year, month - 1, day).toISOString().split('T')[0];
            const checkDateObj = new Date(checkDate);
            const hasRecord = monthlyAttendance.some(att => att.date === checkDate);
            
            console.log(`Day ${day} (${checkDate}): hasRecord=${hasRecord}, isLeave=${leaveDates.has(checkDate)}`);
            
            if (!hasRecord && !leaveDates.has(checkDate)) {
                if (checkDateObj < currentDate) {
                    // Past days without records are absent
                    console.log(`Adding day ${day} as absent (past day without record)`);
                    absentDays++;
                } else {
                    // Future days without records are not yet
                    console.log(`Adding day ${day} as not yet (future day)`);
                    notYetDays++;
                }
            }
        }

        // Calculate total present days (including overtime and half days for percentage)
        const totalPresentDays = presentDays + overtimeDays + halfDays;
        
        console.log('\n=== FINAL MONTHLY STATISTICS ===');
        console.log('Present days:', presentDays);
        console.log('Half days:', halfDays);
        console.log('Absent days:', absentDays);
        console.log('Leave days:', leaveDays);
        console.log('Overtime days:', overtimeDays);
        console.log('Not yet days:', notYetDays);
        console.log('Total present days (for percentage):', totalPresentDays);

        // 3. Leave Balance
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);

        const usedLeaves = await Leave.find({
            employeeId: employee._id,
            status: "Approved",
            startDate: { $gte: yearStart, $lte: yearEnd }
        });

        const totalUsedLeaveDays = usedLeaves.reduce((total, leave) => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return total + days;
        }, 0);

        const totalLeaveEntitlement = 24; // Standard leave entitlement
        const remainingLeaves = totalLeaveEntitlement - totalUsedLeaveDays;

        // 4. Pending Leave Requests
        const pendingLeaves = await Leave.countDocuments({
            employeeId: employee._id,
            status: "Pending"
        });

        // 5. Current Month Salary Info
        const currentSalary = await Salary.findOne({
            employeeId: employee._id,
            month: currentMonth
        });

        // 6. Notifications Count
        const unreadNotifications = await Notification.countDocuments({
            recipientId: req.user._id,
            isRead: false
        });

        // 7. Performance Metrics (based on attendance)
        const attendancePercentage = totalWorkingDays > 0 ? Math.round((totalPresentDays / totalWorkingDays) * 100) : 0;
        
        return res.status(200).json({
            success: true,
            data: {
                // Today's Status
                todayAttendance: {
                    status: attendanceStatus,
                    workingHours: workingHours,
                    inTime: todayAttendance?.inTime || null,
                    outTime: todayAttendance?.outTime || null
                },
                
                // Monthly Overview
                monthlyStats: {
                    presentDays: presentDays,
                    halfDays: halfDays,
                    absentDays: absentDays + leaveDays, // Combined absent days (actual absent + leaves)
                    leaveDays: leaveDays, // Keep separate for detailed tracking if needed
                    overtimeDays: overtimeDays,
                    notYetDays: notYetDays,
                    totalPresentDays: totalPresentDays,
                    totalWorkingDays: totalWorkingDays,
                    attendancePercentage: attendancePercentage,
                    month: currentMonth
                },
                
                // Leave Information
                leaveBalance: {
                    totalEntitlement: totalLeaveEntitlement,
                    usedLeaves: totalUsedLeaveDays,
                    remainingLeaves: Math.max(0, remainingLeaves),
                    pendingRequests: pendingLeaves
                },
                
                // Salary Information
                salary: {
                    currentMonth: currentMonth,
                    basicSalary: employee.salary || 0,
                    netSalary: currentSalary?.netSalary || null,
                    payslipGenerated: !!currentSalary
                },
                
                // Notifications
                notifications: {
                    unreadCount: unreadNotifications
                },
                
                // Employee Info
                employee: {
                    name: employee.name,
                    employeeId: employee.employeeId,
                    designation: employee.designation,
                    department: employee.department
                }
            }
        });

    } catch (error) {
        console.log("Employee dashboard stats error:", error.message);
        return res.status(500).json({ 
            success: false, 
            error: "Failed to fetch employee dashboard statistics" 
        });
    }
};

export {getSummary, getEmployeeDashboardStats}