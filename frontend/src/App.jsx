import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
 
// Pages
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
 
// Utils
import PrivateRoutes from "./utils/PrivateRoutes";
import RoleBaseRoutes from "./utils/RoleBaseRoutes";
 
// Admin Components
import AdminSummary from "./components/dashboard/AdminSummary";
import DepartmentList from "./components/department/DepartmentList";
import AddDepartment from "./components/department/AddDepartment";
import EditDepartment from "./components/department/EditDepartment";
import List from "./components/employee/List";
import Add from "./components/employee/Add";
import View from "./components/employee/View";
import Edit from "./components/employee/Edit";

import ViewSalary from "./components/salary/View";
import PayslipGenerator from "./components/salary/PayslipGenerator";
import PayrollTemplateManager from "./components/salary/PayrollTemplateManager";
import PayslipHistory from "./components/salary/PayslipHistory";
import Table from "./components/leave/Table";
import Detail from "./components/leave/Detail";
import AnnouncementList from "./components/announcements/AnnouncementList";
import AnnouncementView from "./components/announcements/AnnouncementView";
import AnnouncementAdd from "./components/announcements/AnnouncementAdd";
import EditAnnouncement from "./components/announcements/EditAnnouncement";
import AdminAttendanceReport from "./components/attendance/AdminAttendanceReport";
 
// Employee Components
import Summary from "./components/EmployeeDashboard/Summary";
import LeaveList from "./components/leave/List";
import AddLeave from "./components/leave/Add";
import Setting from "./components/EmployeeDashboard/Setting";
import EmployeeAnnouncements from "./components/employee/EmployeeAnnouncements";
import EmployeeAnnouncementDetails from "./components/employee/AnnouncementDetails";
import Attendance from "./components/EmployeeDashboard/Attendance";
import AttendanceReport from "./components/EmployeeDashboard/AttendanceReport";
 
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root */}
        <Route path="/" element={<Navigate to="/admin-dashboard" replace />} />
 
        {/* Auth Routes */}
        <Route path="login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />}></Route>
        <Route path="/reset-password/:token" element={<ResetPassword />}></Route>

       
 
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
          <Route path="profile/:id" element={<View />} />
 
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
        </Route>
 
        {/* Fallback */}
        <Route
          path="*"
          element={<div className="p-8 text-center">Page Not Found</div>}
        />
      </Routes>
    </BrowserRouter>
  );
}
 
export default App;