// src/components/salary/PayslipHistory.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";

// Get auth headers helper
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PayslipHistory = () => {
  const [payslips, setPayslips] = useState([]);
  const [filteredPayslips, setFilteredPayslips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: "",
    month: "",
    year: new Date().getFullYear(),
    department: "",
    fromDate: "",
    toDate: ""
  });
  const [departments, setDepartments] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showEmployeeSelection, setShowEmployeeSelection] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const navigate = useNavigate();

  useEffect(() => {
    loadPayslips();
    loadDepartments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payslips, filters]);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/payslip/history`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setPayslips(response.data.payslips);
      }
    } catch (error) {
      console.error("Error loading payslips:", error);
      alert("Error loading payslip history");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/department`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setDepartments(response.data.departments);
      }
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  };



  const applyFilters = () => {
    let filtered = [...payslips];

    if (filters.employeeId) {
      filtered = filtered.filter(payslip => 
        payslip.employeeId.toLowerCase().includes(filters.employeeId.toLowerCase()) ||
        payslip.name.toLowerCase().includes(filters.employeeId.toLowerCase())
      );
    }

    if (filters.month) {
      filtered = filtered.filter(payslip => payslip.month === parseInt(filters.month));
    }

    if (filters.year) {
      filtered = filtered.filter(payslip => payslip.year === parseInt(filters.year));
    }

    if (filters.department) {
      filtered = filtered.filter(payslip => 
        payslip.department.toLowerCase().includes(filters.department.toLowerCase())
      );
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      filtered = filtered.filter(payslip => {
        const payslipDate = new Date(payslip.createdAt);
        return payslipDate >= fromDate;
      });
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(payslip => {
        const payslipDate = new Date(payslip.createdAt);
        return payslipDate <= toDate;
      });
    }

    setFilteredPayslips(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      employeeId: "",
      month: "",
      year: new Date().getFullYear(),
      department: "",
      fromDate: "",
      toDate: ""
    });
  };

  const downloadPayslip = async (payslipId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/payslip/download/${payslipId}`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'payslip.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading payslip:", error);
      alert("Error downloading payslip. Please try again.");
    }
  };

  const generateMonthlyPayslips = async () => {
    if (!window.confirm("This will generate payslips for all employees for the current month. Continue?")) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/api/payslip/auto-generate-monthly`, {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      }, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        alert(`Successfully generated ${response.data.generated} payslips!`);
        loadPayslips();
      }
    } catch (error) {
      console.error("Error generating monthly payslips:", error);
      
      // Handle specific error for no default templates
      if (error.response?.data?.details) {
        const details = error.response.data.details;
        const message = `${error.response.data.error}\n\n` +
          `${details.message}\n\n` +
          `Active Templates: ${details.totalActiveTemplates}\n` +
          `Default Templates: ${details.defaultActiveTemplates}\n\n` +
          `Solution: ${details.solution}\n\n` +
          `Please go to Payroll Templates to create or update templates.`;
        alert(message);
      } else {
        alert(error.response?.data?.error || "Error generating monthly payslips");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return formatISTDate(new Date(dateString));
  };

  // Fetch all employees with their status
  const fetchAllEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/employee`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        const employeesWithTemplates = [];
        
        for (const employee of response.data.employees) {
          // Check if employee has a default payroll template
          try {
            const templateResponse = await axios.get(`${API_BASE}/api/payroll-template/employee/${employee.employeeId}`, {
              headers: getAuthHeaders()
            });
            
            const hasDefaultTemplate = templateResponse.data.success && 
              templateResponse.data.templates.some(template => template.isDefault && template.isActive);
            
            employeesWithTemplates.push({
              ...employee,
              hasDefaultTemplate,
              templateName: hasDefaultTemplate ? 
                templateResponse.data.templates.find(t => t.isDefault && t.isActive)?.templateName || 'Default Template' : 
                'No Default Template'
            });
          } catch (error) {
            employeesWithTemplates.push({
              ...employee,
              hasDefaultTemplate: false,
              templateName: 'No Template'
            });
          }
        }
        
        setEmployees(employeesWithTemplates);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Handle employee selection
  const handleEmployeeSelection = (employeeId, isSelected) => {
    if (isSelected) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  // Select all employees based on current filter
  const handleSelectAll = () => {
    const filteredEmployees = getFilteredEmployees();
    setSelectedEmployees(filteredEmployees.map(emp => emp._id));
  };

  // Deselect all employees
  const handleDeselectAll = () => {
    setSelectedEmployees([]);
  };

  // Get filtered employees based on status
  const getFilteredEmployees = () => {
    if (statusFilter === 'active') {
      return employees.filter(emp => emp.status === 'active');
    } else if (statusFilter === 'inactive') {
      return employees.filter(emp => emp.status === 'inactive');
    }
    return employees;
  };

  // Generate payslips for selected employees
  const generateSelectedEmployeesPayslips = async () => {
    if (selectedEmployees.length === 0) {
      alert("Please select at least one employee to generate payslips.");
      return;
    }

    const selectedActiveEmployees = selectedEmployees.filter(empId => {
      const employee = employees.find(emp => emp._id === empId);
      return employee && employee.status === 'active';
    });

    if (selectedActiveEmployees.length === 0) {
      alert("No active employees selected. Only active employees can have payslips generated.");
      return;
    }

    if (!window.confirm(`This will generate payslips for ${selectedActiveEmployees.length} selected active employees for ${MONTHS[selectedMonth - 1]} ${selectedYear}. Continue?`)) {
      return;
    }

    try {
      setAutoGenerating(true);
      const response = await axios.post(`${API_BASE}/api/payslip/auto-generate-selected`, {
        month: selectedMonth,
        year: selectedYear,
        selectedEmployees: selectedActiveEmployees
      }, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        let message = `Successfully generated ${response.data.generated} payslips!`;
        if (response.data.errors && response.data.errors.length > 0) {
          message += `\n\nSkipped ${response.data.errors.length} employees due to errors.`;
        }
        alert(message);
        loadPayslips();
        setShowEmployeeSelection(false);
        setSelectedEmployees([]);
      }
    } catch (error) {
      console.error("Error generating selected payslips:", error);
      
      if (error.response?.data?.details) {
        const details = error.response.data.details;
        const message = `${error.response.data.error}\n\n` +
          `${details.message}\n\n` +
          `Solution: ${details.solution}\n\n` +
          `Please go to Payroll Templates to create or update templates.`;
        alert(message);
      } else {
        alert(error.response?.data?.error || "Error generating payslips for selected employees");
      }
    } finally {
      setAutoGenerating(false);
    }
  };

  // Show employee selection modal
  const showEmployeeSelectionModal = async () => {
    await fetchAllEmployees();
    setShowEmployeeSelection(true);
  };



  return (
    <div className="max-w-7xl mx-auto mt-10 bg-white p-8 rounded-md shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Payslip History & Management</h2>
        <div className="space-x-4">
          <button
            onClick={() => navigate("/admin-dashboard/salary/payslip-generator")}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Generate New Payslip
          </button>
          <button
            onClick={generateMonthlyPayslips}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Auto Generate Monthly"}
          </button>
          <button
            onClick={showEmployeeSelectionModal}
            disabled={autoGenerating}
            className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:opacity-50"
          >
            {autoGenerating ? "Generating..." : "Select Employees & Generate"}
          </button>
        </div>
      </div>



      {/* Filters */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID/Name</label>
            <input
              type="text"
              name="employeeId"
              value={filters.employeeId}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="Search employee"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Months</option>
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Years</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept.dep_name}>{dept.dep_name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>



      {/* Payslips Table */}
      <div className="bg-white border rounded-lg">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            Payslip Records ({filteredPayslips.length} of {payslips.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading payslips...</div>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No payslips found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Basic Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LOP Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LOP Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deductions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayslips.map((payslip) => (
                  <tr key={payslip._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payslip.name}</div>
                      <div className="text-sm text-gray-500">{payslip.employeeId}</div>
                      <div className="text-sm text-gray-500">{payslip.designation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {MONTHS[payslip.month - 1]} {payslip.year}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payslip.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payslip.basicSalary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payslip.lopDays || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payslip.lopamount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatCurrency(payslip.totalDeductions)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(payslip.netSalary)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payslip.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => downloadPayslip(payslip._id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Download PDF"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => navigate(`/admin-dashboard/employees/salary/${payslip.employeeId}`)}
                        className="text-green-600 hover:text-green-900"
                        title="View Employee Salary Details"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Selection Modal */}
      {showEmployeeSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Select Employees for Payslip Generation</h3>
              <button
                onClick={() => {
                  setShowEmployeeSelection(false);
                  setSelectedEmployees([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Month and Year Selection */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Month:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTHS.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Year:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Employees</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Selection Controls */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={handleSelectAll}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              >
                Select All ({getFilteredEmployees().length})
              </button>
              <button
                onClick={handleDeselectAll}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
              >
                Deselect All
              </button>
              <span className="text-sm text-gray-600 self-center ml-2">
                Selected: {selectedEmployees.length} employees
              </span>
            </div>

            {/* Employee List */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
              <table className="min-w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredEmployees().map((employee) => (
                    <tr key={employee._id} className={employee.status === 'inactive' ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee._id)}
                          onChange={(e) => handleEmployeeSelection(employee._id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {employee.employeeId}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {employee.userId?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          employee.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {employee.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <span className={employee.hasDefaultTemplate ? 'text-green-600' : 'text-red-600'}>
                          {employee.templateName}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEmployeeSelection(false);
                  setSelectedEmployees([]);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={generateSelectedEmployeesPayslips}
                disabled={selectedEmployees.length === 0 || autoGenerating}
                className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:opacity-50"
              >
                {autoGenerating ? 'Generating...' : `Generate Payslips (${selectedEmployees.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PayslipHistory;