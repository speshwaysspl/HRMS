// src/components/salary/PayslipGenerator.jsx
import React, { useEffect, useState } from "react";
import { fetchDepartments } from "../../utils/EmployeeHelper";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";
import PayslipPreview from "./PayslipPreview";

const BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
  "Punjab National Bank", "Bank of Baroda", "Yes Bank", "IndusInd Bank", "Union Bank of India",
  "Canara Bank", "Central Bank of India", "Bank of India", "Indian Bank", "Bank of Maharashtra",
  "UCO Bank", "Indian Overseas Bank", "Oriental Bank of Commerce", "Allahabad Bank", "Syndicate Bank",
  "Corporation Bank", "Dena Bank", "Andhra Bank", "Bharat Bank", "Central Bank of India",
  "Indian Bank", "Indian Overseas Bank", "Punjab & Sind Bank", "United Bank of India", "South Indian Bank",
  "Tamilnad Mercantile Bank", "Karur Vysya Bank", "Lakshmi Vilas Bank", "City Union Bank", "Federal Bank",
  "DCB Bank", "RBL Bank", "IDFC FIRST Bank", "Bandhan Bank", "AU Small Finance Bank", "ESAF Small Finance Bank",
  "Jana Small Finance Bank", "Equitas Small Finance Bank", "Suryoday Small Finance Bank", "Fincare Small Finance Bank"
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PayslipGenerator = () => {
  const [payslip, setPayslip] = useState({
    employeeId: "",
    employeeObjectId: "",
    name: "",
    joiningDate: "",
    designation: "",
    department: "",
    location: "",
    workingdays: "",
    lopDays: "",
    lopamount: "",
    bankname: "",
    bankaccountnumber: "",
    pan: "",
    uan: "",
    month: new Date().getMonth() + 1,
    monthName: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
    basicSalary: "",
    da: "",
    hra: "",
    conveyance: "",
    medicalallowances: "",
    specialallowances: "",
    allowances: "",
    deductions: "",
    pf: "",
    proftax: "",
    payDate: "", // Will be set to joining date when employee is selected
    autoCalculateLOP: false
  });

  const [departments, setDepartments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [bankSuggestions, setBankSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculatingWorkingDays, setCalculatingWorkingDays] = useState(false);
  const [calculations, setCalculations] = useState({
    totalEarnings: 0,
    totalDeductions: 0,
    netSalary: 0,
    lopAmount: 0
  });
  const [lopCalculation, setLopCalculation] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const deps = await fetchDepartments();
      setDepartments(deps || []);
    })();
  }, []);

  // Auto-fetch employee details when employee ID is entered
  const handleEmployeeIdChange = async (e) => {
    const empId = e.target.value;
    setPayslip(prev => ({ ...prev, employeeId: empId }));
    
    if (empId.length >= 3) { // Start fetching after 3 characters
      try {
        const response = await axios.get(`${API_BASE}/api/payslip/employee/${empId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        
        if (response.data.success) {
          // Log the entire response to understand its structure
          console.log("API Response:", response.data);
          
          const employee = response.data.employee;
          
          // Log the employee data to check available fields
          console.log("Employee data:", employee);
          console.log("Employee fields:", Object.keys(employee));
          
          // Get the joining date from the employee data
          console.log("Employee joining date:", employee.joiningDate);
          
          // Format the joining date if found in IST
          const formattedJoiningDate = employee.joiningDate ? toISTDateString(new Date(employee.joiningDate)) : "";
          
          // Alert if no joining date was found
          if (!formattedJoiningDate) {
            console.warn("No joining date found for employee ID:", payslip.employeeId);
            // You could show an alert to the user here if needed
          }
          
          setPayslip(prev => ({
            ...prev,
            employeeObjectId: employee._id,
            name: employee.name,
            designation: employee.designation,
            department: employee.department,
            joiningDate: formattedJoiningDate,
            payDate: formattedJoiningDate
          }));
          
          // Load employee templates
          if (employee.template) {
            setSelectedTemplate(employee.template);
            await loadTemplateData(employee.template);
          }
          
          // Get all templates for this employee
          const templatesResponse = await axios.get(`${API_BASE}/api/payroll-template/employee/${empId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          });
          
          if (templatesResponse.data.success) {
            setTemplates(templatesResponse.data.templates);
          }
        }
      } catch (error) {
        console.error("Error fetching employee details:", error);
        if (error.response && error.response.status === 404) {
          console.log("Employee not found. Please check the Employee ID. You can view valid Employee IDs in the Employee Management section.");
        }
      }
    }
  };

  // Load template data into form
  const loadTemplateData = async (template) => {
    // Calculate working days for current month/year
    const workingDays = await calculateWorkingDays(payslip.month, payslip.year, payslip.employeeId);
    
    setPayslip(prev => ({
      ...prev,
      location: template.location || "",
      bankname: template.bankname || "",
      bankaccountnumber: template.bankaccountnumber || "",
      pan: template.pan || "",
      uan: template.uan || "",
      basicSalary: template.basicSalary || "",
      da: template.da || "",
      hra: template.hra || "",
      conveyance: template.conveyance || "",
      medicalallowances: template.medicalallowances || "",
      specialallowances: template.specialallowances || "",
      allowances: template.allowances || "",
      deductions: template.deductions || "",
      pf: template.pf || "",
      proftax: template.proftax || "",
      workingdays: workingDays || 30
    }));
  };

  // Handle template selection
  const handleTemplateChange = async (e) => {
    const templateId = e.target.value;
    const template = templates.find(t => t._id === templateId);
    if (template) {
      setSelectedTemplate(template);
      await loadTemplateData(template);
    }
  };

  // Calculate working days based on month and year (total calendar days)
  const calculateWorkingDays = async (month, year, employeeId = null, showLoading = true) => {
    if (!month || !year) return;
    
    try {
      if (showLoading) setCalculatingWorkingDays(true);
      
      // Calculate total calendar days in the month
      const daysInMonth = new Date(year, month, 0).getDate();
      
      return daysInMonth;
    } catch (error) {
      console.error("Error calculating working days:", error);
      // Fallback calculation for total calendar days
      const daysInMonth = new Date(year, month, 0).getDate();
      
      return daysInMonth;
    } finally {
      if (showLoading) setCalculatingWorkingDays(false);
    }
  };

  // Calculate LOP based on attendance
  const calculateLOP = async () => {
    if (!payslip.employeeObjectId || !payslip.month || !payslip.year) {
      alert("Please select employee, month, and year first");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/api/payslip/calculate-lop`, {
        employeeId: payslip.employeeObjectId,
        month: payslip.month,
        year: payslip.year
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data.success) {
        const lopData = response.data.data;
        setLopCalculation(lopData);
        
        setPayslip(prev => ({
          ...prev,
          lopDays: lopData.lopDays,
          lopamount: lopData.lopAmount,
          workingdays: lopData.workingDays
        }));
      }
    } catch (error) {
      console.error("Error calculating LOP:", error);
      alert("Error calculating LOP. Please try again.");
    }
  };

  // Calculate totals in real-time
  useEffect(() => {
    const basicSalary = parseFloat(payslip.basicSalary) || 0;
    let hra = parseFloat(payslip.hra) || 0;
    let pf = parseFloat(payslip.pf) || 0;
    
    // PF is manually entered, no auto-calculation
    
    const totalEarnings = basicSalary + 
                         (parseFloat(payslip.da) || 0) + 
                         hra + 
                         (parseFloat(payslip.conveyance) || 0) + 
                         (parseFloat(payslip.medicalallowances) || 0) + 
                         (parseFloat(payslip.specialallowances) || 0) + 
                         (parseFloat(payslip.allowances) || 0);
    
    // Calculate LOP amount based on total earnings
    let lopAmount = 0;
    if (payslip.autoCalculateLOP && totalEarnings > 0 && payslip.workingdays > 0 && payslip.lopDays > 0) {
      const perDaySalary = totalEarnings / parseFloat(payslip.workingdays);
      lopAmount = perDaySalary * parseFloat(payslip.lopDays);
    } else {
      lopAmount = parseFloat(payslip.lopamount) || 0;
    }
    
    // Auto-calculate Professional Tax based on total earnings
    let professionalTax = parseFloat(payslip.proftax) || 0;
    if (totalEarnings > 0) {
      professionalTax = totalEarnings <= 20000 ? 150 : 200;
    }
    
    const totalDeductions = pf + 
                           professionalTax + 
                           (parseFloat(payslip.deductions) || 0) + 
                           lopAmount;
    
    const netSalary = Math.max(0, totalEarnings - totalDeductions);
    
    setCalculations({
      totalEarnings: totalEarnings.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      netSalary: netSalary.toFixed(2),

      calculatedPF: pf.toFixed(2),
      calculatedProfTax: professionalTax.toFixed(2),
      lopAmount: lopAmount.toFixed(2)
    });
    
    // Update form with calculated values
    if (payslip.autoCalculateLOP) {
      setPayslip(prev => ({ ...prev, lopamount: lopAmount.toFixed(2) }));
    }
    // Always update professional tax automatically
    if (basicSalary > 0) {
      setPayslip(prev => ({ ...prev, proftax: professionalTax.toFixed(2) }));
    }
  }, [payslip.basicSalary, payslip.da, payslip.hra, payslip.conveyance, payslip.medicalallowances, 
      payslip.specialallowances, payslip.allowances, payslip.pf, payslip.proftax, payslip.deductions,
      payslip.workingdays, payslip.lopDays, payslip.lopamount, payslip.autoCalculateLOP]);

  // Auto-update working days when month or year changes
  useEffect(() => {
    const updateWorkingDays = async () => {
      if (payslip.month && payslip.year) {
        const workingDays = await calculateWorkingDays(payslip.month, payslip.year, payslip.employeeId);
        if (workingDays) {
          setPayslip(prev => ({
            ...prev,
            workingdays: workingDays
          }));
        }
      }
    };
    
    updateWorkingDays();
  }, [payslip.month, payslip.year, payslip.employeeId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === "month") {
      setPayslip(prev => ({
        ...prev,
        month: parseInt(value),
        monthName: MONTHS[parseInt(value) - 1]
      }));
    } else {
      setPayslip(prev => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value
      }));
    }
  };

  const handleBankChange = (e) => {
    const value = e.target.value;
    setPayslip(prev => ({ ...prev, bankname: value }));
    
    if (value) {
      const filtered = BANKS.filter(bank => 
        bank.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setBankSuggestions(filtered);
    } else {
      setBankSuggestions([]);
    }
  };

  const selectBank = (bank) => {
    setPayslip(prev => ({ ...prev, bankname: bank }));
    setBankSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!payslip.employeeId || !payslip.basicSalary) {
      alert("Please fill in Employee ID and Basic Salary");
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/api/payslip/generate`, payslip, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        alert("Payslip generated successfully!");
        navigate("/admin-dashboard/salary");
      }
    } catch (error) {
      console.error("Error generating payslip:", error);
      alert(error.response?.data?.error || "Error generating payslip");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!payslip.employeeId || !payslip.basicSalary) {
      alert("Please fill in Employee ID and Basic Salary");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/api/payslip/preview`, payslip, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data.success) {
        setPreviewData(response.data.payslip);
        setShowPreview(true);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      alert(error.response?.data?.error || "Error generating preview");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!previewData) {
      alert("No payslip data available for email");
      return;
    }

    try {
      setEmailLoading(true);
      const response = await axios.post(`${API_BASE}/api/payslip/send-email`, {
        payslipData: previewData
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data.success) {
        alert("Payslip sent to employee email successfully!");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert(error.response?.data?.error || "Error sending email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGenerateFromPreview = async () => {
    if (!previewData) {
      alert("No payslip data available");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/api/payslip/generate`, previewData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data.success) {
        alert("Payslip generated successfully!");
        setShowPreview(false);
        navigate("/admin-dashboard/salary");
      }
    } catch (error) {
      console.error("Error generating payslip:", error);
      alert(error.response?.data?.error || "Error generating payslip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-4 md:mt-10 bg-white p-4 md:p-8 rounded-md shadow-md">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center md:text-left">Generate Payslip</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Employee Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Employee ID *</label>
            <input
                type="text"
                name="employeeId"
                value={payslip.employeeId}
                onChange={handleEmployeeIdChange}
                className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
                placeholder="Enter Employee ID"
                required
              />
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Employee Name</label>
            <input
              type="text"
              name="name"
              value={payslip.name}
              onChange={handleChange}
              className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md bg-gray-50 text-sm md:text-base"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Template</label>
            <select
              value={selectedTemplate?._id || ""}
              onChange={handleTemplateChange}
              className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
            >
              <option value="">Select Template</option>
              {templates.map(template => (
                <option key={template._id} value={template._id}>
                  {template.templateName} {template.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Period Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Month *</label>
            <select
              name="month"
              value={payslip.month}
              onChange={handleChange}
              className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
              required
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Year *</label>
            <input
              type="number"
              name="year"
              value={payslip.year}
              onChange={handleChange}
              className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
              min="2020"
              max="2030"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Joining Date</label>
            <input
              type="date"
              name="payDate"
              value={payslip.payDate}
              onChange={handleChange}
              className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base bg-gray-50"
              readOnly
            />
          </div>
        </div>

        {/* Attendance */}
        <div className="bg-blue-50 p-3 md:p-4 rounded-md mb-4 md:mb-6">
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <h3 className="text-base md:text-lg font-semibold">📊 Attendance</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700">
                Working Days 
                <span className="text-xs text-blue-600 block sm:inline">(Total calendar days in month)</span>
                {calculatingWorkingDays && (
                  <span className="text-xs text-orange-600 ml-2 block sm:inline">Calculating...</span>
                )}
              </label>
              <input
                type="number"
                name="workingdays"
                value={calculatingWorkingDays ? "" : payslip.workingdays}
                onChange={handleChange}
                className={`mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base ${
                  calculatingWorkingDays ? 'bg-orange-50 animate-pulse' : 'bg-blue-50'
                }`}
                min="1"
                max="31"
                title="Working days are automatically calculated as total calendar days in the selected month"
                placeholder={calculatingWorkingDays ? "Calculating working days..." : ""}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                LOP Days
                <span className="text-xs text-gray-500">(Loss of Pay Days)</span>
              </label>
              <input
                type="number"
                name="lopDays"
                value={payslip.lopDays}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                min="0"
                max="31"
                placeholder="Enter LOP days"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                LOP Amount
                <span className="text-xs text-gray-500">(₹)</span>
                {payslip.autoCalculateLOP && (
                  <span className="text-xs text-green-600 ml-2">Auto-calculated</span>
                )}
              </label>
              <input
                type="number"
                name="lopamount"
                value={payslip.autoCalculateLOP ? calculations.lopAmount : payslip.lopamount}
                onChange={handleChange}
                className={`mt-1 p-2 block w-full border border-gray-300 rounded-md ${
                  payslip.autoCalculateLOP ? 'bg-green-50' : ''
                }`}
                min="0"
                step="0.01"
                readOnly={payslip.autoCalculateLOP}
                placeholder="Enter LOP amount"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={payslip.autoCalculateLOP}
                onChange={(e) => setPayslip(prev => ({ ...prev, autoCalculateLOP: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Auto-calculate LOP amount based on total salary and LOP days
              </span>
            </label>
          </div>
        </div>

        {/* Employee Details */}
        <div className="bg-gray-50 p-3 md:p-4 rounded-md mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">👤 Employee Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Designation</label>
            <input
              type="text"
              name="designation"
              value={payslip.designation}
              onChange={handleChange}
              className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <input
              type="text"
              name="department"
              value={payslip.department}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              name="location"
              value={payslip.location}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
            />
          </div>
        </div>
        </div>

        {/* Bank & Identity Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Bank Name</label>
            <input
              type="text"
              name="bankname"
              value={payslip.bankname}
              onChange={handleBankChange}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
              placeholder="Type to search banks"
            />
            {bankSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto">
                {bankSuggestions.map((bank, index) => (
                  <div
                    key={index}
                    onClick={() => selectBank(bank)}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {bank}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Account Number</label>
            <input
              type="text"
              name="bankaccountnumber"
              value={payslip.bankaccountnumber}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">PAN</label>
            <input
              type="text"
              name="pan"
              value={payslip.pan}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
              placeholder="ABCDE1234F"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">UAN</label>
            <input
              type="text"
              name="uan"
              value={payslip.uan}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-green-50 p-3 md:p-4 rounded-md mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">💰 Earnings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700">Basic Salary *</label>
              <input
                type="text"
                name="basicSalary"
                value={payslip.basicSalary}
                onChange={handleChange}
                className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
                placeholder="Enter basic salary"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700">DA</label>
              <input
                type="text"
                name="da"
                value={payslip.da}
                onChange={handleChange}
                className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
                placeholder="Enter DA amount"
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700">HRA</label>
              <input
                type="text"
                name="hra"
                value={payslip.hra}
                onChange={handleChange}
                className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
                placeholder="Enter HRA amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Conveyance</label>
              <input
                type="text"
                name="conveyance"
                value={payslip.conveyance}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                placeholder="Enter conveyance amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Medical Allowances</label>
              <input
                type="text"
                name="medicalallowances"
                value={payslip.medicalallowances}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                placeholder="Enter medical allowances"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Special Allowances</label>
              <input
                type="text"
                name="specialallowances"
                value={payslip.specialallowances}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                placeholder="Enter special allowances"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Other Allowances</label>
              <input
                type="text"
                name="allowances"
                value={payslip.allowances}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                placeholder="Enter other allowances"
              />
            </div>
            
            <div className="bg-green-100 p-3 rounded-md sm:col-span-2 lg:col-span-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700">Total Earnings</label>
              <div className="text-base md:text-lg font-bold text-green-700">₹{calculations.totalEarnings}</div>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="bg-red-50 p-3 md:p-4 rounded-md mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">💸 Deductions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700">PF</label>
                <input
                  type="text"
                  name="pf"
                  value={payslip.pf}
                  onChange={handleChange}
                  className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
                  placeholder="Enter PF amount"
                />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700">Professional Tax</label>
                <input
                  type="text"
                  name="proftax"
                  value={payslip.proftax}
                  onChange={handleChange}
                  className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
                  placeholder="Enter professional tax"
                />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700">Other Deductions</label>
                <input
                  type="text"
                  name="deductions"
                  value={payslip.deductions}
                  onChange={handleChange}
                  className="mt-1 p-2 md:p-3 block w-full border border-gray-300 rounded-md text-sm md:text-base"
                  placeholder="Enter other deductions"
                />
            </div>
            
            <div className="bg-red-100 p-3 rounded-md sm:col-span-2 lg:col-span-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700">Total Deductions</label>
              <div className="text-base md:text-lg font-bold text-red-700">₹{calculations.totalDeductions}</div>
            </div>
          </div>
        </div>

        {/* Net Salary */}
        <div className="bg-blue-100 p-4 md:p-6 rounded-md mb-4 md:mb-6">
          <div className="text-center">
            <label className="block text-base md:text-lg font-medium text-gray-700">💵 Net Salary</label>
            <div className="text-2xl md:text-3xl font-bold text-blue-700">₹{calculations.netSalary}</div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate("/admin-dashboard/salary")}
            className="w-full sm:w-auto bg-gray-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-md hover:bg-gray-600 transition-colors duration-200 text-sm md:text-base"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading}
            className="w-full sm:w-auto bg-blue-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors duration-200 text-sm md:text-base"
          >
            {loading ? "Loading..." : "Preview Payslip"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-green-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors duration-200 text-sm md:text-base"
          >
            {loading ? "Generating..." : "Generate Payslip"}
          </button>
        </div>
      </form>
      
      {/* Payslip Preview Modal */}
      {showPreview && (
        <PayslipPreview
          payslip={previewData}
          onClose={() => setShowPreview(false)}
          onSendEmail={handleSendEmail}
          onGenerate={handleGenerateFromPreview}
          loading={loading || emailLoading}
        />
      )}
    </div>
  );
};

export default PayslipGenerator;