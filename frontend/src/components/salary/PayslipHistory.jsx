// src/components/salary/PayslipHistory.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";
import ActionIconButton from "../common/ActionIconButton";
import { FiDownload, FiEye } from "react-icons/fi";

// Get auth headers helper
const getAuthHeaders = () => {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PayslipHistory = () => {
  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/salary/payslip-history`, []);
  useMeta({
    title: "Payslip History — Speshway HRMS",
    description: "Filter and review generated payslips.",
    keywords: "payslip history, payroll, HRMS",
    image: "/images/Logo.jpg",
    url: canonical,
    robots: "noindex,nofollow"
  });
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
    <div className="max-w-7xl mx-auto mt-6 sm:mt-10 bg-surface p-4 sm:p-8 rounded-xl shadow-card">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-ink">Payslip History & Management</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => navigate("/admin-dashboard/salary/payslip-generator")}
            className="bg-accent-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-accent-700 transition-colors text-sm sm:text-base"
          >
            Generate New Payslip
          </button>
          
          
        </div>
      </div>



      {/* Filters */}
      <div className="bg-surface-muted p-4 sm:p-6 rounded-lg mb-6 border border-surface-subtle">
        <h3 className="text-base sm:text-lg font-semibold text-ink mb-4">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Employee ID/Name</label>
            <input
              type="text"
              name="employeeId"
              value={filters.employeeId}
              onChange={handleFilterChange}
              className="w-full p-2 border border-surface-subtle rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
              placeholder="Search employee"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Month</label>
            <select
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
              className="w-full p-2 border border-surface-subtle rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            >
              <option value="">All Months</option>
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Year</label>
            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              className="w-full p-2 border border-surface-subtle rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            >
              <option value="">All Years</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Department</label>
            <select
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full p-2 border border-surface-subtle rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept.dep_name}>{dept.dep_name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink mb-1">From Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-surface-subtle rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink mb-1">To Date</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-surface-subtle rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-center sm:justify-end">
          <button
            onClick={clearFilters}
            className="border border-surface-subtle bg-white text-ink px-4 py-2 rounded-lg hover:bg-surface-muted transition-colors text-sm w-full sm:w-auto"
          >
            Clear Filters
          </button>
        </div>
      </div>



      {/* Payslips Table */}
      <div className="bg-surface border border-surface-subtle rounded-lg shadow-card">
        <div className="px-4 sm:px-6 py-4 border-b border-surface-subtle">
          <h3 className="text-base sm:text-lg font-semibold text-ink">
            Payslip Records ({filteredPayslips.length} of {payslips.length})
          </h3>
        </div>
        
        {loading ? (
          <LoadingState message="Loading payslips..." />
        ) : filteredPayslips.length === 0 ? (
          <EmptyState title="No payslips found" message="Try adjusting your filters or search criteria." />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden">
              {filteredPayslips.map((payslip) => (
                <div key={payslip._id} className="border-b border-surface-subtle p-4 hover:bg-surface-muted">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-ink">{payslip.name}</h4>
                      <p className="text-sm text-ink-muted">{payslip.employeeId}</p>
                      <p className="text-sm text-ink-muted">{payslip.designation}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-accent-700">
                        {formatCurrency(payslip.netSalary)}
                      </div>
                      <div className="text-xs text-ink-muted">Net Salary</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-ink-muted">Period:</span>
                      <div className="font-medium">{MONTHS[payslip.month - 1]} {payslip.year}</div>
                    </div>
                    <div>
                      <span className="text-ink-muted">Department:</span>
                      <div className="font-medium">{payslip.department}</div>
                    </div>
                    <div>
                      <span className="text-ink-muted">Basic Salary:</span>
                      <div className="font-medium">{formatCurrency(payslip.basicSalary)}</div>
                    </div>
                    <div>
                      <span className="text-ink-muted">LOP Days:</span>
                      <div className="font-medium">{payslip.lopDays || 0}</div>
                    </div>
                    <div>
                      <span className="text-ink-muted">LOP Amount:</span>
                      <div className="font-medium">{formatCurrency(payslip.lopamount || 0)}</div>
                    </div>
                    <div>
                      <span className="text-ink-muted">Deductions:</span>
                      <div className="font-medium">{formatCurrency(payslip.totalDeductions)}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-surface-subtle">
                    <div className="text-xs text-ink-muted">
                      Generated: {formatDate(payslip.createdAt)}
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => downloadPayslip(payslip._id)}
                        className="text-brand-600 hover:text-brand-800 text-sm font-medium transition-colors"
                        title="Download PDF"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => navigate(`/admin-dashboard/employees/salary/${payslip.employeeId}`)}
                        className="text-accent-600 hover:text-accent-700 text-sm font-medium transition-colors"
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
              <table className="min-w-full divide-y divide-surface-subtle">
                <thead className="bg-surface-muted sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      Basic Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      LOP Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      LOP Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      Deductions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      Net Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      Generated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-surface-subtle">
                  {filteredPayslips.map((payslip) => (
                    <tr key={payslip._id} className="hover:bg-surface-muted transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-ink">{payslip.name}</div>
                        <div className="text-sm text-ink-muted">{payslip.employeeId}</div>
                        <div className="text-sm text-ink-muted">{payslip.designation}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-ink">
                          {MONTHS[payslip.month - 1]} {payslip.year}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        {payslip.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        {formatCurrency(payslip.basicSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        {payslip.lopDays || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        {formatCurrency(payslip.lopamount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        <div>{formatCurrency(payslip.totalDeductions)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-accent-700">
                          {formatCurrency(payslip.netSalary)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">
                        {formatDate(payslip.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <ActionIconButton icon={FiDownload} label="Download PDF" color="brand" onClick={() => downloadPayslip(payslip._id)} />
                        <ActionIconButton icon={FiEye} label="View Employee Salary Details" color="accent" onClick={() => navigate(`/admin-dashboard/employees/salary/${payslip.employeeId}`)} />
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
