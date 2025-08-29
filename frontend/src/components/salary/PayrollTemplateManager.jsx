// src/components/salary/PayrollTemplateManager.jsx
import React, { useEffect, useState } from "react";
import { fetchDepartments } from "../../utils/EmployeeHelper";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";

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

const PayrollTemplateManager = () => {
  const [template, setTemplate] = useState({
    employeeId: "",
    employeeObjectId: "",
    employeeName: "",
    templateName: "",
    designation: "",
    department: "",
    location: "",
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
    allowances: "",
    deductions: "",
    pf: "",
    proftax: "",

    
    isDefault: false,
    isActive: true
  });

  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [bankSuggestions, setBankSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [calculations, setCalculations] = useState({
    totalEarnings: 0,
    totalDeductions: 0,
    netSalary: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const deps = await fetchDepartments();
      setDepartments(deps || []);
      loadTemplates();
    })();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/payroll-template/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  // Auto-fetch employee details when employee ID is entered
  const handleEmployeeIdChange = async (e) => {
    const empId = e.target.value;
    setTemplate(prev => ({ ...prev, employeeId: empId }));
    
    if (empId.length >= 3) { // Start fetching after 3 characters
      try {
        const response = await axios.get(`${API_BASE}/api/payslip/employee/${empId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        
        if (response.data.success) {
          const employee = response.data.employee;
          setTemplate(prev => ({
            ...prev,
            employeeObjectId: employee._id,
            employeeName: employee.name,
            designation: employee.designation,
            department: employee.department,
            templateName: `${employee.name} - Default Template`
          }));
        }
      } catch (error) {
        console.error("Error fetching employee details:", error);
        if (error.response && error.response.status === 404) {
          console.log("Employee not found. Please check the Employee ID. You can view valid Employee IDs in the Employee Management section.");
        }
      }
    }
  };

  // Calculate totals in real-time
  useEffect(() => {
    const basicSalary = parseFloat(template.basicSalary) || 0;
    let hra = parseFloat(template.hra) || 0;
    let pf = parseFloat(template.pf) || 0;
    

    
    // PF is manually entered, no auto-calculation
    
    const totalEarnings = basicSalary + 
                         (parseFloat(template.da) || 0) + 
                         hra + 
                         (parseFloat(template.conveyance) || 0) + 
                         (parseFloat(template.medicalallowances) || 0) + 
                         (parseFloat(template.specialallowances) || 0) + 
                         (parseFloat(template.allowances) || 0);
    
    // Auto-calculate Professional Tax based on total earnings
    let professionalTax = parseFloat(template.proftax) || 0;
    if (totalEarnings > 0) {
      professionalTax = totalEarnings <= 20000 ? 150 : 200;
    }
    
    const totalDeductions = pf + 
                           professionalTax + 
                           (parseFloat(template.deductions) || 0);
    
    const netSalary = Math.max(0, totalEarnings - totalDeductions);
    
    setCalculations({
      totalEarnings: totalEarnings.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      netSalary: netSalary.toFixed(2),
      calculatedHRA: hra.toFixed(2),
      calculatedPF: pf.toFixed(2),
      calculatedProfTax: professionalTax.toFixed(2)
    });
    

    // Always update professional tax automatically
    if (basicSalary > 0) {
      setTemplate(prev => ({ ...prev, proftax: professionalTax.toFixed(2) }));
    }
  }, [template.basicSalary, template.da, template.hra, template.conveyance, template.medicalallowances, 
      template.specialallowances, template.allowances, template.pf, template.proftax, template.deductions]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === "pan") {
      // PAN card validation: 5 letters, 4 digits, 1 letter (ABCDE1234F)
      const panRegex = /^[A-Z]{0,5}[0-9]{0,4}[A-Z]?$/;
      const upperValue = value.toUpperCase();
      
      // Only allow valid PAN format characters and limit to 10 characters
      if (upperValue.length <= 10 && (upperValue === '' || panRegex.test(upperValue))) {
        setTemplate(prev => ({
          ...prev,
          [name]: upperValue
        }));
      }
      // Show alert for invalid format
      else if (upperValue.length === 10 && !isValidPAN(upperValue)) {
        alert("Invalid PAN format. Please enter in format: ABCDE1234F (5 letters, 4 digits, 1 letter)");
      }
    } else {
      setTemplate(prev => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value
      }));
    }
  };
  
  // Helper function to validate complete PAN format
  const isValidPAN = (pan) => {
    const fullPanRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return fullPanRegex.test(pan);
  };

  const handleBankChange = (e) => {
    const value = e.target.value;
    setTemplate(prev => ({ ...prev, bankname: value }));
    
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
    setTemplate(prev => ({ ...prev, bankname: bank }));
    setBankSuggestions([]);
  };

  const resetForm = () => {
    setTemplate({
      employeeId: "",
      employeeObjectId: "",
      employeeName: "",
      templateName: "",
      designation: "",
      department: "",
      location: "",
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
      allowances: "",
      deductions: "",
      pf: "",
      proftax: "",


      isDefault: false,
      isActive: true
    });
    setEditingTemplate(null);
    setBankSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!template.employeeId || !template.templateName || !template.basicSalary) {
      alert("Please fill in Employee ID, Template Name, and Basic Salary");
      return;
    }
    
    // Validate PAN format if PAN is provided
    if (template.pan && !isValidPAN(template.pan)) {
      alert("Invalid PAN format. Please enter in format: ABCDE1234F (5 letters, 4 digits, 1 letter)");
      return;
    }
    
    try {
      setLoading(true);
      const url = editingTemplate 
        ? `${API_BASE}/api/payroll-template/${editingTemplate._id}`
        : `${API_BASE}/api/payroll-template`;
      
      const method = editingTemplate ? "put" : "post";
      
      const response = await axios[method](url, template, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        alert(`Template ${editingTemplate ? 'updated' : 'created'} successfully!`);
        resetForm();
        setShowForm(false);
        loadTemplates();
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert(error.response?.data?.error || "Error saving template");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (templateToEdit) => {
    setTemplate({
      ...templateToEdit,
      employeeId: typeof templateToEdit.employeeId === 'object' ? templateToEdit.employeeId._id || templateToEdit.employeeId.toString() : templateToEdit.employeeId || "",
      employeeName: templateToEdit.employeeName || templateToEdit.name || ""
    });
    setEditingTemplate(templateToEdit);
    setShowForm(true);
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }
    
    try {
      const response = await axios.delete(`${API_BASE}/api/payroll-template/${templateId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        alert("Template deleted successfully!");
        loadTemplates();
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      alert(error.response?.data?.error || "Error deleting template");
    }
  };

  const handleSetDefault = async (templateId) => {
    try {
      const response = await axios.patch(`${API_BASE}/api/payroll-template/${templateId}/set-default`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        alert("Default template set successfully!");
        loadTemplates();
      }
    } catch (error) {
      console.error("Error setting default template:", error);
      alert(error.response?.data?.error || "Error setting default template");
    }
  };



  return (
    <div className="max-w-7xl mx-auto mt-10 bg-white p-8 rounded-md shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Payroll Template Manager</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          {showForm ? "Cancel" : "Create New Template"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-md mb-8">
          <h3 className="text-lg font-semibold mb-4">
            {editingTemplate ? "Edit Template" : "Create New Template"}
          </h3>
          
          <form onSubmit={handleSubmit}>
            {/* Employee Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee ID *</label>
                <input
                  type="text"
                  name="employeeId"
                  value={template.employeeId}
                  onChange={handleEmployeeIdChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  placeholder="Enter Employee ID"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee Name</label>
                <input
                  type="text"
                  name="employeeName"
                  value={template.employeeName}
                  onChange={handleChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md bg-gray-50"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Template Name *</label>
                <input
                  type="text"
                  name="templateName"
                  value={template.templateName}
                  onChange={handleChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  placeholder="Enter template name"
                  required
                />
              </div>
            </div>

            {/* Employee Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={template.designation}
                  onChange={handleChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  name="department"
                  value={template.department}
                  onChange={handleChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  name="location"
                  value={template.location}
                  onChange={handleChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                />
              </div>
              

            </div>

            {/* Bank & Identity Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                <input
                  type="text"
                  name="bankname"
                  value={template.bankname}
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
                  value={template.bankaccountnumber}
                  onChange={handleChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">PAN</label>
                <input
                  type="text"
                  name="pan"
                  value={template.pan}
                  onChange={handleChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  placeholder="ABCDE1234F"
                  maxLength="10"
                  pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                  title="PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)"
                  style={{
                    textTransform: 'uppercase'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">UAN</label>
                <input
                  type="text"
                  name="uan"
                  value={template.uan}
                  onChange={handleChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Earnings */}
            <div className="bg-green-50 p-4 rounded-md mb-6">
              <h4 className="text-lg font-semibold mb-4">Earnings</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Basic Salary *</label>
                  <input
                    type="text"
                    name="basicSalary"
                    value={template.basicSalary}
                    onChange={handleChange}
                    className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                    placeholder="Enter basic salary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">DA</label>
                  <input
                    type="text"
                    name="da"
                    value={template.da}
                    onChange={handleChange}
                    className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                    placeholder="Enter DA amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">HRA</label>
                  <input
                    type="text"
                    name="hra"
                    value={template.hra}
                    onChange={handleChange}
                    className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                    placeholder="Enter HRA amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Conveyance</label>
                  <input
                    type="text"
                    name="conveyance"
                    value={template.conveyance}
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
                    value={template.medicalallowances}
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
                    value={template.specialallowances}
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
                    value={template.allowances}
                    onChange={handleChange}
                    className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                    placeholder="Enter other allowances"
                  />
                </div>
                
                <div className="bg-green-100 p-3 rounded-md">
                  <label className="block text-sm font-medium text-gray-700">Total Earnings</label>
                  <div className="text-lg font-bold text-green-700">₹{calculations.totalEarnings}</div>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-red-50 p-4 rounded-md mb-6">
              <h4 className="text-lg font-semibold mb-4">Deductions</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PF</label>
                  <input
                    type="text"
                    name="pf"
                    value={template.pf}
                    onChange={handleChange}
                    className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                    placeholder="Enter PF amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Professional Tax</label>
                  <input
                    type="text"
                    name="proftax"
                    value={template.proftax}
                    onChange={handleChange}
                    className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                    placeholder="Enter professional tax"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Other Deductions</label>
                  <input
                    type="text"
                    name="deductions"
                    value={template.deductions}
                    onChange={handleChange}
                    className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                    placeholder="Enter other deductions"
                  />
                </div>
                
                <div className="bg-red-100 p-3 rounded-md">
                  <label className="block text-sm font-medium text-gray-700">Total Deductions</label>
                  <div className="text-lg font-bold text-red-700">₹{calculations.totalDeductions}</div>
                </div>
              </div>
            </div>

            {/* Template Settings */}
            <div className="bg-blue-50 p-4 rounded-md mb-6">
              <h4 className="text-lg font-semibold mb-4">Template Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={template.isDefault}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">Set as Default Template</label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={template.isActive}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">Active Template</label>
                </div>
                
                <div className="bg-blue-100 p-3 rounded-md">
                  <label className="block text-sm font-medium text-gray-700">Net Salary</label>
                  <div className="text-lg font-bold text-blue-700">₹{calculations.netSalary}</div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? "Saving..." : (editingTemplate ? "Update Template" : "Create Template")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white">
        <h3 className="text-lg font-semibold mb-4">Existing Templates</h3>
        
        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No templates found. Create your first template above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Basic Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((temp) => (
                  <tr key={temp._id} className={temp.isDefault ? "bg-blue-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {temp.templateName}
                        {temp.isDefault && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {temp.employeeName || (typeof temp.employeeId === 'string' ? temp.employeeId : temp.employeeId?.employeeId || temp.employeeId?._id || 'N/A')}
                      </div>
                      <div className="text-sm text-gray-500">{temp.designation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{parseFloat(temp.basicSalary || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{parseFloat(temp.netSalary || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        temp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {temp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(temp)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      {!temp.isDefault && (
                        <button
                          onClick={() => handleSetDefault(temp._id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(temp._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollTemplateManager;