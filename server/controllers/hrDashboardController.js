import Candidate from "../models/Candidate.js";
import Offer from "../models/Offer.js";
import Employee from "../models/Employee.js";
import Document from "../models/Document.js";
import Department from "../models/Department.js";
import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import Salary from "../models/Salary.js";
import User from "../models/User.js";
import ExcelJS from "exceljs";

// Aggregated Command Center Summary
export const getHRDashboardSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    
    // Start & End of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 1. KPI COUNTS
    const totalCandidates = await Candidate.countDocuments();
    const selectedCandidates = await Candidate.countDocuments({ status: "Selected" });
    const pendingOnboarding = await Candidate.countDocuments({ status: "Pre-Onboarding" });
    const pendingVerification = await Document.countDocuments({ candidateId: { $ne: null }, status: "Pending" });
    const offersSent = await Offer.countDocuments({ status: "Sent" });
    const offersAccepted = await Offer.countDocuments({ status: "Accepted" });
    const offersRejected = await Offer.countDocuments({ status: "Rejected" });
    const activeEmployees = await Employee.countDocuments({ status: "active" });

    // Probation employees: active status and joining date within past 6 months (180 days)
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const employeesOnProbation = await Employee.countDocuments({
      status: "active",
      joiningDate: { $gte: sixMonthsAgo }
    });

    const newEmployeesThisMonth = await Employee.countDocuments({
      joiningDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // 2. RECRUITMENT FUNNEL & CHART DATA
    const funnelStages = ["Applied", "Screening", "Interview Scheduled", "Interview Completed", "Selected", "Offer Sent", "Offer Accepted", "Employee Created"];
    const funnelData = await Promise.all(
      funnelStages.map(async (stage) => {
        const count = await Candidate.countDocuments({ status: stage });
        return { stage, count };
      })
    );

    // Monthly Hiring Trend (last 6 months)
    const monthlyHiringTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthName = d.toLocaleString("default", { month: "short" });
      const count = await Employee.countDocuments({ joiningDate: { $gte: start, $lte: end } });
      monthlyHiringTrend.push({ month: monthName, count });
    }

    // Department-wise hiring
    const deptWiseHiringRaw = await Employee.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } }
    ]);
    const deptWiseHiring = await Promise.all(
      deptWiseHiringRaw.map(async (item) => {
        if (!item._id) return { department: "Unassigned", count: item.count };
        const dept = await Department.findById(item._id);
        return { department: dept ? dept.dep_name : "General", count: item.count };
      })
    );

    // Candidate Status Pie Chart
    const candidateStatusBreakdown = await Promise.all(
      ["Applied", "Screening", "Interview Scheduled", "Selected", "Pre-Onboarding", "Offer Accepted"].map(async (status) => {
        const count = await Candidate.countDocuments({ status });
        return { name: status, value: count };
      })
    );

    // 3. PENDING ACTIONS WIDGET
    const documentsPending = await Document.find({ candidateId: { $ne: null }, status: "Pending" })
      .populate("candidateId", "fullName position candidateId")
      .limit(5);

    const conversionsPending = await Candidate.find({ status: "Offer Accepted" })
      .populate("department", "dep_name")
      .limit(5);

    const offersPending = await Offer.find({ status: "Pending" })
      .populate("candidateId", "fullName candidateId position")
      .limit(5);

    const incompleteProfiles = await Candidate.find({
      status: "Pre-Onboarding",
      profileCompletionPercentage: { $lt: 100 }
    }).limit(5);

    // 4. JOINING TRACKER
    const joinTodayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const joinTodayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const joiningTodayList = await Offer.find({
      joiningDate: { $gte: joinTodayStart, $lte: joinTodayEnd }
    }).populate("candidateId", "fullName candidateId email position");

    const joiningThisWeekList = await Offer.find({
      joiningDate: { $gte: joinTodayStart, $lte: sevenDaysFromNow }
    }).populate("candidateId", "fullName candidateId email position");

    const joiningThisMonthList = await Offer.find({
      joiningDate: { $gte: joinTodayStart, $lte: thirtyDaysFromNow }
    }).populate("candidateId", "fullName candidateId email position");

    // 5. ATTENDANCE OVERVIEW
    const presentToday = await Attendance.countDocuments({ date: today });
    const lateEmployees = await Attendance.countDocuments({
      date: today,
      inTime: { $gt: "09:30" }
    });
    const wfhEmployees = await Attendance.countDocuments({
      date: today,
      workMode: "home"
    });

    const activeEmpCount = await Employee.countDocuments({ status: "active" });
    const absentToday = Math.max(0, activeEmpCount - presentToday);

    // 6. LEAVE SUMMARY
    const pendingLeaves = await Leave.countDocuments({ status: "Pending" });
    const approvedLeaves = await Leave.countDocuments({ status: "Approved" });
    const rejectedLeaves = await Leave.countDocuments({ status: "Rejected" });

    // 7. PAYROLL OVERVIEW (for current month)
    const currentMonthName = now.toLocaleString("default", { month: "long" });
    const currentYear = now.getFullYear();

    const payrollProcessed = await Salary.countDocuments({
      month: currentMonthName,
      year: currentYear
    });
    const payrollPending = Math.max(0, activeEmpCount - payrollProcessed);

    // 8. CALENDAR EVENTS (Onboardings only)
    const onboardingCandidates = await Candidate.find({
      expectedJoiningDate: { $ne: null }
    }).select("fullName position expectedJoiningDate");

    const calendarEvents = onboardingCandidates.map(c => ({
      title: c.position ? `${c.fullName} - ${c.position}` : c.fullName,
      start: c.expectedJoiningDate,
      type: "onboarding",
      color: "#6366f1",
      candidateId: c._id
    }));

    return res.status(200).json({
      success: true,
      kpis: {
        totalCandidates,
        selectedCandidates,
        pendingOnboarding,
        pendingVerification,
        offersSent,
        offersAccepted,
        offersRejected,
        activeEmployees,
        employeesOnProbation,
        newEmployeesThisMonth
      },
      recruitment: {
        funnelData,
        monthlyHiringTrend,
        deptWiseHiring,
        candidateStatusBreakdown
      },
      pendingActions: {
        documentsPending,
        conversionsPending,
        offersPending,
        incompleteProfiles
      },
      joiningTracker: {
        joiningToday: joiningTodayList.length,
        joiningThisWeek: joiningThisWeekList.length,
        joiningThisMonth: joiningThisMonthList.length,
        joiningTodayList,
        joiningThisWeekList,
        joiningThisMonthList
      },
      attendance: {
        presentToday,
        absentToday,
        lateEmployees,
        wfhEmployees
      },
      leaves: {
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves
      },
      payroll: {
        payrollProcessed,
        payrollPending,
        month: currentMonthName,
        year: currentYear
      },
      calendarEvents
    });
  } catch (error) {
    console.error("HR Command Center stats error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching dashboard summary stats" });
  }
};

