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
      // Silently handle error - departments will remain empty
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
      alert("Error downloading payslip. Please try again.");
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

  



  return (
    <div className="max-w-7xl mx-auto mt-6 sm:mt-10 bg-white p-4 sm:p-8 rounded-md shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'Times New Roman, serif' }}>Payslip History & Management</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => navigate("/admin-dashboard/salary/payslip-generator")}
            className="bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-600 text-sm sm:text-base"
          >
            Generate New Payslip
          </button>
          
          
        </div>
      </div>



      {/* Filters */}
      <div className="bg-gray-50 p-4 sm:p-6 rounded-lg mb-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        
        <div className="mt-4 flex justify-center sm:justify-end">
          <button
            onClick={clearFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm w-full sm:w-auto"
          >
            Clear Filters
          </button>
        </div>
      </div>



      {/* Payslips Table */}
      <div className="bg-white border rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b">
          <h3 className="text-base sm:text-lg font-semibold">
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
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden">
              {filteredPayslips.map((payslip) => (
                <div key={payslip._id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{payslip.name}</h4>
                      <p className="text-sm text-gray-500">{payslip.employeeId}</p>
                      <p className="text-sm text-gray-500">{payslip.designation}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(payslip.netSalary)}
                      </div>
                      <div className="text-xs text-gray-500">Net Salary</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Period:</span>
                      <div className="font-medium">{MONTHS[payslip.month - 1]} {payslip.year}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Department:</span>
                      <div className="font-medium">{payslip.department}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Basic Salary:</span>
                      <div className="font-medium">{formatCurrency(payslip.basicSalary)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">LOP Days:</span>
                      <div className="font-medium">{payslip.lopDays || 0}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">LOP Amount:</span>
                      <div className="font-medium">{formatCurrency(payslip.lopamount || 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Deductions:</span>
                      <div className="font-medium">{formatCurrency(payslip.totalDeductions)}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Generated: {formatDate(payslip.createdAt)}
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => downloadPayslip(payslip._id)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        title="Download PDF"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => navigate(`/admin-dashboard/employees/salary/${payslip.employeeId}`)}
                        className="text-green-600 hover:text-green-900 text-sm font-medium"
                        title="View Employee Salary Details"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
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
          </>
        )}
      </div>

      

      

    </div>
  );
};

export default PayslipHistory;