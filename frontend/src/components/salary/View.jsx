// src/components/salary/View.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { formatDMY } from "../../utils/dateUtils";
import useMeta from "../../utils/useMeta";
import EmptyState from "../common/EmptyState";
import ActionIconButton from "../common/ActionIconButton";
import { FiDownload, FiEye, FiShare2 } from "react-icons/fi";

const View = () => {
  const [salaries, setSalaries] = useState([]);

  const [selectedSalary, setSelectedSalary] = useState(null);
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canonical = useMemo(() => `${window.location.origin}/employee-dashboard/salary/${id || ''}`, [id]);
  useMeta({
    title: 'Salary — Speshway HRMS',
    description: 'View salary details and payslips.',
    keywords: 'salary, payslip, HRMS',
    image: '/images/Logo.jpg',
    url: canonical,
    robots: 'noindex,nofollow'
  });

  useEffect(() => {
    const fetchSalaries = async () => {
      try {
        // If no ID is provided (main salary dashboard), don't make API call
        if (!id || id === undefined || id === null || id === '') {
    
          setSalaries([]);
    
          return;
        }
        
        // Additional validation to ensure we have a valid user role
        if (!user || !user.role) {
  
          return;
        }
        
        const roleParam = Array.isArray(user.role) 
          ? (user.role.includes("admin") ? "admin" : "employee") 
          : user.role;

        const response = await axios.get(`${API_BASE}/api/salary/${id}/${roleParam}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        
        if (response.data.success) {
          setSalaries(response.data.salary || []);
  
        } else {
          setSalaries([]);
  
        }
      } catch (error) {
        // Silently handle errors and show empty results
        setSalaries([]);
  
      }
    };
    // Only fetch if user is loaded
    if (user) {
      fetchSalaries();
    }
  }, [id, user]);





  const DetailedSalaryView = ({ salary, onClose }) => {
    const totalEarnings = 
      Number(salary.basicSalary || 0) +
      Number(salary.da || 0) +
      Number(salary.hra || 0) +
      Number(salary.conveyance || 0) +
      Number(salary.medicalallowances || 0) +
      Number(salary.specialallowances || 0);

    const totalDeductions = 
      Number(salary.proftax || 0) +
      Number(salary.pf || 0) +
      Number(salary.lopamount || 0) +
      Number(salary.deductions || 0);

    // Prefer the stored netSalary (may reflect a netPayOverride from a
    // partial-month payslip) over recomputing Total Earnings − Total
    // Deductions — see the matching comment in PayslipPreview.jsx.
    const hasStoredNetSalary = salary.netSalary !== undefined && salary.netSalary !== null && !isNaN(Number(salary.netSalary));
    const netPay = hasStoredNetSalary ? Number(salary.netSalary) : totalEarnings - totalDeductions;

    const formatAmt = (amt) => Number(amt || 0).toFixed(0);
    const formatCurrencyINR = (val) => `INR ${Number(val || 0).toFixed(2)}`;
    
    const numberToWords = (num) => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const thousands = ['', 'Thousand', 'Million', 'Billion'];
      
      if (num === 0) return 'Zero';
      
      const convertHundreds = (n) => {
        let result = '';
        if (n >= 100) {
          result += ones[Math.floor(n / 100)] + ' Hundred ';
          n %= 100;
        }
        if (n >= 20) {
          result += tens[Math.floor(n / 10)] + ' ';
          n %= 10;
        } else if (n >= 10) {
          result += teens[n - 10] + ' ';
          n = 0;
        }
        if (n > 0) {
          result += ones[n] + ' ';
        }
        return result;
      };
      
      let result = '';
      let thousandCounter = 0;
      
      while (num > 0) {
        if (num % 1000 !== 0) {
          result = convertHundreds(num % 1000) + thousands[thousandCounter] + ' ' + result;
        }
        num = Math.floor(num / 1000);
        thousandCounter++;
      }
      
      return result.trim();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{fontFamily: 'Times, serif', margin: '20px'}}>
          <div style={{padding: '20px'}}>
            {/* Close Button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={onClose}
                className="text-ink-muted hover:text-ink text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            {/* Header with Logo */}
            <div className="flex-col sm:flex-row" style={{border: '1px solid black', minHeight: '70px', display: 'flex', alignItems: 'center'}}>
              <div style={{width: '70px', height: '66px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', margin: '6px auto'}}>
                <img
                  src="https://media.licdn.com/dms/image/v2/C4E0BAQFCeV7EWFY7mA/company-logo_200_200/company-logo_200_200/0/1660829823147?e=2147483647&v=beta&t=dqXv3GOH9QultP_4TbKdVXsdUJNBs6R0V80OPMDRWbA"
                  alt="Speshway Logo"
                  style={{width: '70px', height: 'auto', maxHeight: '66px', objectFit: 'contain'}}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{display: 'none', fontSize: '10px', textAlign: 'center', color: '#666'}}>Logo</div>
              </div>
              <div style={{flex: 1, textAlign: 'center', padding: '4px 8px'}}>
                <div style={{fontFamily: 'Times, serif', fontSize: '16px', fontWeight: 'bold', marginBottom: '2px', wordBreak: 'break-word'}}>SPESHWAY SOLUTIONS PRIVATE LIMITED</div>
                <div style={{fontFamily: 'Times, serif', fontSize: '10px', marginBottom: '2px'}}>Hitech City, Hyderabad</div>
                <div style={{fontFamily: 'Times, serif', fontSize: '11px', fontWeight: 'bold'}}>Payslip for the month of {salary.month} {salary.year}</div>
              </div>
            </div>

            {/* Personal Info Section */}
            <div className="flex-col sm:flex-row" style={{border: '1px solid black', borderTop: 'none', minHeight: '100px', display: 'flex'}}>
              <div className="w-full sm:w-1/2" style={{padding: '10px', borderRight: '1px solid black'}}>
                <div style={{fontFamily: 'Times, serif', fontSize: '10px', lineHeight: '15px'}}>
                  <div style={{marginBottom: '15px'}}>Name: <span style={{marginLeft: '65px'}}>{salary.name || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Joining Date: <span style={{marginLeft: '32px'}}>{salary.joiningDate ? new Date(salary.joiningDate).toLocaleDateString() : '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Designation: <span style={{marginLeft: '40px'}}>{salary.designation || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Department: <span style={{marginLeft: '40px'}}>{salary.department || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Work Days: <span style={{marginLeft: '48px'}}>{salary.workingdays || 0}</span></div>
                  <div>LOP Days: <span style={{marginLeft: '50px'}}>{salary.lopDays || 0}</span></div>
                </div>
              </div>
              <div className="w-full sm:w-1/2" style={{padding: '10px'}}>
                <div style={{fontFamily: 'Times, serif', fontSize: '10px', lineHeight: '15px'}}>
                  <div style={{marginBottom: '15px'}}>Employee No: <span style={{marginLeft: '32px'}}>{salary.employeeId?.employeeId || salary.employeeId || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Bank Name: <span style={{marginLeft: '40px'}}>{salary.bankname || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Bank Account No: <span style={{marginLeft: '16px'}}>{salary.bankaccountnumber || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>PAN No: <span style={{marginLeft: '56px'}}>{salary.pan || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>UAN No: <span style={{marginLeft: '56px'}}>{salary.uan || '-'}</span></div>
                </div>
              </div>
            </div>

            {/* Earnings & Deductions Section */}
            <div style={{border: '1px solid black', borderTop: 'none', minHeight: '140px'}}>
              {/* Headers */}
              <div className="flex-wrap" style={{display: 'flex', fontFamily: 'Times, serif', fontSize: '10px', fontWeight: 'bold', padding: '5px'}}>
                <div className="w-1/2 sm:w-1/4 pl-1">Earnings</div>
                <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">Actual</div>
                <div className="w-1/2 sm:w-1/4 pl-1">Deductions</div>
                <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">Actual</div>
              </div>
              
              {/* Earnings and Deductions Rows */}
              <div style={{fontFamily: 'Times, serif', fontSize: '10px'}}>
                {/* Row 1 */}
                <div className="flex-wrap" style={{display: 'flex', minHeight: '18px', alignItems: 'center'}}>
                  <div className="w-1/2 sm:w-1/4 pl-1">BASIC</div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatAmt(salary.basicSalary)}</div>
                  <div className="w-1/2 sm:w-1/4 pl-1">PROF TAX</div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatAmt(salary.proftax)}</div>
                </div>
                
                {/* Row 2 */}
                <div className="flex-wrap" style={{display: 'flex', minHeight: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div className="w-1/2 sm:w-1/4 pl-1">DA</div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatAmt(salary.da)}</div>
                  <div className="w-1/2 sm:w-1/4 pl-1">PF</div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatAmt(salary.pf)}</div>
                </div>
                
                {/* Row 3 */}
                <div className="flex-wrap" style={{display: 'flex', minHeight: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div className="w-1/2 sm:w-1/4 pl-1">HRA</div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatAmt(salary.hra)}</div>
                  <div className="w-1/2 sm:w-1/4 pl-1">LOSS OF PAY</div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatAmt(salary.lopamount)}</div>
                </div>
                
                {/* Row 4 */}
                <div className="flex-wrap" style={{display: 'flex', minHeight: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div className="w-1/2 sm:w-1/4 pl-1">CONVEYANCE</div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatAmt(salary.conveyance)}</div>
                  <div className="w-1/2 sm:w-1/4 pl-1"></div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]"></div>
                </div>
                
                {/* Row 5 */}
                <div className="flex-wrap" style={{display: 'flex', minHeight: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div className="w-1/2 sm:w-1/4 pl-1">MEDICAL ALLOWANCE</div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatAmt(salary.medicalallowances)}</div>
                  <div className="w-1/2 sm:w-1/4 pl-1"></div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]"></div>
                </div>
                
                {/* Row 6 */}
                <div className="flex-wrap" style={{display: 'flex', minHeight: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div className="w-1/2 sm:w-1/4 pl-1">SPECIAL ALLOWANCE</div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatAmt(salary.specialallowances)}</div>
                  <div className="w-1/2 sm:w-1/4 pl-1"></div>
                  <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]"></div>
                </div>
              </div>
              
              {/* Totals Row */}
              <div className="flex-wrap" style={{display: 'flex', fontFamily: 'Times, serif', fontSize: '10px', fontWeight: 'bold', marginTop: '5px', padding: '5px'}}>
                <div className="w-1/2 sm:w-1/4 pl-1">Total Earnings:</div>
                <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatCurrencyINR(totalEarnings)}</div>
                <div className="w-1/2 sm:w-1/4 pl-1">Total Deductions:</div>
                <div className="w-1/2 sm:w-1/4 text-right pr-2 sm:pr-[50px]">{formatCurrencyINR(totalDeductions)}</div>
              </div>
            </div>

            {/* Net Pay Section */}
            <div className="border border-black border-t-0 p-2">
              <div className="mb-4" style={{marginTop: '10px'}}>
                <p className="italic" style={{fontFamily: 'Times, serif', fontSize: '12px', fontStyle: 'italic'}}>Net Pay for the month: {formatCurrencyINR(netPay)}</p>
                <p className="italic" style={{fontFamily: 'Times, serif', fontSize: '10px', fontStyle: 'italic', marginTop: '5px'}}>({numberToWords(Math.floor(netPay))} Rupees Only)</p>
              </div>
              
              <div className="text-center" style={{marginTop: '40px'}}>
                <p style={{fontFamily: 'Times, serif', fontSize: '12px'}}>This is a system generated and does not require signature</p>
              </div>
            </div>

            {/* Footer */}
             <div className="mt-8 text-center">
               <div className="font-bold mb-1" style={{fontFamily: 'Times, serif', fontSize: '9px', color: '#0066cc'}}>SPESHWAY SOLUTIONS PRIVATE LIMITED</div>
               <div className="italic" style={{fontFamily: 'Times, serif', fontSize: '9px', fontStyle: 'italic', color: 'black'}}>Hitech City, Hyderabad</div>
               <div className="italic" style={{fontFamily: 'Times, serif', fontSize: '9px', fontStyle: 'italic', color: 'black'}}>Email: support@speshwayhrms.com</div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const fetchPayslipBlob = async (salaryId) => {
    const token = sessionStorage.getItem("token");
    const response = await axios.get(`${API_BASE}/api/salary/pdf/${salaryId}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });
    return new Blob([response.data], { type: "application/pdf" });
  };

  const payslipFileName = (empCode, payDate) =>
    `Payslip_${empCode}_${new Date(payDate).toISOString().split("T")[0]}.pdf`;

  // Share the PDF through the device's share sheet (WhatsApp, Gmail, …).
  // Browsers that can't share files (most desktops) download it instead.
  // Mirrors the mobile payslip "Share" button.
  const sharePDF = async (salaryId, empCode, payDate) => {
    try {
      const blob = await fetchPayslipBlob(salaryId);
      const file = new File([blob], payslipFileName(empCode, payDate), { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        const month = new Date(payDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        await navigator.share({ files: [file], title: `Payslip — ${month}`, text: `Payslip for ${month}` });
        return;
      }
      downloadPDF(salaryId, empCode, payDate, blob);
    } catch (error) {
      if (error?.name !== "AbortError") alert("Failed to share payslip");
    }
  };

  const downloadPDF = async (salaryId, empCode, payDate, existingBlob) => {
    try {
      const blob = existingBlob || (await fetchPayslipBlob(salaryId));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = payslipFileName(empCode, payDate);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to download PDF");
    }
  };

  return (
    <div className="overflow-x-auto p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-ink">Salary Management</h2>
        {user?.role === 'admin' && !id && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/admin-dashboard/salary/payslip-generator")}
              className="bg-accent-600 text-white px-4 py-2 rounded-lg hover:bg-accent-700 transition-colors"
            >
              Generate Payslip
            </button>
            <button
              onClick={() => navigate("/admin-dashboard/salary/template-manager")}
              className="border border-surface-subtle bg-white text-ink px-4 py-2 rounded-lg hover:bg-surface-muted transition-colors"
            >
              Manage Templates
            </button>
            <button
              onClick={() => navigate("/admin-dashboard/salary/payslip-history")}
              className="border border-surface-subtle bg-white text-ink px-4 py-2 rounded-lg hover:bg-surface-muted transition-colors"
            >
              Payslip History
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface p-6 rounded-xl shadow-card">
        <h3 className="text-lg font-semibold text-ink mb-4">Salary Records</h3>



      {!id ? (
        <div className="text-center py-10">
          <p className="text-ink mb-4">Welcome to Salary Management Dashboard</p>
          {user?.role === 'admin' ? (
            <>
              <p className="text-sm text-ink-muted">Use the buttons above to generate payslips, manage templates, or view payslip history.</p>
              <p className="text-sm text-ink-muted mt-2">To view individual employee salary records, go to Employee Management and click the "Salary" button for a specific employee.</p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Your salary information will be displayed here when available.</p>
          )}
        </div>
      ) : salaries.length === 0 ? (
        <EmptyState title="No records found" message="No salary records are available yet." />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm text-ink border border-surface-subtle rounded-lg overflow-hidden">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-6 py-3 border-b border-surface-subtle text-center whitespace-nowrap font-medium text-ink-muted">SNO</th>
                <th className="px-6 py-3 border-b border-surface-subtle text-center whitespace-nowrap font-medium text-ink-muted">Emp ID</th>
                <th className="px-6 py-3 border-b border-surface-subtle text-center whitespace-nowrap font-medium text-ink-muted">Salary</th>
                <th className="px-6 py-3 border-b border-surface-subtle text-center whitespace-nowrap font-medium text-ink-muted">Deduction</th>
                <th className="px-6 py-3 border-b border-surface-subtle text-center whitespace-nowrap font-medium text-ink-muted">Total</th>
                <th className="px-6 py-3 border-b border-surface-subtle text-center whitespace-nowrap font-medium text-ink-muted">Payslip Month</th>
                <th className="px-6 py-3 border-b border-surface-subtle text-center whitespace-nowrap font-medium text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((salary, index) => (
                <tr key={salary._id} className={`${index % 2 === 0 ? "bg-surface" : "bg-surface-muted"} hover:bg-surface-muted transition-colors`}>
                  <td className="px-6 py-3 border-b border-surface-subtle text-center">{index + 1}</td>
                  <td className="px-6 py-3 border-b border-surface-subtle text-center">
                    {(() => {
                      if (salary.employeeId) {
                        if (typeof salary.employeeId === 'object' && salary.employeeId.employeeId) {
                          return salary.employeeId.employeeId;
                        } else if (typeof salary.employeeId === 'string') {
                          return salary.employeeId;
                        }
                      }
                      return 'N/A';
                    })()}
                  </td>
                  <td className="px-6 py-3 border-b border-surface-subtle text-center">{Number(salary.basicSalary).toFixed(2)}</td>
                  <td className="px-6 py-3 border-b border-surface-subtle text-center">{Number(salary.deductions).toFixed(2)}</td>
                  <td className="px-6 py-3 border-b border-surface-subtle text-center font-medium text-accent-700">{Number(salary.netSalary).toFixed(2)}</td>
                  <td className="px-6 py-3 border-b border-surface-subtle text-center whitespace-nowrap">{salary.month ? `${salary.month} ${salary.year}` : '-'}</td>
                  <td className="px-6 py-3 border-b border-surface-subtle text-center">
                    <div className="flex justify-center gap-1">
                      <ActionIconButton
                        icon={FiEye}
                        label="Preview payslip"
                        color="brand"
                        onClick={() => setSelectedSalary(salary)}
                      />
                      <ActionIconButton
                        icon={FiDownload}
                        label={`Download payslip PDF for ${salary?.employeeId?.employeeId || salary?.employeeId || 'employee'}`}
                        color="accent"
                        onClick={() =>
                          downloadPDF(salary._id, salary?.employeeId?.employeeId || salary?.employeeId, salary.payDate)
                        }
                      />
                      <ActionIconButton
                        icon={FiShare2}
                        label="Share payslip"
                        color="brand"
                        onClick={() =>
                          sharePDF(salary._id, salary?.employeeId?.employeeId || salary?.employeeId, salary.payDate)
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Mobile: square cards */}
          <div className="sm:hidden grid grid-cols-1 gap-3">
            {salaries.map((salary, index) => {
              const empId = (() => {
                if (salary.employeeId) {
                  if (typeof salary.employeeId === 'object' && salary.employeeId.employeeId) {
                    return salary.employeeId.employeeId;
                  } else if (typeof salary.employeeId === 'string') {
                    return salary.employeeId;
                  }
                }
                return 'N/A';
              })();
              return (
                <div
                  key={salary._id}
                  className="bg-white border border-surface-subtle rounded-xl p-4 shadow-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-ink">
                        {salary.month} {salary.year}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent-50 text-accent-700">Payslip</span>
                  </div>

                  <div className="mb-3">
                    <div className="text-[11px] text-ink-faint uppercase tracking-wide">Net Salary</div>
                    <div className="text-2xl font-bold text-accent-700">₹{Number(salary.netSalary).toFixed(2)}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-surface-subtle text-xs">
                    <div>
                      <div className="text-ink-faint">Emp ID</div>
                      <div className="font-medium text-ink truncate">{empId}</div>
                    </div>
                    <div>
                      <div className="text-ink-faint">Salary</div>
                      <div className="font-medium text-ink truncate">₹{Number(salary.basicSalary).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-ink-faint">Deduction</div>
                      <div className="font-medium text-ink truncate">₹{Number(salary.deductions).toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedSalary(salary)}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-surface-subtle bg-white text-ink text-sm font-bold hover:bg-surface-muted transition-colors"
                    >
                      <FiEye size={15} /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPDF(salary._id, empId, salary.payDate)}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-sm font-bold transition-colors"
                    >
                      <FiDownload size={15} /> Download
                    </button>
                    <button
                      type="button"
                      onClick={() => sharePDF(salary._id, empId, salary.payDate)}
                      aria-label="Share payslip"
                      className="flex items-center justify-center w-11 rounded-xl border border-surface-subtle bg-white text-ink hover:bg-surface-muted transition-colors"
                    >
                      <FiShare2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}      </div>
      
      {/* Detailed Salary View Modal */}
      {selectedSalary && (
        <DetailedSalaryView 
          salary={selectedSalary} 
          onClose={() => setSelectedSalary(null)} 
        />
      )}
    </div>
  );
};

export default View;
