import React, { useEffect, useState } from "react";
import { fetchDepartments } from "../../utils/EmployeeHelper";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";
import { DESIGNATIONS } from "../../utils/constants";
import { FiEye, FiEyeOff } from "react-icons/fi";
import LoadingState from "../common/LoadingState";

const Edit = () => {
  const [employee, setEmployee] = useState({
    name: "",
    email: "",
    employeeId: "",
    dob: "",
    joiningDate: "",
    gender: "",
    mobilenumber: "",
    designation: "",
    department: "",
    bankname: "",
    bankaccountnumber: "",
    pan: "",
    uan: "",
    location: "Hyderabad",
    salary: "",
    annualSalary: "",
    pf: "",
    reportsTo: "",
    salaryPackage: "",
  });
  const [departments, setDepartments] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [designationSearch, setDesignationSearch] = useState("");
  const [showDesignationSuggestions, setShowDesignationSuggestions] = useState(false);
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  const allDesignations = DESIGNATIONS;

  useEffect(() => {
    const getDepartments = async () => {
      const departments = await fetchDepartments();
      setDepartments(departments);
    };
    getDepartments();
  }, []);

  useEffect(() => {
    const getAllEmployees = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/employee`, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        });
        if (response.data.success) {
          setAllEmployees(response.data.employees || []);
        }
      } catch (error) {
        console.error("Failed to load employees for manager list", error);
      }
    };
    getAllEmployees();
  }, []);

  useEffect(() => {
    const fetchEmployee = async () => {
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
          const employee = responnse.data.employee;
          setEmployee((prev) => ({
            ...prev,
            name: employee.userId.name,
            email: employee.userId.email,
            employeeId: employee.employeeId,
            dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : "",
            joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : "",
            gender: employee.gender || "",
            mobilenumber: employee.mobilenumber,
            designation: employee.designation,
            department: employee.department?._id || employee.department || "",
            role: employee.userId.role,
            bankname: employee.bankname || "",
            bankaccountnumber: employee.bankaccountnumber || "",
            pan: employee.pan || "",
            uan: employee.uan || "",
            location: employee.location || "Hyderabad",
            salary: employee.fullSalary || "",
            annualSalary: employee.fullSalary ? String(Math.round(parseFloat(employee.fullSalary) * 12)) : "",
            pf: employee.pf !== undefined && employee.pf !== 0 ? String(employee.pf) : "",
            reportsTo: employee.reportsTo?._id || employee.reportsTo || "",
            salaryPackage: employee.salaryPackage != null ? String(employee.salaryPackage) : "",
          }));
          // Initialize designation search with existing value
          setDesignationSearch(employee.designation || "");
        }
      } catch (error) {
        if (error.response && !error.response.data.success) {
          alert(error.response.data.error);
        }
      }
    };

    fetchEmployee();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "salary") {
      const annual = value ? String(Math.round(parseFloat(value) * 12)) : "";
      let calculatedPf = "";
      if (value) {
        const fullSalary = parseFloat(value);
        if (fullSalary > 2850) {
          const remaining = fullSalary - 2850;
          const basicSalary = parseFloat((remaining * 0.40).toFixed(2));
          calculatedPf = String(Math.round(basicSalary * 0.24));
        } else {
          calculatedPf = String(Math.round(fullSalary * 0.24));
        }
      }
      setEmployee((prevData) => ({ ...prevData, salary: value, annualSalary: annual, pf: calculatedPf }));
    } else if (name === "annualSalary") {
      const monthly = value ? String(parseFloat((parseFloat(value) / 12).toFixed(2))) : "";
      let calculatedPf = "";
      if (monthly) {
        const fullSalary = parseFloat(monthly);
        if (fullSalary > 2850) {
          const remaining = fullSalary - 2850;
          const basicSalary = parseFloat((remaining * 0.40).toFixed(2));
          calculatedPf = String(Math.round(basicSalary * 0.24));
        } else {
          calculatedPf = String(Math.round(fullSalary * 0.24));
        }
      }
      setEmployee((prevData) => ({ ...prevData, annualSalary: value, salary: monthly, pf: calculatedPf }));
    } else if (name === "mobilenumber") {
      // Only allow digits and limit to 10 characters
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setEmployee((prevData) => ({ ...prevData, [name]: numericValue }));
      }
    } else if (name === "designation") {
      setEmployee((prevData) => ({ ...prevData, [name]: value }));
      setDesignationSearch(value);
      
      if (value.trim()) {
        const filtered = allDesignations.filter(designation =>
          designation.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 10); // Limit to 10 suggestions for performance
        setFilteredDesignations(filtered);
        setShowDesignationSuggestions(true);
      } else {
        setFilteredDesignations(allDesignations.slice(0, 10));
        setShowDesignationSuggestions(true);
      }
    } else if (name === "role") {
      const { checked, value } = e.target;
      setEmployee((prevData) => {
        let newRoles = Array.isArray(prevData.role) ? [...prevData.role] : [prevData.role];
        if (checked) {
          if (!newRoles.includes(value)) newRoles.push(value);
        } else {
          newRoles = newRoles.filter(r => r !== value);
        }
        return { ...prevData, role: newRoles };
      });
    } else {
      setEmployee((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  const handleDesignationSelect = (designation) => {
    setEmployee((prevData) => ({ ...prevData, designation }));
    setDesignationSearch(designation);
    setShowDesignationSuggestions(false);
    setFilteredDesignations([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate mobile number before submission
    if (!employee.mobilenumber || employee.mobilenumber.length !== 10) {
      alert("Mobile number must be exactly 10 digits");
      return;
    }

    // Validate Date of Birth
    if (employee.dob) {
      const dobDate = new Date(employee.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dobDate > today) {
        alert("Date of Birth cannot be in the future");
        return;
      }
    }

    // Validate Joining Date (future allowed)

    // Filter out null values, but allow empty strings for clearing optional fields, and default empty pf to "0"
    const cleanedEmployee = Object.keys(employee).reduce((acc, key) => {
      if (key === "pf") {
        acc[key] = employee[key] === "" ? "0" : employee[key];
      } else if (key === "password" && employee[key] === "") {
        // Do not update password if left blank
      } else if (employee[key] !== null) {
        acc[key] = employee[key];
      }
      return acc;
    }, {});

    try {
      const response = await axios.put(
        `${API_BASE}/api/employee/${id}`,
        cleanedEmployee,
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

  return (
    <>
      {departments && employee ? (
        <div className="max-w-4xl mx-auto mt-4 md:mt-10 bg-white p-4 md:p-8 rounded-xl shadow-card border border-surface-subtle">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-center text-ink">Edit Employee</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={employee.name}
                  onChange={handleChange}
                  placeholder="Insert Name"
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={employee.email}
                  onChange={handleChange}
                  placeholder="Insert Email"
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Employee ID
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={employee.employeeId}
                  onChange={handleChange}
                  placeholder="Employee ID"
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={employee.dob}
                  onChange={handleChange}
                  placeholder="DOB"
                  max={new Date().toISOString().split('T')[0]}
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={employee.joiningDate}
                  onChange={handleChange}
                  placeholder="Joining Date"
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Annual CTC / Salary Package */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Annual CTC / Salary Package (₹)
                </label>
                <input
                  type="number"
                  name="salaryPackage"
                  min="0"
                  value={employee.salaryPackage}
                  onChange={handleChange}
                  placeholder="e.g. 600000"
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Gender
                </label>
                <select
                  name="gender"
                  value={employee.gender}
                  onChange={handleChange}
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Mobile Number
                </label>
                <input
                  type="text"
                  name="mobilenumber"
                  value={employee.mobilenumber || ''}
                  onChange={handleChange}
                  placeholder="Mobile Number (10 digits)"
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  title="Please enter exactly 10 digits"
                  required
                />
              </div>

              {/* Designation */}
              <div className="relative">
                <label className="block text-sm font-medium text-ink">
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  value={designationSearch}
                  onChange={handleChange}
                  onFocus={() => {
                    if (designationSearch.trim()) {
                      const filtered = allDesignations.filter(designation =>
                        designation.toLowerCase().includes(designationSearch.toLowerCase())
                      ).slice(0, 10);
                      setFilteredDesignations(filtered);
                      setShowDesignationSuggestions(true);
                    } else {
                      // Show all designations when field is empty
                      setFilteredDesignations(allDesignations.slice(0, 10));
                      setShowDesignationSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow for selection
                    setTimeout(() => setShowDesignationSuggestions(false), 200);
                  }}
                  placeholder="Search or type designation"
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  required
                />
                
                {/* Designation Suggestions Dropdown */}
                {showDesignationSuggestions && filteredDesignations.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-surface-subtle rounded-lg shadow-panel max-h-60 overflow-y-auto">
                    {filteredDesignations.map((designation, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 cursor-pointer hover:bg-surface-muted text-sm text-ink"
                        onMouseDown={() => handleDesignationSelect(designation)}
                      >
                        {designation}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Department
                </label>
                <select
                  name="department"
                  onChange={handleChange}
                  value={employee.department}
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dep) => (
                    <option key={dep._id} value={dep._id}>
                      {dep.dep_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reports To */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Reports To
                </label>
                <select
                  name="reportsTo"
                  value={employee.reportsTo}
                  onChange={handleChange}
                  className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                >
                  <option value="">No Manager</option>
                  {allEmployees
                    .filter((emp) => emp._id !== id)
                    .map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.userId?.name || emp.employeeId} ({emp.employeeId})
                      </option>
                    ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Role
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="role"
                      value="employee"
                      checked={Array.isArray(employee.role) ? employee.role.includes('employee') : employee.role === 'employee'}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-surface-subtle text-accent-600 focus:ring-accent-500"
                    />
                    <span className="ml-2 text-ink">Employee</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="role"
                      value="team_lead"
                      checked={Array.isArray(employee.role) ? employee.role.includes('team_lead') : employee.role === 'team_lead'}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-surface-subtle text-accent-600 focus:ring-accent-500"
                    />
                    <span className="ml-2 text-ink">Team Lead</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="role"
                      value="hr"
                      checked={Array.isArray(employee.role) ? employee.role.includes('hr') : employee.role === 'hr'}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-surface-subtle text-accent-600 focus:ring-accent-500"
                    />
                    <span className="ml-2 text-ink">HR</span>
                  </label>
                </div>
              </div>

              {/* Password */}
              <div className="relative">
                <label className="block text-sm font-medium text-ink">
                  Password (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    onChange={handleChange}
                    placeholder="Enter new password to reset"
                    className="mt-1 p-2.5 block w-full border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-muted hover:text-ink focus:outline-none"
                    style={{ top: '4px' }}
                  >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-ink-muted mt-1">Leave blank to keep current password</p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-6 bg-accent-600 hover:bg-accent-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              Save Employee
            </button>
          </form>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto mt-4 md:mt-10 bg-white p-4 md:p-8 rounded-xl shadow-card border border-surface-subtle">
          <LoadingState message="Loading employee details..." />
        </div>
      )}
    </>
  );
};

export default Edit;
