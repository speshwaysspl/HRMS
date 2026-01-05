import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";

// Pages
import Login from "./pages/Login";
import Home from "./pages/Home";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Unauthorized = () => <div className="flex h-screen justify-center items-center text-2xl font-bold text-red-600">Unauthorized Access</div>;
const NotFound = () => <div className="flex h-screen justify-center items-center text-2xl font-bold text-gray-600">404 - Page Not Found</div>;

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));
const TeamLeadDashboard = lazy(() => import("./pages/TeamLeadDashboard"));

// Utils
import PrivateRoutes from "./utils/PrivateRoutes";
import RoleBaseRoutes from "./utils/RoleBaseRoutes";

// Team & Task Components (lazy-loaded)
const TeamList = lazy(() => import("./components/team/TeamList"));
const CreateTeam = lazy(() => import("./components/team/CreateTeam"));
const TeamDetail = lazy(() => import("./components/team/TeamDetail"));
const TaskList = lazy(() => import("./components/task/TaskList"));
 
// Admin Components (lazy-loaded)
const AdminSummary = lazy(() => import("./components/dashboard/AdminSummary"));
const DepartmentList = lazy(() => import("./components/department/DepartmentList"));
const AddDepartment = lazy(() => import("./components/department/AddDepartment"));
const EditDepartment = lazy(() => import("./components/department/EditDepartment"));
const List = lazy(() => import("./components/employee/List"));
const Add = lazy(() => import("./components/employee/Add"));
const View = lazy(() => import("./components/employee/View"));
const Edit = lazy(() => import("./components/employee/Edit"));

const ViewSalary = lazy(() => import("./components/salary/View"));
const PayslipGenerator = lazy(() => import("./components/salary/PayslipGenerator"));
const PayrollTemplateManager = lazy(() => import("./components/salary/PayrollTemplateManager"));
const PayslipHistory = lazy(() => import("./components/salary/PayslipHistory"));
const Table = lazy(() => import("./components/leave/Table"));
const Detail = lazy(() => import("./components/leave/Detail"));
const AnnouncementList = lazy(() => import("./components/announcements/AnnouncementList"));
const AnnouncementView = lazy(() => import("./components/announcements/AnnouncementView"));
const AnnouncementAdd = lazy(() => import("./components/announcements/AnnouncementAdd"));
const EditAnnouncement = lazy(() => import("./components/announcements/EditAnnouncement"));
const AdminAttendanceReport = lazy(() => import("./components/attendance/AdminAttendanceReport"));
const AdminFeedback = lazy(() => import("./components/feedback/AdminFeedback"));
const AdminCalendar = lazy(() => import("./components/calendar/AdminCalendar"));
const AdminDailyQuote = lazy(() => import("./components/dailyQuote/AdminDailyQuote"));

// Employee Components (lazy-loaded)
const Summary = lazy(() => import("./components/EmployeeDashboard/Summary"));
const Profile = lazy(() => import("./components/EmployeeDashboard/Profile"));
const LeaveList = lazy(() => import("./components/leave/List"));
const AddLeave = lazy(() => import("./components/leave/Add"));
const Setting = lazy(() => import("./components/EmployeeDashboard/Setting"));
const EmployeeAnnouncements = lazy(() => import("./components/employee/EmployeeAnnouncements"));
const EmployeeAnnouncementDetails = lazy(() => import("./components/employee/AnnouncementDetails"));
const Attendance = lazy(() => import("./components/EmployeeDashboard/Attendance"));
const AttendanceReport = lazy(() => import("./components/EmployeeDashboard/AttendanceReport"));
const EmployeeFeedback = lazy(() => import("./components/feedback/EmployeeFeedback"));
const EmployeeCalendar = lazy(() => import("./components/calendar/EmployeeCalendar"));
const DocumentUpload = lazy(() => import("./components/employee/DocumentUpload"));
const DocumentList = lazy(() => import("./components/employee/DocumentList"));

function App() {
  // Preload most-visited routes after idle to reduce navigation latency
  useEffect(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => {
      // Warm up chunks for dashboards and summaries
      import("./pages/AdminDashboard");
      import("./pages/EmployeeDashboard");
      import("./components/dashboard/AdminSummary");
      import("./components/EmployeeDashboard/Summary");
      import("./components/EmployeeDashboard/AttendanceReport");
    });
    return () => cancel(id);
  }, []);
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-center text-gray-600">Loading...</div>}>
      <Routes>
        {/* Home Page */}
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms-and-conditions" element={<Terms />} />
        <Route path="/privacy-policy" element={<Privacy />} />
        <Route path="/terms" element={<Navigate to="/terms-and-conditions" replace />} />
        <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
 
        {/* Auth Routes */}
        <Route path="login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />}></Route>
        <Route path="/reset-password/:token" element={<ResetPassword />}></Route>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />

       
 
        {/* Admin Dashboard */}
        <Route
          path="admin-dashboard"
          element={
            <PrivateRoutes>
              <RoleBaseRoutes requiredRole={["admin"]}>
                <AdminDashboard />
              </RoleBaseRoutes>
            </PrivateRoutes>
          }
        >
          <Route index element={<AdminSummary />} />
 
          {/* Departments */}
          <Route path="departments" element={<DepartmentList />} />
          <Route path="add-department" element={<AddDepartment />} />
          <Route path="department/:id" element={<EditDepartment />} />
 
          {/* Employees */}
          <Route path="employees" element={<List />} />
          <Route path="add-employee" element={<Add />} />
          <Route path="employees/:id" element={<View />} />
          <Route path="employees/edit/:id" element={<Edit />} />
          <Route path="employees/salary/:id" element={<ViewSalary />} />
          <Route path="salary" element={<ViewSalary />} />

          <Route path="salary/payslip-generator" element={<PayslipGenerator />} />
          <Route path="salary/template-manager" element={<PayrollTemplateManager />} />
          <Route path="salary/payslip-history" element={<PayslipHistory />} />
 
          {/* Leaves */}
          <Route path="leaves" element={<Table />} />
          <Route path="leaves/:id" element={<Detail />} />
          <Route path="employees/leaves/:id" element={<LeaveList />} />
 
          {/* Settings */}
          <Route path="setting" element={<Setting />} />
 
          {/* Announcements */}
          <Route path="announcements" element={<AnnouncementList />} />
          <Route path="announcements/:id" element={<AnnouncementView />} />
          <Route path="announcements/add" element={<AnnouncementAdd />} />
          <Route path="announcements/edit/:id" element={<EditAnnouncement />} />
 
          {/* Attendance Report */}
          <Route path="attendance-report" element={<AdminAttendanceReport />} />
 
          {/* Feedback */}
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="daily-quote" element={<AdminDailyQuote />} />
          
          {/* Teams */}
          <Route path="teams" element={<TeamList />} />
          <Route path="create-team" element={<CreateTeam />} />
          <Route path="team/:id" element={<TeamDetail />} />
          <Route path="documents" element={<DocumentList />} />
        </Route>
 
        {/* Team Lead Dashboard */}
        <Route
          path="team-lead-dashboard"
          element={
            <PrivateRoutes>
              <RoleBaseRoutes requiredRole={["team_lead"]}>
                <TeamLeadDashboard />
              </RoleBaseRoutes>
            </PrivateRoutes>
          }
        >
          <Route index element={<TeamList />} />
          <Route path="teams" element={<TeamList />} />
           <Route path="team/:id" element={<TeamDetail />} />
          <Route path="tasks" element={<TaskList />} />
        </Route>

        {/* Employee Dashboard */}
        <Route
          path="employee-dashboard"
          element={
            <PrivateRoutes>
              <RoleBaseRoutes requiredRole={["admin", "employee"]}>
                <EmployeeDashboard />
              </RoleBaseRoutes>
            </PrivateRoutes>
          }
        >
          <Route index element={<Summary />} />
 
          {/* Profile */}
          <Route path="profile/:id" element={<Profile />} />
 
          {/* Leaves */}
          <Route path="leaves/:id" element={<LeaveList />} />
          <Route path="add-leave" element={<AddLeave />} />
 
          {/* Salary */}
          <Route path="salary/:id" element={<ViewSalary />} />
 
          {/* Settings */}
          <Route path="setting" element={<Setting />} />
 
          {/* Announcements */}
          <Route path="announcements" element={<EmployeeAnnouncements />} />
          <Route path="announcements/:id" element={<EmployeeAnnouncementDetails />} />
 
          {/* Attendance */}
          <Route path="attendance" element={<Attendance />} />
          <Route path="attendance-report" element={<AttendanceReport />} />
          <Route path="feedback" element={<EmployeeFeedback />} />
          <Route path="calendar" element={<EmployeeCalendar />} />
          <Route path="documents" element={<DocumentList />} />
          <Route path="tasks" element={<TaskList />} />
        </Route>
 
        {/* Fallback */}
        <Route
          path="*"
          element={<div className="p-8 text-center">Page Not Found</div>}
        />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
 
export default App;
