import axios from "axios";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { FaUser, FaIdCard, FaEnvelope, FaCalendarAlt, FaPhone, FaBriefcase, FaBuilding, FaCheckCircle, FaTimesCircle, FaShieldAlt, FaTrashAlt } from "react-icons/fa";
import { API_BASE } from "../../utils/apiConfig";
import { formatDMY } from "../../utils/dateUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const Profile = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const canonical = useMemo(() => `${window.location.origin}/employee-dashboard/profile/${id}`, [id]);
  useMeta({
    title: employee?.userId?.name ? `${employee.userId.name} — Profile` : 'My Profile — Speshway HRMS',
    description: 'View your personal details and employment information.',
    keywords: 'profile, HRMS',
    image: '/images/Logo.jpg',
    url: canonical,
    robots: 'noindex,nofollow'
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE}/api/employee/${id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          setEmployee(response.data.employee);
        }
      } catch (error) {
        if (error.response && !error.response.data.success) {
          alert(error.response.data.error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (loading) {
    return (
      <div className='min-h-screen bg-surface-muted p-4 md:p-6'>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-card border border-surface-subtle p-8 md:p-12">
            <LoadingState message="Loading your profile…" />
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className='min-h-screen bg-surface-muted p-4 md:p-6'>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-card border border-surface-subtle p-8 md:p-12">
            <EmptyState
              icon={FaTimesCircle}
              title="Profile Not Found"
              message="Your profile information could not be found."
            />
          </div>
        </div>
      </div>
    );
  }

  const isActive = employee.status === 'active';
  const personal = [
    { icon: FaEnvelope, bg: '#DBEAFE', fg: '#2563EB', label: 'Email Address', value: employee.userId.email, wrap: true },
    { icon: FaPhone, bg: '#DCFCE7', fg: '#16A34A', label: 'Mobile Number', value: employee.mobilenumber || 'Not provided' },
    { icon: FaCalendarAlt, bg: '#FFEDD5', fg: '#EA580C', label: 'Date of Birth', value: employee.dob ? formatDMY(employee.dob) : 'Not provided' },
    { icon: FaUser, bg: '#F3E8FF', fg: '#9333EA', label: 'Gender', value: employee.gender || 'Not specified' },
  ];
  const employment = [
    { icon: FaBuilding, bg: '#DBEAFE', fg: '#2563EB', label: 'Department', value: employee.department?.dep_name },
    { icon: FaBriefcase, bg: '#F3E8FF', fg: '#9333EA', label: 'Designation', value: employee.designation },
    { icon: FaCalendarAlt, bg: '#FFEDD5', fg: '#EA580C', label: 'Joining Date', value: employee.joiningDate ? formatDMY(employee.joiningDate) : 'Not provided' },
  ];

  const Section = ({ title, icon: Icon, bg, fg, rows }) => (
    <div className="bg-white rounded-2xl border border-surface-subtle p-4 md:p-5" style={{ boxShadow: '0 4px 12px rgba(28,35,68,0.06)' }}>
      <div className="flex items-center gap-2.5 pb-3 mb-1 border-b border-surface-subtle">
        <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: bg, color: fg }}>
          <Icon size={14} />
        </span>
        <h3 className="text-sm md:text-base font-bold text-ink">{title}</h3>
      </div>
      <div className="divide-y divide-surface-subtle">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-3">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: r.bg, color: r.fg }}>
              <r.icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">{r.label}</p>
              <p className={`text-sm font-semibold text-ink ${r.wrap ? 'break-all' : 'truncate'}`}>{r.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className='bg-surface-muted md:p-2'>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header card — same layout as the Flutter Profile screen (no avatar) */}
        <div className="rounded-2xl p-5 md:p-6 text-white bg-gradient-to-br from-brand-800 to-brand-900 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-extrabold truncate">{employee.userId.name}</h1>
              <p className="text-sm text-brand-200 mt-1 truncate">
                {employee.designation} · {employee.department?.dep_name}
              </p>
            </div>
            <span
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white border"
              style={{
                backgroundColor: isActive ? 'rgba(63,139,69,0.25)' : 'rgba(220,38,38,0.25)',
                borderColor: isActive ? '#5DA562' : '#DC2626',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? '#5DA562' : '#DC2626' }} />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold">
            <FaIdCard size={12} className="text-white/70" />
            ID: {employee.employeeId}
          </div>
        </div>

        <Section title="Personal Information" icon={FaUser} bg="#DBEAFE" fg="#2563EB" rows={personal} />
        <Section title="Employment Information" icon={FaBriefcase} bg="#F3E8FF" fg="#9333EA" rows={employment} />

        <div className="bg-white rounded-2xl border border-surface-subtle p-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              <FaShieldAlt size={14} />
            </span>
            <h2 className="text-sm font-bold text-ink">Account &amp; Privacy</h2>
          </div>
          <hr className="my-3 border-surface-subtle" />
          <p className="text-[13px] font-semibold text-ink">Request Account Deletion</p>
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">
            Submit a request to HR/Admin to verify your identity and delete your account.
          </p>
          <Link
            to="/delete-account"
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-[10px] border border-red-600 text-red-600 py-3 text-[13px] font-semibold hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
          >
            <FaTrashAlt size={13} /> Request Account Deletion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
