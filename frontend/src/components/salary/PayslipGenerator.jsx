// src/components/salary/PayslipGenerator.jsx
import React, { useEffect, useState, useMemo } from "react";
import { fetchDepartments } from "../../utils/EmployeeHelper";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";
import { BANKS, MONTHS } from "../../utils/constants";
import PayslipPreview from "./PayslipPreview";
import useMeta from "../../utils/useMeta";

const PayslipGenerator = () => {
  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/salary/payslip-generator`, []);
  useMeta({
    title: "Payslip Generator — Speshway HRMS",
    description: "Generate payslips for employees.",
    keywords: "payslip, payroll, HRMS",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow"
  });
  // Get current date in IST
  const getCurrentISTDate = () => {
    const now = new Date();
    // Offset for IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + istOffset);
  };

  const istNow = getCurrentISTDate();
  
  // Calculate previous month and its year
  // Using UTC methods to ensure consistency after offset addition
  const prevMonthDate = new Date(istNow.getUTCFullYear(), istNow.getUTCMonth() - 1, 1);

  const [payslip, setPayslip] = useState({
    employeeId: "",
    employeeObjectId: "",
    name: "",
    joiningDate: "",
    designation: "",
    department: "",
    location: "Hyderabad",
    workingdays: "",
    lopDays: "",
    lopamount: "",
    bankname: "",
    bankaccountnumber: "",
    pan: "",
    uan: "",
    month: prevMonthDate.getMonth() + 1,
    monthName: MONTHS[prevMonthDate.getMonth()],
    year: prevMonthDate.getFullYear(),
    basicSalary: "",
    da: "",
    hra: "",
    conveyance: "",
    medicalallowances: "",
    specialallowances: "",
    deductions: "",
    pf: "",
    proftax: "",
    payDate: "", // Will be set to joining date when employee is selected
    autoCalculateLOP: false,
    autoCalculatePF: true
  });

  const [departments, setDepartments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [bankSuggestions, setBankSuggestions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeSuggestions, setEmployeeSuggestions] = useState([]);
  const [idSuggestions, setIdSuggestions] = useState([]);
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
      
      // Fetch all employees for auto-fetch by name
      try {
        const response = await axios.get(`${API_BASE}/api/employee`, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
          }
        });
        if (response.data.success) {
          // Normalize employee names and IDs for searching
          const employeeList = response.data.employees.map(emp => ({
            _id: emp._id,
            employeeId: emp.employeeId,
            name: emp.userId?.name || "N/A"
          }));
          setEmployees(employeeList);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    })();
  }, []);

  // Fetch employee details by ID
  const fetchEmployeeById = async (empId) => {
    if (!empId) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/payslip/employee/${empId}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        const employee = response.data.employee;
        
        // Format the joining date if found in IST
        const formattedJoiningDate = employee.joiningDate ? toISTDateString(new Date(employee.joiningDate)) : "";
        
        setPayslip(prev => {
          const updated = {
            ...prev,
            employeeId: employee.employeeId,
            employeeObjectId: employee._id,
            name: employee.name,
            email: employee.email,
            designation: employee.designation,
            department: employee.department,
            joiningDate: formattedJoiningDate,
            payDate: formattedJoiningDate,
            location: employee.location || prev.location || "Hyderabad",
            bankname: employee.bankname || prev.bankname || "",
            bankaccountnumber: employee.bankaccountnumber || prev.bankaccountnumber || "",
            pan: employee.pan || prev.pan || "",
            uan: employee.uan || prev.uan || "",
            autoCalculatePF: employee.template ? (employee.template.autoCalculatePF !== undefined ? employee.template.autoCalculatePF : false) : true,
            pf: employee.template ? (employee.template.pf !== undefined && employee.template.pf !== null ? employee.template.pf.toString() : "") : ""
          };

          // If no template but we have fullSalary from offer, calculate breakdown
          if (!employee.template && employee.fullSalary) {
            const fullSalary = parseFloat(employee.fullSalary);
            if (!isNaN(fullSalary) && fullSalary > 2850) {
              const remaining = fullSalary - 2850;
              updated.basicSalary = (remaining * 0.40).toFixed(2);
              updated.da = (remaining * 0.22).toFixed(2);
              updated.hra = (remaining * 0.20).toFixed(2);
              updated.conveyance = "1600";
              updated.medicalallowances = "1250";
              updated.specialallowances = (remaining * 0.18).toFixed(2);
            }
          }

          return updated;
        });
        
        // Load employee templates
        if (employee.template) {
          setSelectedTemplate(employee.template);
          await loadTemplateData(employee.template, employee.employeeId);
        }
        
        // Get all templates for this employee
        const templatesResponse = await axios.get(`${API_BASE}/api/payroll-template/employee/${empId}`, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
          }
        });
        
        if (templatesResponse.data.success) {
          setTemplates(templatesResponse.data.templates);
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Employee not found
      }
    }
  };

  // Auto-fetch employee details when employee ID is entered
  const handleEmployeeIdChange = async (e) => {
    const empId = e.target.value;
    setPayslip(prev => ({ 
      ...prev, 
      employeeId: empId,
      ...(empId.length < 1 && {
        employeeObjectId: "",
        name: "",
        email: "",
        designation: "",
        department: "",
        joiningDate: "",
        payDate: "",
        location: "Hyderabad",
        bankname: "",
        bankaccountnumber: "",
        pan: "",
        uan: "",
        basicSalary: "",
        da: "",
        hra: "",
        conveyance: "",
        medicalallowances: "",
        specialallowances: "",
        deductions: "",
        pf: "",
        proftax: ""
      })
    }));
    
    if (empId.length >= 1) {
      const filtered = employees.filter(emp =>
        emp.employeeId.toLowerCase().includes(empId.toLowerCase())
      ).slice(0, 10);
      setIdSuggestions(filtered);

      // Auto-select immediately when the typed value is an exact ID match
      const exactMatch = employees.find(emp => emp.employeeId.toLowerCase() === empId.toLowerCase());
      if (exactMatch) {
        setIdSuggestions([]);
        await fetchEmployeeById(exactMatch.employeeId);
      }
    } else {
      setIdSuggestions([]);
    }
  };

  // Select employee from the Employee ID suggestions dropdown
  const selectEmployeeById = async (emp) => {
    setIdSuggestions([]);
    await fetchEmployeeById(emp.employeeId);
  };

  // Handle name change for search suggestions
  const handleNameChange = (e) => {
    const value = e.target.value;
    setPayslip(prev => ({ ...prev, name: value }));
    
    if (value.length >= 2) {
      const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(value.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setEmployeeSuggestions(filtered);
    } else {
      setEmployeeSuggestions([]);
    }
  };

  // Select employee from suggestions
  const selectEmployee = async (emp) => {
    setEmployeeSuggestions([]);
    await fetchEmployeeById(emp.employeeId);
  };

  // Load template data into form
  const loadTemplateData = async (template, empId) => {
    const targetEmpId = empId || payslip.employeeId;
    // Calculate working days for current month/year
    const workingDays = await calculateWorkingDays(payslip.month, payslip.year, targetEmpId);
    
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
      deductions: template.deductions || "",
      pf: template.pf !== undefined && template.pf !== null ? template.pf.toString() : "",
      proftax: template.proftax || "",
      workingdays: workingDays || 30,
      autoCalculatePF: template.autoCalculatePF !== undefined ? template.autoCalculatePF : false
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
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
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
      alert("Error calculating LOP. Please try again.");
    }
  };
  // Calculate totals in real-time
  useEffect(() => {
    const basicSalary = parseFloat(payslip.basicSalary) || 0;
    let hra = parseFloat(payslip.hra) || 0;
    
    // Auto-calculate PF as 24% of basic salary
    const calculatedPFValue = basicSalary ? Math.round(basicSalary * 0.24) : 0;
    
    const totalEarnings = basicSalary + 
                         (parseFloat(payslip.da) || 0) + 
                         hra + 
                         (parseFloat(payslip.conveyance) || 0) + 
                         (parseFloat(payslip.medicalallowances) || 0) + 
                         (parseFloat(payslip.specialallowances) || 0);
    
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
    
    const pfToUse = payslip.autoCalculatePF ? calculatedPFValue : (parseFloat(payslip.pf) || 0);

    const totalDeductions = pfToUse + 
                           professionalTax + 
                           (parseFloat(payslip.deductions) || 0) + 
                           lopAmount;
    
    const netSalary = Math.max(0, totalEarnings - totalDeductions);
    
    setCalculations({
      totalEarnings: totalEarnings.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      netSalary: netSalary.toFixed(2),
      calculatedPF: pfToUse.toFixed(2),
      calculatedProfTax: professionalTax.toFixed(2),
      lopAmount: lopAmount.toFixed(2)
    });
    
    // Update form with calculated values
    setPayslip(prev => {
      const currentPf = parseFloat(prev.pf) || 0;
      const currentPT = parseFloat(prev.proftax) || 0;
      const currentLop = parseFloat(prev.lopamount) || 0;
      
      const nextLop = prev.autoCalculateLOP ? lopAmount : currentLop;
      const nextLopStr = prev.autoCalculateLOP ? lopAmount.toFixed(2) : prev.lopamount;
      
      let needsUpdate = false;
      const updated = { ...prev };

      if (prev.autoCalculatePF && currentPf !== calculatedPFValue) {
        updated.pf = calculatedPFValue.toString();
        needsUpdate = true;
      }
      if (currentPT !== professionalTax) {
        updated.proftax = professionalTax.toFixed(2);
        needsUpdate = true;
      }
      if (currentLop !== nextLop) {
        updated.lopamount = nextLopStr;
        needsUpdate = true;
      }

      return needsUpdate ? updated : prev;
    });
  }, [payslip.basicSalary, payslip.da, payslip.hra, payslip.conveyance, payslip.medicalallowances, 
      payslip.specialallowances, payslip.pf, payslip.proftax, payslip.deductions,
      payslip.workingdays, payslip.lopDays, payslip.lopamount, payslip.autoCalculateLOP, payslip.autoCalculatePF]);

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
      setPayslip(prev => {
        const nextState = {
          ...prev,
          [name]: type === "checkbox" ? checked : value
        };
        // Disable auto calculate PF if user manually modifies pf field
        if (name === "pf") {
          nextState.autoCalculatePF = false;
        }
        // Enable auto calculate PF if user manually modifies basicSalary
        if (name === "basicSalary") {
          nextState.autoCalculatePF = true;
        }
        return nextState;
      });
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
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        alert("Payslip generated successfully!");
        navigate("/admin-dashboard/salary/payslip-history");
      }
    } catch (error) {
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
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
      });

      if (response.data.success) {
        setPreviewData(response.data.payslip);
        setShowPreview(true);
      }
    } catch (error) {
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
      // Prefer sending explicit email to improve reliability
      const payload = payslip?.email
        ? { payslip: previewData, employeeEmail: payslip.email }
        : { payslipData: previewData };

      const response = await axios.post(`${API_BASE}/api/payslip/send-email`, payload, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
      });

      if (response.data.success) {
        alert("Payslip sent to employee email successfully!");
      }
    } catch (error) {
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
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
      });

      if (response.data.success) {
        alert("Payslip generated successfully!");
        setShowPreview(false);
        navigate("/admin-dashboard/salary/payslip-history");
      }
    } catch (error) {
      alert(error.response?.data?.error || "Error generating payslip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-4 md:mt-10 bg-surface p-4 md:p-8 rounded-xl shadow-card">
      <h2 className="text-xl md:text-2xl font-semibold text-ink mb-4 md:mb-6 text-center md:text-left">Generate Payslip</h2>
      
      <form onSubmit={handleSubmit} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
        {/* Employee Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="relative">
            <label className="block text-xs md:text-sm font-medium text-ink">Employee ID *</label>
            <input
                type="text"
                name="employeeId"
                value={payslip.employeeId}
                onChange={handleEmployeeIdChange}
                className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                placeholder="Enter Employee ID"
                autoComplete="off"
                required
              />
            {idSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-surface border border-surface-subtle rounded-lg mt-1 max-h-60 overflow-y-auto shadow-panel">
                {idSuggestions.map((emp, index) => (
                  <div
                    key={index}
                    onClick={() => selectEmployeeById(emp)}
                    className="p-3 hover:bg-surface-muted cursor-pointer border-b border-surface-subtle last:border-b-0"
                  >
                    <div className="font-semibold text-sm md:text-base text-ink">{emp.employeeId}</div>
                    <div className="text-xs text-ink-muted">{emp.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="relative">
            <label className="block text-xs md:text-sm font-medium text-ink">Employee Name</label>
            <input
              type="text"
              name="name"
              value={payslip.name}
              onChange={handleNameChange}
              className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
              placeholder="Enter Employee Name"
            />
            {employeeSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-surface border border-surface-subtle rounded-lg mt-1 max-h-60 overflow-y-auto shadow-panel">
                {employeeSuggestions.map((emp, index) => (
                  <div
                    key={index}
                    onClick={() => selectEmployee(emp)}
                    className="p-3 hover:bg-surface-muted cursor-pointer border-b border-surface-subtle last:border-b-0"
                  >
                    <div className="font-semibold text-sm md:text-base text-ink">{emp.name}</div>
                    <div className="text-xs text-ink-muted">{emp.employeeId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-medium text-ink">Template</label>
            <select
              value={selectedTemplate?._id || ""}
              onChange={handleTemplateChange}
              className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
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
            <label className="block text-xs md:text-sm font-medium text-ink">Month *</label>
            <select
              name="month"
              value={payslip.month}
              onChange={handleChange}
              className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
              required
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-medium text-ink">Year *</label>
            <input
              type="number"
              name="year"
              value={payslip.year}
              onChange={handleChange}
              className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
              min="2020"
              max="2030"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-medium text-ink">Joining Date</label>
            <input
              type="date"
              name="payDate"
              value={payslip.payDate}
              onChange={handleChange}
              className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base bg-surface-muted text-ink-muted"
              readOnly
            />
          </div>
        </div>

        {/* Attendance */}
        <div className="bg-brand-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border border-brand-100">
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <h3 className="text-base md:text-lg font-semibold text-ink">📊 Attendance</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-ink">
                Working Days 
                <span className="text-xs text-brand-600 block sm:inline">(Total calendar days in month)</span>
                {calculatingWorkingDays && (
                  <span className="text-xs text-orange-600 ml-2 block sm:inline">Calculating...</span>
                )}
              </label>
              <input
                type="number"
                name="workingdays"
                value={calculatingWorkingDays ? "" : payslip.workingdays}
                onChange={handleChange}
                className={`mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors appearance-none ${
                  calculatingWorkingDays ? "bg-orange-50 animate-pulse" : "bg-brand-50"
                }`}
                min="1"
                max="31"
                title="Working days are automatically calculated as total calendar days in the selected month"
                placeholder={calculatingWorkingDays ? "Calculating working days..." : ""}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink">
                LOP Days
                <span className="text-xs text-ink-muted">(Loss of Pay Days)</span>
              </label>
              <input
                type="number"
                name="lopDays"
                value={payslip.lopDays}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors appearance-none"
                min="0"
                max="31"
                placeholder="Enter LOP days"
                onWheel={(e) => e.target.blur()}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink">
                LOP Amount
                <span className="text-xs text-ink-muted">(₹)</span>
                {payslip.autoCalculateLOP && (
                  <span className="text-xs text-accent-600 ml-2">Auto-calculated</span>
                )}
              </label>
              <input
                type="number"
                name="lopamount"
                value={payslip.autoCalculateLOP ? calculations.lopAmount : payslip.lopamount}
                onChange={handleChange}
                className={`mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors appearance-none ${
                  payslip.autoCalculateLOP ? 'bg-green-50' : ''
                }`}
                min="0"
                step="0.01"
                readOnly={payslip.autoCalculateLOP}
                placeholder="Enter LOP amount"
                onWheel={(e) => e.target.blur()}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={payslip.autoCalculateLOP}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setPayslip(prev => ({
                    ...prev,
                    autoCalculateLOP: checked,
                    lopDays: checked ? prev.lopDays : 0,
                    lopamount: checked ? prev.lopamount : 0
                  }));
                }}
                className="mr-2"
              />
              <span className="text-sm text-ink">
                Auto-calculate LOP amount based on total salary and LOP days
              </span>
            </label>
          </div>
        </div>

        {/* Employee Details */}
        <div className="bg-surface-muted p-3 md:p-4 rounded-lg mb-4 md:mb-6 border border-surface-subtle">
          <h3 className="text-base md:text-lg font-semibold text-ink mb-3 md:mb-4">👤 Employee Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-ink">Designation</label>
            <input
              type="text"
              name="designation"
              value={payslip.designation}
              onChange={handleChange}
              className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink">Department</label>
            <input
              type="text"
              name="department"
              value={payslip.department}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink">Location</label>
            <input
              type="text"
              name="location"
              value={payslip.location}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            />
          </div>
        </div>
        </div>

        {/* Bank & Identity Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <label className="block text-sm font-medium text-ink">Bank Name</label>
            <input
              type="text"
              name="bankname"
              value={payslip.bankname}
              onChange={handleBankChange}
              className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
              placeholder="Type to search banks"
            />
            {bankSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-surface border border-surface-subtle rounded-lg mt-1 max-h-40 overflow-y-auto shadow-panel">
                {bankSuggestions.map((bank, index) => (
                  <div
                    key={index}
                    onClick={() => selectBank(bank)}
                    className="p-2 hover:bg-surface-muted cursor-pointer text-sm text-ink"
                  >
                    {bank}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink">Account Number</label>
            <input
              type="text"
              name="bankaccountnumber"
              value={payslip.bankaccountnumber}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink">PAN</label>
            <input
              type="text"
              name="pan"
              value={payslip.pan}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
              placeholder="ABCDE1234F"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink">UAN</label>
            <input
              type="text"
              name="uan"
              value={payslip.uan}
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-accent-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border border-accent-100">
          <h3 className="text-base md:text-lg font-semibold text-ink mb-3 md:mb-4">💰 Earnings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-ink">Basic Salary *</label>
              <input
                type="text"
                name="basicSalary"
                value={payslip.basicSalary}
                onChange={handleChange}
                className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                placeholder="Enter basic salary"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-ink">DA</label>
              <input
                type="text"
                name="da"
                value={payslip.da}
                onChange={handleChange}
                className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                placeholder="Enter DA amount"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-ink">HRA</label>
              <input
                type="text"
                name="hra"
                value={payslip.hra}
                onChange={handleChange}
                className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                placeholder="Enter HRA amount"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink">Conveyance</label>
              <input
                type="text"
                name="conveyance"
                value={payslip.conveyance}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                placeholder="Enter conveyance amount"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink">Medical Allowances</label>
              <input
                type="text"
                name="medicalallowances"
                value={payslip.medicalallowances}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                placeholder="Enter medical allowances"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink">Special Allowances</label>
              <input
                type="text"
                name="specialallowances"
                value={payslip.specialallowances}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                placeholder="Enter special allowances"
                required
              />
            </div>
            
            
            
            <div className="bg-accent-100 p-3 rounded-lg sm:col-span-2 lg:col-span-1">
              <label className="block text-xs md:text-sm font-medium text-ink">Total Earnings</label>
              <div className="text-base md:text-lg font-bold text-accent-700">₹{calculations.totalEarnings}</div>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="bg-red-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border border-red-100">
          <h3 className="text-base md:text-lg font-semibold text-ink mb-3 md:mb-4">💸 Deductions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-ink">PF</label>
                <input
                  type="text"
                  name="pf"
                  value={payslip.pf}
                  onChange={handleChange}
                  className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                  placeholder="Enter PF amount"
                />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-ink">Professional Tax</label>
                <input
                  type="text"
                  name="proftax"
                  value={payslip.proftax}
                  onChange={handleChange}
                  className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                  placeholder="Enter professional tax"
                />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-ink">Other Deductions</label>
                <input
                  type="text"
                  name="deductions"
                  value={payslip.deductions}
                  onChange={handleChange}
                  className="mt-1 p-2 md:p-3 block w-full border border-surface-subtle rounded-lg text-sm md:text-base focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                  placeholder="Enter other deductions"
                />
            </div>
            
            <div className="bg-red-100 p-3 rounded-lg sm:col-span-2 lg:col-span-1">
              <label className="block text-xs md:text-sm font-medium text-ink">Total Deductions</label>
              <div className="text-base md:text-lg font-bold text-red-700">₹{calculations.totalDeductions}</div>
            </div>
          </div>
        </div>

        {/* Net Salary */}
        <div className="bg-brand-100 p-4 md:p-6 rounded-lg mb-4 md:mb-6">
          <div className="text-center">
            <label className="block text-base md:text-lg font-medium text-ink">💵 Net Salary</label>
            <div className="text-2xl md:text-3xl font-bold text-brand-700">₹{calculations.netSalary}</div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate("/admin-dashboard/salary")}
            className="w-full sm:w-auto border border-surface-subtle bg-white text-ink px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-surface-muted transition-colors duration-200 text-sm md:text-base"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading}
            className="w-full sm:w-auto border border-surface-subtle bg-white text-ink px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-surface-muted disabled:opacity-50 transition-colors duration-200 text-sm md:text-base"
          >
            {loading ? "Loading..." : "Preview Payslip"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-accent-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-accent-700 disabled:opacity-50 transition-colors duration-200 text-sm md:text-base"
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
