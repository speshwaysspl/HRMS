import axios from "axios";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaUser, FaIdCard, FaEnvelope, FaCalendarAlt, FaPhone, FaBriefcase, FaBuilding, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaEdit } from "react-icons/fa";
import { API_BASE } from "../../utils/apiConfig";
import { formatDMY } from "../../utils/dateUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

const View = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/employees/${id}`, [id]);
  useMeta({
    title: employee?.userId?.name ? `${employee.userId.name} — Employee` : 'Employee — Speshway HRMS',
    description: employee?.designation ? `${employee.designation} in ${employee?.department?.dep_name || ''}` : 'Employee profile and details.',
    keywords: 'employee profile, HRMS',
    image: '/images/Logo.jpg',
    url: canonical,
    robots: 'noindex,nofollow'
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const responnse = await axios.get(
          `${API_BASE}/api/employee/${id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        if (responnse.data.success) {
          setEmployee(responnse.data.employee);
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
            <LoadingState message="Please wait while we fetch the employee information..." />
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
            <ErrorState
              title="Employee Not Found"
              message="The requested employee could not be found."
              onRetry={() => navigate('/admin-dashboard/employees')}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-surface-muted p-4 md:p-6'>
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin-dashboard/employees')}
            className="flex items-center gap-2 text-ink-muted hover:text-accent-600 transition-colors duration-150 mb-4"
          >
            <FaArrowLeft className="text-sm" />
            <span className="font-medium">Back to Employees</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-ink">
                Employee Profile
              </h1>
              <p className="text-ink-muted mt-2">Comprehensive employee information and details</p>
            </div>
            <button
              onClick={() => navigate(`/admin-dashboard/employees/edit/${id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors font-medium"
            >
              <FaEdit className="text-sm" />
              Edit Employee
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-card border border-surface-subtle overflow-hidden">
          {/* Header Card */}
          <div className="bg-brand-800 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                <FaUser className="text-2xl text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">
                  {employee.userId.name}
                </h2>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-brand-100/90">
                  <span className="flex items-center gap-2">
                    <FaIdCard className="text-sm" />
                    ID: {employee.employeeId}
                  </span>
                  <span className="flex items-center gap-2">
                    <FaBriefcase className="text-sm" />
                    {employee.designation}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-ink mb-4 pb-2 border-b border-surface-subtle">
                  Personal Information
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-surface-muted rounded-lg">
                    <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
                      <FaEnvelope className="text-brand-700 text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-muted mb-1">Email Address</p>
                      <p className="text-ink font-semibold break-all">{employee.userId.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-surface-muted rounded-lg">
                    <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
                      <FaPhone className="text-brand-700 text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-muted mb-1">Mobile Number</p>
                      <p className="text-ink font-semibold">{employee.mobilenumber}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-surface-muted rounded-lg">
                    <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
                      <FaCalendarAlt className="text-brand-700 text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-muted mb-1">Date of Birth</p>
                      <p className="text-ink font-semibold">
                        {formatDMY(employee.dob)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-ink mb-4 pb-2 border-b border-surface-subtle">
                  Professional Information
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-surface-muted rounded-lg">
                    <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
                      <FaBuilding className="text-brand-700 text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-muted mb-1">Department</p>
                      <p className="text-ink font-semibold">{employee.department.dep_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-surface-muted rounded-lg">
                    <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
                      <FaBriefcase className="text-brand-700 text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-muted mb-1">Designation</p>
                      <p className="text-ink font-semibold">{employee.designation}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-surface-muted rounded-lg">
                    <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
                      <FaCalendarAlt className="text-brand-700 text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-muted mb-1">Joining Date</p>
                      <p className="text-ink font-semibold">
                        {employee.joiningDate
                          ? formatDMY(employee.joiningDate)
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-surface-muted rounded-lg">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      employee.status === 'active'
                        ? 'bg-accent-100'
                        : 'bg-red-100'
                    }`}>
                      {employee.status === 'active' ? (
                        <FaCheckCircle className="text-accent-700 text-sm" />
                      ) : (
                        <FaTimesCircle className="text-red-700 text-sm" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-muted mb-1">Employment Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.status === 'active'
                          ? 'bg-accent-100 text-accent-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {employee.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default View;
