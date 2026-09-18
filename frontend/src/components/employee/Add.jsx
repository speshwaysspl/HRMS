import React, { useEffect, useState } from "react";
import { FiEye, FiEyeOff, FiUser, FiBriefcase, FiLock, FiUserCheck, FiHeadphones } from "react-icons/fi";
import { fetchDepartments } from "../../utils/EmployeeHelper";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";
import { DESIGNATIONS } from "../../utils/constants";

const Add = () => {
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({ role: ['employee'] });
  const [designationSearch, setDesignationSearch] = useState('');
  const [showDesignationSuggestions, setShowDesignationSuggestions] = useState(false);
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate()

  // All available designations organized by technology/domain
  const allDesignations = DESIGNATIONS;

  useEffect(() => {
    const getDepartments = async () => {
      const departments = await fetchDepartments();
      setDepartments(departments);
    };
    getDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "mobilenumber") {
      // Only allow digits and limit to 10 characters
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setFormData((prevData) => ({ ...prevData, [name]: numericValue }));
      }
    } else if (name === "designation") {
      setDesignationSearch(value);
      setFormData((prevData) => ({ ...prevData, [name]: value }));
      
      // Filter designations based on search input
      if (value.trim()) {
        const filtered = allDesignations.filter(designation =>
          designation.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredDesignations(filtered);
        setShowDesignationSuggestions(true);
      } else {
        setFilteredDesignations([]);
        setShowDesignationSuggestions(false);
      }
    } else if (name === "role") {
      const { checked, value } = e.target;
      setFormData((prevData) => {
        let newRoles = [...prevData.role];
        if (checked) {
          if (!newRoles.includes(value)) newRoles.push(value);
        } else {
          newRoles = newRoles.filter(r => r !== value);
        }
        return { ...prevData, role: newRoles };
      });
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate mobile number before submission
    if (!formData.mobilenumber || formData.mobilenumber.length !== 10) {
      alert("Mobile number must be exactly 10 digits");
      return;
    }

    // Validate Date of Birth
    if (formData.dob) {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      if (dobDate > today) {
        alert("Date of Birth cannot be in the future");
        return;
      }
    }

    // Validate Joining Date (future allowed)

    try {
      const response = await axios.post(
        `${API_BASE}/api/employee/add`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.success) {
        navigate("/admin-dashboard/employees");
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        alert(error.response.data.error);
      }
    }
      
  };

  const inputClass = "mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent";

  const roleOptions = [
    { value: "team_lead", label: "Team Lead", description: "Can manage a team and assign tasks", icon: FiUserCheck },
    { value: "hr", label: "HR", description: "Can manage recruitment and onboarding", icon: FiHeadphones },
  ];

  const toggleAdditionalRole = (value) => {
    setFormData((prevData) => {
      const has = prevData.role.includes(value);
      const newRoles = has ? prevData.role.filter((r) => r !== value) : [...prevData.role, value];
      return { ...prevData, role: newRoles };
    });
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-xl shadow-card border border-surface-subtle">
      <h2 className="text-xl md:text-2xl font-semibold mb-6 text-ink">Add New Employee</h2>
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
        {/* Personal Information */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-700 uppercase tracking-wide mb-4">
            <FiUser /> Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-ink">Name</label>
              <input type="text" name="name" onChange={handleChange} placeholder="Insert Name" className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Email</label>
              <input type="email" name="email" onChange={handleChange} placeholder="Insert Email" className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Mobile Number</label>
              <input
                type="text"
                name="mobilenumber"
                value={formData.mobilenumber || ''}
                onChange={handleChange}
                placeholder="Mobile Number (10 digits)"
                className={inputClass}
                pattern="[0-9]{10}"
                maxLength="10"
                title="Please enter exactly 10 digits"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Date of Birth</label>
              <input type="date" name="dob" onChange={handleChange} max={new Date().toISOString().split('T')[0]} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Gender</label>
              <select name="gender" onChange={handleChange} className={inputClass} required>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="pt-6 border-t border-surface-subtle">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-700 uppercase tracking-wide mb-4">
            <FiBriefcase /> Employment Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-ink">Employee ID</label>
              <input type="text" name="employeeId" onChange={handleChange} placeholder="Employee ID" className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Joining Date</label>
              <input type="date" name="joiningDate" onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Annual CTC / Salary Package (₹)</label>
              <input
                type="number"
                name="salaryPackage"
                min="0"
                value={formData.salaryPackage || ''}
                onChange={handleChange}
                placeholder="e.g. 600000"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Department</label>
              <select name="department" onChange={handleChange} className={inputClass} required>
                <option value="">Select Department</option>
                {departments.map((dep) => (
                  <option key={dep._id} value={dep._id}>{dep.dep_name}</option>
                ))}
              </select>
            </div>
            <div className="relative sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-ink">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation || ''}
                onChange={handleChange}
                onFocus={() => {
                  if (designationSearch.trim()) setShowDesignationSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowDesignationSuggestions(false), 200)}
                placeholder="Search or type designation..."
                className={inputClass}
                required
              />
              {showDesignationSuggestions && filteredDesignations.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-surface-subtle rounded-lg shadow-panel max-h-60 overflow-y-auto">
                  {filteredDesignations.slice(0, 10).map((designation, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-surface-muted cursor-pointer text-sm text-ink"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFormData((prevData) => ({ ...prevData, designation }));
                        setDesignationSearch(designation);
                        setShowDesignationSuggestions(false);
                      }}
                    >
                      {designation}
                    </div>
                  ))}
                  {filteredDesignations.length > 10 && (
                    <div className="px-3 py-2 text-xs text-ink-muted border-t border-surface-subtle">
                      Showing first 10 results. Keep typing to narrow down...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Access */}
        <div className="pt-6 border-t border-surface-subtle">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-700 uppercase tracking-wide mb-4">
            <FiLock /> Account Access
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-ink h-5 leading-5">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password || ''}
                  onChange={handleChange}
                  placeholder="******"
                  autoComplete="new-password"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  className={`${inputClass} mt-0 pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Additional Roles */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink h-5 leading-5">Additional Access</label>
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                {roleOptions.map(({ value, label, description, icon: Icon }) => {
                  const active = formData.role.includes(value);
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => toggleAdditionalRole(value)}
                      aria-pressed={active}
                      className={`flex-1 flex items-start gap-3 text-left p-3.5 rounded-lg border transition-colors ${
                        active
                          ? "border-accent-500 bg-accent-50"
                          : "border-surface-subtle bg-white hover:bg-surface-muted"
                      }`}
                    >
                      <span className={`w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center ${active ? "bg-accent-600 text-white" : "bg-surface-muted text-ink-muted"}`}>
                        <Icon size={16} />
                      </span>
                      <span>
                        <span className={`block text-sm font-semibold ${active ? "text-accent-800" : "text-ink"}`}>{label}</span>
                        <span className="block text-xs text-ink-muted mt-0.5">{description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink-faint mt-2">Every account is an Employee by default; toggle any additional access above.</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto sm:px-10 bg-accent-600 hover:bg-accent-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
        >
          Add Employee
        </button>
      </form>
    </div>
  );
};

export default Add;
