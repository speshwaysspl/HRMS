import React, { useEffect, useState, useMemo } from "react";
import {
  FaBuilding,
  FaCheckCircle,
  FaFileAlt,
  FaHourglassHalf,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { API_BASE } from "../../utils/apiConfig";
import { getAdminDailyMessage } from "../../utils/greetingUtils";
import useMeta from "../../utils/useMeta";
import EmptyState from "../common/EmptyState";
import LoadingState from "../common/LoadingState";

const LEAVE_STATUS_COLORS = { Approved: "#337038", Pending: "#c9a227", Rejected: "#dc2626" };

const StatCard = ({ icon, text, number, tint, onClick }) => (
  <button
    onClick={onClick}
    className="text-left bg-white border border-surface-subtle rounded-xl p-4 md:p-5 flex items-center gap-4 hover:border-brand-200 hover:shadow-card transition-all duration-150"
  >
    <div className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg text-lg ${tint}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-ink-muted text-xs font-medium uppercase tracking-wide truncate">{text}</p>
      <h2 className="text-xl md:text-2xl font-semibold text-ink tabular-nums">{number}</h2>
    </div>
  </button>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white border border-surface-subtle rounded-xl p-4 md:p-5">
    <h4 className="text-sm font-semibold text-ink mb-4">{title}</h4>
    {children}
  </div>
);

const AdminSummary = () => {
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();
  useMeta({
    title: "Admin Overview — Speshway HRMS",
    description: "Quick stats across employees, departments and leaves.",
    keywords: "admin overview, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/admin-dashboard`
  });

  const today = useMemo(
    () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    []
  );
  const dailyQuote = useMemo(() => getAdminDailyMessage(), []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const summary = await axios.get(
          `${API_BASE}/api/dashboard/summary`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        setSummary(summary.data);
      } catch (error) {
        if (error.response) {
          alert(error.response.data.error);
        }
      }
    };
    fetchSummary();
  }, []);

  if (!summary) {
    return <LoadingState message="Loading dashboard overview…" />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-5 mb-5 border-b border-surface-subtle">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-ink">Dashboard Overview</h1>
          <p className="text-sm text-ink-muted mt-0.5">{dailyQuote}</p>
        </div>
        <p className="text-sm text-ink-faint whitespace-nowrap">{today}</p>
      </div>

      {/* Workforce */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-3">Workforce</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            icon={<FaUsers className="text-brand-700" />}
            text="Total Employees"
            number={summary.totalEmployees}
            tint="bg-brand-50"
            onClick={() => navigate('/admin-dashboard/employees')}
          />
          <StatCard
            icon={<FaBuilding className="text-brand-700" />}
            text="Departments"
            number={summary.totalDepartments}
            tint="bg-brand-50"
            onClick={() => navigate('/admin-dashboard/departments')}
          />
        </div>
      </section>

      {/* Leave Overview */}
      <section className="mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-3">Leave Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            icon={<FaFileAlt className="text-brand-700" />}
            text="Leave Applied"
            number={summary.leaveSummary.appliedFor}
            tint="bg-brand-50"
            onClick={() => navigate('/admin-dashboard/leaves?status=All')}
          />
          <StatCard
            icon={<FaCheckCircle className="text-accent-700" />}
            text="Approved"
            number={summary.leaveSummary.approved}
            tint="bg-accent-50"
            onClick={() => navigate('/admin-dashboard/leaves?status=Approved')}
          />
          <StatCard
            icon={<FaHourglassHalf className="text-amber-700" />}
            text="Pending"
            number={summary.leaveSummary.pending}
            tint="bg-amber-50"
            onClick={() => navigate('/admin-dashboard/leaves?status=Pending')}
          />
          <StatCard
            icon={<FaTimesCircle className="text-red-700" />}
            text="Rejected"
            number={summary.leaveSummary.rejected}
            tint="bg-red-50"
            onClick={() => navigate('/admin-dashboard/leaves?status=Rejected')}
          />
        </div>
      </section>

      {/* Analytics */}
      <section className="mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-3">Analytics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Headcount by Department">
            {summary.departmentBreakdown && summary.departmentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={summary.departmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
                  <XAxis dataKey="department" tick={{ fontSize: 12, fill: "#5b6376" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5b6376" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#eef0f6", fontSize: 13 }} />
                  <Bar dataKey="count" fill="#2c3968" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No department data" message="Add employees to departments to see this chart." />
            )}
          </ChartCard>

          <ChartCard title="Leave Status Breakdown">
            {summary.leaveSummary && (summary.leaveSummary.approved || summary.leaveSummary.pending || summary.leaveSummary.rejected) ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Approved", value: summary.leaveSummary.approved },
                      { name: "Pending", value: summary.leaveSummary.pending },
                      { name: "Rejected", value: summary.leaveSummary.rejected },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {["Approved", "Pending", "Rejected"].map((status) => (
                      <Cell key={status} fill={LEAVE_STATUS_COLORS[status]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#eef0f6", fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No leave data" message="Leave requests will show up here once submitted." />
            )}
          </ChartCard>

          <div className="lg:col-span-2">
            <ChartCard title="Attendance Trend (Last 30 Days)">
              {summary.attendanceTrend && summary.attendanceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={summary.attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5b6376" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5b6376" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#eef0f6", fontSize: 13 }} />
                    <Line type="monotone" dataKey="present" stroke="#337038" strokeWidth={2} dot={false} name="Present" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No attendance data yet" message="Attendance trend will appear once check-ins are recorded." />
              )}
            </ChartCard>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminSummary;
