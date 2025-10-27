import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaUser, FaIdCard, FaEnvelope, FaCalendarAlt, FaPhone, FaBriefcase, FaBuilding, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { API_BASE } from "../../utils/apiConfig";
import { formatDMY } from "../../utils/dateUtils";

const Profile = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE}/api/employee/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
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
      <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6'>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-600 rounded-full animate-spin animation-delay-150"></div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Profile</h3>
                <p className="text-gray-500">Please wait while we fetch your information...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6'>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 text-center">
            <div className="text-red-500 mb-4">
              <FaTimesCircle className="mx-auto text-6xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Profile Not Found</h3>
            <p className="text-gray-500 mb-6">Your profile information could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6'>
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Times New Roman, serif' }}>
                My Profile
              </h1>
              <p className="text-gray-600 mt-2">Your personal information and details</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-teal-500 to-blue-500 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <FaUser className="text-3xl text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {employee.userId.name}
                </h2>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-white/90">
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
                <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-teal-500">
                  Personal Information
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <FaEnvelope className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Email Address</p>
                      <p className="text-gray-900 font-semibold break-all">{employee.userId.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <FaPhone className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Mobile Number</p>
                      <p className="text-gray-900 font-semibold">{employee.mobilenumber || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <FaCalendarAlt className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Date of Birth</p>
                      <p className="text-gray-900 font-semibold">
                        {employee.dob ? formatDMY(employee.dob) : 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <FaUser className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Gender</p>
                      <p className="text-gray-900 font-semibold">{employee.gender || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500">
                  Employment Information
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <FaBuilding className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Department</p>
                      <p className="text-gray-900 font-semibold">{employee.department.dep_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <FaBriefcase className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Designation</p>
                      <p className="text-gray-900 font-semibold">{employee.designation}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <FaCalendarAlt className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Joining Date</p>
                      <p className="text-gray-900 font-semibold">
                        {employee.joiningDate ? formatDMY(employee.joiningDate) : 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                      <FaCheckCircle className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Employment Status</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        employee.status === 'active' 
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
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

export default Profile;