import Department from "../models/Department.js";
import Employee from "../models/Employee.js"
import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import Salary from "../models/Salary.js";
import Notification from "../models/Notification.js";
import { toISTDateString } from "../utils/dateTimeUtils.js";
import Team from "../models/Team.js";
import TeamAttendance from "../models/TeamAttendance.js";
import Task from "../models/Task.js";
import Milestone from "../models/Milestone.js";
import AttendanceRegularization from "../models/AttendanceRegularization.js";
import Event from "../models/Event.js";
import Announcement from "../models/Announcement.js";
import TeamReport from "../models/TeamReport.js";

const IST_MS = 5.5 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

// What needs the admin's attention today, plus team work progress.
const buildTodayOverview = async () => {
    const now = new Date();
    const today = toISTDateString(now);
    const nowIst = new Date(now.getTime() + IST_MS);
    const dayStart = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - IST_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const weekEnd = new Date(dayStart.getTime() + 7 * DAY_MS);
    const monthAgo = new Date(dayStart.getTime() - 30 * DAY_MS);

    const [
        activeEmployees, checkedIn, onLeave, pendingRegularizations,
        teams, markedTeams, taskStatus, overdueTasks, rated,
        openMilestones, dueSoonMilestones, events, employeesWithDob, announcements, reports,
    ] = await Promise.all([
        Employee.countDocuments({ status: { $ne: "inactive" } }),
        Attendance.countDocuments({ date: today, inTime: { $nin: [null, ""] } }),
        Leave.countDocuments({ status: "Approved", startDate: { $lt: dayEnd }, endDate: { $gte: dayStart } }),
        AttendanceRegularization.countDocuments({ status: "Pending" }),
        Team.find({ "members.0": { $exists: true } }).select("name leadId").populate("leadId", "name").lean(),
        TeamAttendance.find({ date: today }).select("teamId").lean(),
        Task.aggregate([{ $match: { isDeleted: { $ne: true } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        Task.countDocuments({ isDeleted: { $ne: true }, status: { $nin: ["Completed", "Not Completed"] }, deadline: { $lt: dayStart } }),
        Task.aggregate([
            { $match: { isDeleted: { $ne: true }, rating: { $gte: 1 }, updatedAt: { $gte: monthAgo } } },
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]),
        Milestone.countDocuments({ state: "open" }),
        Milestone.find({ state: "open", dueDate: { $gte: dayStart, $lt: weekEnd } })
            .select("title dueDate teamId").populate("teamId", "name").sort({ dueDate: 1 }).limit(5).lean(),
        Event.find({ date: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 30 * DAY_MS) } })
            .select("title date type").sort({ date: 1 }).limit(15).lean(),
        Employee.find({ dob: { $ne: null }, status: { $ne: "inactive" } }).select("dob userId").populate("userId", "name").lean(),
        Announcement.find({ published: { $ne: false } })
            .select("title category publishedAt createdAt").sort({ publishedAt: -1, createdAt: -1 }).limit(3).lean(),
        TeamReport.find({ createdAt: { $gte: new Date(dayStart.getTime() - 6 * DAY_MS) } })
            .sort({ createdAt: -1 }).populate("teamId", "name").populate("generatedBy", "name").lean(),
    ]);

    // Latest PDF per team in the last 7 days.
    const reportByTeam = new Map();
    for (const r of reports) {
        if (r.teamId && !reportByTeam.has(String(r.teamId._id))) reportByTeam.set(String(r.teamId._id), r);
    }

    const marked = new Set(markedTeams.map((r) => String(r.teamId)));
    const notMarked = teams
        .filter((t) => !marked.has(String(t._id)))
        .map((t) => ({ _id: t._id, name: t.name, lead: t.leadId?.name || null }));

    // Birthdays in the next 7 days (IST calendar days).
    const birthdays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(nowIst.getTime() + i * DAY_MS);
        const m = d.getUTCMonth(), day = d.getUTCDate();
        for (const e of employeesWithDob) {
            const dob = new Date(new Date(e.dob).getTime() + IST_MS);
            if (dob.getUTCMonth() === m && dob.getUTCDate() === day) {
                birthdays.push({ name: e.userId?.name || "Employee", inDays: i });
            }
        }
    }

    const byStatus = Object.fromEntries(taskStatus.map((t) => [t._id, t.count]));
    return {
        today: {
            date: today,
            activeEmployees,
            checkedIn,
            onLeave,
            notCheckedIn: Math.max(activeEmployees - checkedIn - onLeave, 0),
        },
        pending: { regularizations: pendingRegularizations },
        teamAttendance: { total: teams.length, marked: teams.length - notMarked.length, notMarked },
        work: {
            openMilestones,
            dueSoon: dueSoonMilestones.filter((m) => m.teamId).map((m) => ({ _id: m._id, title: m.title, dueDate: m.dueDate, teamId: m.teamId?._id, team: m.teamId?.name || "" })),
            tasks: {
                assigned: byStatus["Assigned"] || 0,
                inProgress: (byStatus["In Progress"] || 0) + (byStatus["Review"] || 0),
                completed: byStatus["Completed"] || 0,
                notCompleted: (byStatus["Not Completed"] || 0) + (byStatus["Overdue"] || 0),
            },
            overdue: overdueTasks,
            avgRating: rated[0] ? Math.round(rated[0].avg * 10) / 10 : null,
            ratedCount: rated[0]?.count || 0,
            reports: {
                teamsTotal: teams.length,
                generated: [...reportByTeam.values()].map((r) => ({
                    teamId: r.teamId._id, team: r.teamId.name, title: r.title, taskCount: r.taskCount,
                    by: r.generatedBy?.name || "", at: r.createdAt,
                })),
                notGenerated: teams.filter((t) => !reportByTeam.has(String(t._id))).map((t) => ({ _id: t._id, name: t.name, lead: t.leadId?.name || null })),
            },
        },
        upcoming: {
            // Same title on the same day is one event (calendar has duplicates).
            events: [...new Map(events.map((e) => [`${e.title}|${toISTDateString(new Date(e.date))}`, e])).values()]
                .slice(0, 5).map((e) => ({ title: e.title, date: e.date, type: e.type })),
            birthdays: birthdays.slice(0, 8),
        },
        recentAnnouncements: announcements.map((a) => ({ _id: a._id, title: a.title, category: a.category, date: a.publishedAt || a.createdAt })),
    };
};

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

        const departmentBreakdownRaw = await Employee.aggregate([
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
            { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
        ]);
        const departmentBreakdown = departmentBreakdownRaw.map(d => ({
            department: d.dept?.dep_name || "Unassigned",
            count: d.count,
        }));

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        const startStr = thirtyDaysAgo.toISOString().split('T')[0];
        const attendanceTrendRaw = await Attendance.aggregate([
            { $match: { date: { $gte: startStr } } },
            {
                $group: {
                    _id: "$date",
                    present: { $sum: { $cond: [{ $ifNull: ["$inTime", false] }, 1, 0] } },
                }
            },
            { $sort: { _id: 1 } }
        ]);
        const attendanceTrend = attendanceTrendRaw.map(d => ({ date: d._id, present: d.present }));
        const overview = await buildTodayOverview();

        return res.status(200).json({
            success: true,
            totalEmployees,
            totalDepartments,
            totalSalary: totalSalaries[0]?.totalSalary || 0,
            leaveSummary,
            departmentBreakdown,
            attendanceTrend,
            ...overview,
        })
    }catch(error) {
        console.log(error.message)
        return res.status(500).json({success: false, error: "dashboard summary error"})
    }
}

const getEmployeeDashboardStats = async (req, res) => {
    try {
        // Get employee from authenticated user
        const employee = await Employee.findOne({ userId: req.user._id })
            .populate('userId', 'name email')
            .populate('department', 'dep_name');
        if (!employee) {
            return res.status(404).json({ success: false, error: "Employee profile not found" });
        }

        const today = toISTDateString(new Date());
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
                // Calculate working hours using plain check-in to check-out span matching web AttendanceReport
                const [inHour, inMin] = todayAttendance.inTime.split(":").map(Number);
                const [outHour, outMin] = todayAttendance.outTime.split(":").map(Number);
                
                workingHours = (outHour - inHour) + (outMin - inMin) / 60;
                if (workingHours < 0) workingHours += 24; // Handle overnight shifts
                
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
                    name: employee.userId?.name || employee.name,
                    employeeId: employee.employeeId,
                    designation: employee.designation,
                    department: employee.department?.dep_name || ""
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