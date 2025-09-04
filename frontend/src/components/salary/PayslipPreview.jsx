// src/components/salary/PayslipPreview.jsx
import React, { useState, useEffect } from "react";
import { API_BASE } from "../../utils/apiConfig";
import axios from "axios";

const PayslipPreview = ({ payslip, onClose, onSendEmail, onGenerate, loading }) => {
  const [logoUrl, setLogoUrl] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  if (!payslip) return null;
  
  // Fetch logo on component mount
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        // Try to fetch the logo from the server assets
        const logoPath = `${API_BASE}/assets/logo.png`;
        const response = await fetch(logoPath);
        if (response.ok) {
          setLogoUrl(logoPath);
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };
    
    fetchLogo();
  }, []);

  const formatCurrency = (amount) => {
    return `INR ${Number(amount || 0).toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN');
  };

  // Calculate totals to match PDF
  const totalEarnings = 
    Number(payslip.basicSalary || 0) +
    Number(payslip.da || 0) +
    Number(payslip.hra || 0) +
    Number(payslip.conveyance || 0) +
    Number(payslip.medicalallowances || 0) +
    Number(payslip.specialallowances || 0);

  const totalDeductions =
    Number(payslip.proftax || 0) +
    Number(payslip.pf || 0) +
    Number(payslip.lopamount || 0);

  const netPay = totalEarnings - totalDeductions;

  const handleDownloadPDF = async () => {
    if (!payslip) {
      alert("No payslip data available for download");
      return;
    }

    try {
      setDownloadLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_BASE}/api/payslip/download-preview`, {
        payslipData: payslip
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: "blob",
      });
      
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const datePart = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `Payslip_${payslip.employeeId}_${datePart}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF");
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* PDF-like Content */}
        <div className="p-6 bg-white" style={{ fontFamily: 'Times, serif' }}>
          {/* Header - matching PDF layout */}
          <div className="border-2 border-black p-4 mb-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="w-16 h-16 flex items-center justify-center">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Company Logo" 
                    className="w-full h-full object-contain"
                    onError={() => setLogoUrl(null)}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 border border-gray-400 flex items-center justify-center text-xs">
                    LOGO
                  </div>
                )}
              </div>
              
              {/* Company Info - Center aligned */}
              <div className="flex-1 text-center">
                <h1 className="text-lg font-bold" style={{ fontFamily: 'Times, serif' }}>SPESHWAY SOLUTIONS PVT LTD</h1>
                <p className="text-sm">Hitech City, Hyderabad</p>
                <h2 className="text-sm font-bold mt-1">Payslip for the month of {payslip.month} {payslip.year}</h2>
              </div>
              
              {/* Right side spacer */}
              <div className="w-16"></div>
            </div>
          </div>

          {/* Personal Info Section - matching PDF layout */}
          <div className="border-2 border-black mb-4">
            <div className="grid grid-cols-2 divide-x-2 divide-black">
              {/* Left Column */}
              <div className="p-3 space-y-2">
                <div className="flex">
                  <span className="w-24 text-sm">Name:</span>
                  <span className="text-sm font-medium">{payslip.name || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-sm">Joining Date:</span>
                  <span className="text-sm">{formatDate(payslip.joiningDate)}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-sm">Designation:</span>
                  <span className="text-sm">{payslip.designation || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-sm">Department:</span>
                  <span className="text-sm">{payslip.department || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-sm">Work Days:</span>
                  <span className="text-sm">{payslip.workingdays || 0}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-sm">LOP Days:</span>
                  <span className="text-sm">{payslip.lopDays || 0}</span>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="p-3 space-y-2">
                <div className="flex">
                  <span className="w-24 text-sm">Employee No:</span>
                  <span className="text-sm">{payslip.employeeId || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-sm">Bank Name:</span>
                  <span className="text-sm">{payslip.bankname || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-sm">Bank Account No:</span>
                  <span className="text-sm">{payslip.bankaccountnumber || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-sm">PAN No:</span>
                  <span className="text-sm">{payslip.pan || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-sm">UAN No:</span>
                  <span className="text-sm">{payslip.uan || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions - matching PDF layout */}
          <div className="border-2 border-black mb-4">
            <div className="grid grid-cols-2 divide-x-2 divide-black">
              {/* Earnings */}
              <div className="p-3">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-sm">Earnings</h3>
                  <h3 className="font-bold text-sm">Actual</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>BASIC</span>
                    <span>{Number(payslip.basicSalary || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>DA</span>
                    <span>{Number(payslip.da || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>HRA</span>
                    <span>{Number(payslip.hra || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>CONVEYANCE</span>
                    <span>{Number(payslip.conveyance || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>MEDICAL ALLOWANCE</span>
                    <span>{Number(payslip.medicalallowances || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SPECIAL ALLOWANCE</span>
                    <span>{Number(payslip.specialallowances || 0).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="p-3">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-sm">Deductions</h3>
                  <h3 className="font-bold text-sm">Actual</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>PROF TAX</span>
                    <span>{Number(payslip.proftax || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>PF</span>
                    <span>{Number(payslip.pf || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>LOSS OF PAY</span>
                    <span>{Number(payslip.lopamount || 0).toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Totals */}
            <div className="border-t-2 border-black p-3">
              <div className="grid grid-cols-2">
                <div className="text-sm font-bold">
                  Total Earnings: {formatCurrency(totalEarnings)}
                </div>
                <div className="text-sm font-bold">
                  Total Deductions: {formatCurrency(totalDeductions)}
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Section - matching PDF */}
          <div className="mb-4">
            <div className="text-sm font-bold mb-2">
              Net Pay for the month: {formatCurrency(netPay)}
            </div>
            <div className="text-sm italic">
              ({numberToWords(Math.floor(netPay)).replace(/\b\w/g, c => c.toUpperCase())} Rupees Only)
            </div>
          </div>

          {/* System Generated Message */}
          <div className="text-center text-sm mb-4">
            This is a system generated and does not require signature
          </div>

          {/* Footer - matching PDF */}
          <div className="text-center text-xs text-blue-600 border-t border-gray-300 pt-4">
            <div className="font-bold">SPESHWAY SOLUTIONS PVT LTD</div>
            <div className="italic text-black mt-1">
              Plot No 1/C, Syno 83/1, Raidurgam, Knowledge City Rd, Panmaktha
            </div>
            <div className="italic text-black">
              Hyderabad Telangana 500081 | Email: info@speshway.com
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloadLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {downloadLoading ? 'Downloading...' : 'Download PDF'}
          </button>
          <button
            onClick={onSendEmail}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send to Employee'}
          </button>
          <button
            onClick={onGenerate}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generating...' : 'Generate & Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to convert numbers to words (simplified version)
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(-num);

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

  function convertHundreds(num) {
    let result = '';
    
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      result += teens[num - 10] + ' ';
      num = 0;
    }
    
    if (num > 0) {
      result += ones[num] + ' ';
    }
    
    return result;
  }
};

export default PayslipPreview;