// Export HRMS Reports
export const exportHRDashboardReport = async (req, res) => {
  try {
    const { reportType } = req.query; // recruitment, candidates, employees, offers, verifications
    const workbook = new ExcelJS.Workbook();
    
    if (reportType === "recruitment" || reportType === "candidates") {
      const candidates = await Candidate.find().populate("department", "dep_name");
      const sheet = workbook.addWorksheet("Candidates Report");
      sheet.columns = [
        { header: "Candidate ID", key: "candidateId", width: 15 },
        { header: "Name", key: "fullName", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Mobile", key: "mobileNumber", width: 18 },
        { header: "Position", key: "position", width: 20 },
        { header: "Department", key: "department", width: 20 },
        { header: "Status", key: "status", width: 15 },
        { header: "Experience", key: "experience", width: 15 },
        { header: "Expected Joining", key: "expectedJoiningDate", width: 18 }
      ];

      candidates.forEach((c) => {
        sheet.addRow({
          candidateId: c.candidateId,
          fullName: c.fullName,
          email: c.email,
          mobileNumber: c.mobileNumber,
          position: c.position,
          department: c.department?.dep_name || "General",
          status: c.status,
          experience: c.experience || "-",
          expectedJoiningDate: c.expectedJoiningDate ? new Date(c.expectedJoiningDate).toLocaleDateString() : "-"
        });
      });

    } else if (reportType === "offers") {
      const offers = await Offer.find().populate("candidateId", "fullName candidateId").populate("department", "dep_name");
      const sheet = workbook.addWorksheet("Offers Report");
      sheet.columns = [
        { header: "Candidate ID", key: "candidateId", width: 15 },
        { header: "Candidate Name", key: "candidateName", width: 25 },
        { header: "Designation", key: "designation", width: 20 },
        { header: "Department", key: "department", width: 20 },
        { header: "CTC (INR)", key: "salaryPackage", width: 15 },
        { header: "Joining Date", key: "joiningDate", width: 18 },
        { header: "Work Location", key: "workLocation", width: 20 },
        { header: "Status", key: "status", width: 15 }
      ];

      offers.forEach((o) => {
        sheet.addRow({
          candidateId: o.candidateId?.candidateId || "-",
          candidateName: o.candidateId?.fullName || "-",
          designation: o.designation,
          department: o.department?.dep_name || "General",
          salaryPackage: o.salaryPackage,
          joiningDate: new Date(o.joiningDate).toLocaleDateString(),
          workLocation: o.workLocation,
          status: o.status
        });
      });

    } else {
      // Employees Report (default fallback)
      const employees = await Employee.find().populate("userId", "name email").populate("department", "dep_name");
      const sheet = workbook.addWorksheet("Employees Report");
      sheet.columns = [
        { header: "Employee ID", key: "employeeId", width: 15 },
        { header: "Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Department", key: "department", width: 20 },
        { header: "Designation", key: "designation", width: 20 },
        { header: "Joining Date", key: "joiningDate", width: 18 },
        { header: "Status", key: "status", width: 12 }
      ];

      employees.forEach((e) => {
        sheet.addRow({
          employeeId: e.employeeId,
          name: e.userId?.name || "-",
          email: e.userId?.email || "-",
          department: e.department?.dep_name || "General",
          designation: e.designation || "-",
          joiningDate: e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : "-",
          status: e.status
        });
      });
    }

    res.setHeader("Content-Disposition", `attachment; filename="HRMS_${reportType || "Hiring"}_Report.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export report error:", error);
    return res.status(500).json({ success: false, error: "Server error generating report file" });
  }
};
