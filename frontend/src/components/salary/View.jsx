// src/components/salary/View.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";

const View = () => {
  const [salaries, setSalaries] = useState([]);

  const [selectedSalary, setSelectedSalary] = useState(null);
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSalaries = async () => {
      try {
        // If no ID is provided (main salary dashboard), don't make API call
        if (!id || id === undefined || id === null || id === '') {
          console.log('No ID provided, skipping API call');
          setSalaries([]);
    
          return;
        }
        
        // Additional validation to ensure we have a valid user role
        if (!user || !user.role) {
          console.error('User or user role not available');
          return;
        }
        
        const response = await axios.get(`${API_BASE}/api/salary/${id}/${user.role}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
      Number(salary.lopamount || 0);

    const netPay = totalEarnings - totalDeductions;
    
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
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Header with Logo */}
            <div style={{border: '1px solid black', height: '70px', display: 'flex', alignItems: 'center', position: 'relative'}}>
              <div style={{width: '70px', height: '66px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', marginLeft: '10px'}}>
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
              <div style={{flex: 1, textAlign: 'center', position: 'absolute', left: 0, right: 0}}>
                <div style={{fontFamily: 'Times, serif', fontSize: '16px', fontWeight: 'bold', marginBottom: '2px'}}>SPESHWAY SOLUTIONS PVT LTD</div>
                <div style={{fontFamily: 'Times, serif', fontSize: '10px', marginBottom: '2px'}}>Hitech City, Hyderabad</div>
                <div style={{fontFamily: 'Times, serif', fontSize: '11px', fontWeight: 'bold'}}>Payslip for the month of {salary.month} {salary.year}</div>
              </div>
            </div>

            {/* Personal Info Section */}
            <div style={{border: '1px solid black', borderTop: 'none', height: '100px', display: 'flex'}}>
              <div style={{width: '50%', padding: '10px', borderRight: '1px solid black'}}>
                <div style={{fontFamily: 'Times, serif', fontSize: '10px', lineHeight: '15px'}}>
                  <div style={{marginBottom: '15px'}}>Name: <span style={{marginLeft: '65px'}}>{salary.name || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Joining Date: <span style={{marginLeft: '32px'}}>{salary.joiningDate ? new Date(salary.joiningDate).toLocaleDateString() : '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Designation: <span style={{marginLeft: '40px'}}>{salary.designation || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Department: <span style={{marginLeft: '40px'}}>{salary.department || '-'}</span></div>
                  <div style={{marginBottom: '15px'}}>Work Days: <span style={{marginLeft: '48px'}}>{salary.workingdays || 0}</span></div>
                  <div>LOP Days: <span style={{marginLeft: '50px'}}>{salary.lopDays || 0}</span></div>
                </div>
              </div>
              <div style={{width: '50%', padding: '10px'}}>
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
            <div style={{border: '1px solid black', borderTop: 'none', height: '140px'}}>
              {/* Headers */}
              <div style={{display: 'flex', fontFamily: 'Times, serif', fontSize: '10px', fontWeight: 'bold', padding: '5px'}}>
                <div style={{width: '25%', paddingLeft: '5px'}}>Earnings</div>
                <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>Actual</div>
                <div style={{width: '25%', paddingLeft: '5px'}}>Deductions</div>
                <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>Actual</div>
              </div>
              
              {/* Earnings and Deductions Rows */}
              <div style={{fontFamily: 'Times, serif', fontSize: '10px'}}>
                {/* Row 1 */}
                <div style={{display: 'flex', height: '18px', alignItems: 'center'}}>
                  <div style={{width: '25%', paddingLeft: '5px'}}>BASIC</div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatAmt(salary.basicSalary)}</div>
                  <div style={{width: '25%', paddingLeft: '5px'}}>PROF TAX</div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatAmt(salary.proftax)}</div>
                </div>
                
                {/* Row 2 */}
                <div style={{display: 'flex', height: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div style={{width: '25%', paddingLeft: '5px'}}>DA</div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatAmt(salary.da)}</div>
                  <div style={{width: '25%', paddingLeft: '5px'}}>PF</div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatAmt(salary.pf)}</div>
                </div>
                
                {/* Row 3 */}
                <div style={{display: 'flex', height: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div style={{width: '25%', paddingLeft: '5px'}}>HRA</div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatAmt(salary.hra)}</div>
                  <div style={{width: '25%', paddingLeft: '5px'}}>LOSS OF PAY</div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatAmt(salary.lopamount)}</div>
                </div>
                
                {/* Row 4 */}
                <div style={{display: 'flex', height: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div style={{width: '25%', paddingLeft: '5px'}}>CONVEYANCE</div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatAmt(salary.conveyance)}</div>
                  <div style={{width: '25%', paddingLeft: '5px'}}></div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}></div>
                </div>
                
                {/* Row 5 */}
                <div style={{display: 'flex', height: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div style={{width: '25%', paddingLeft: '5px'}}>MEDICAL ALLOWANCE</div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatAmt(salary.medicalallowances)}</div>
                  <div style={{width: '25%', paddingLeft: '5px'}}></div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}></div>
                </div>
                
                {/* Row 6 */}
                <div style={{display: 'flex', height: '18px', alignItems: 'center', marginTop: '3px'}}>
                  <div style={{width: '25%', paddingLeft: '5px'}}>SPECIAL ALLOWANCE</div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatAmt(salary.specialallowances)}</div>
                  <div style={{width: '25%', paddingLeft: '5px'}}></div>
                  <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}></div>
                </div>
              </div>
              
              {/* Totals Row */}
              <div style={{display: 'flex', fontFamily: 'Times, serif', fontSize: '10px', fontWeight: 'bold', marginTop: '5px', padding: '5px'}}>
                <div style={{width: '25%', paddingLeft: '5px'}}>Total Earnings:</div>
                <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatCurrencyINR(totalEarnings)}</div>
                <div style={{width: '25%', paddingLeft: '5px'}}>Total Deductions:</div>
                <div style={{width: '25%', textAlign: 'right', paddingRight: '50px'}}>{formatCurrencyINR(totalDeductions)}</div>
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
               <div className="font-bold mb-1" style={{fontFamily: 'Times, serif', fontSize: '9px', color: '#0066cc'}}>SPESHWAY SOLUTIONS PVT LTD</div>
               <div className="italic" style={{fontFamily: 'Times, serif', fontSize: '9px', fontStyle: 'italic', color: 'black'}}>Plot No 1/C, Syno 83/1, Raidurgam, Knowledge City Rd, Panmaktha</div>
               <div className="italic" style={{fontFamily: 'Times, serif', fontSize: '9px', fontStyle: 'italic', color: 'black'}}>Hyderabad Telangana 500081 | Email: info@speshway.com</div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  // Fix the downloadPDF function (around line 299)
  const downloadPDF = async (salaryId, empCode, payDate) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/salary/pdf/${salaryId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const datePart = new Date(payDate).toISOString().split("T")[0];
      link.href = url;
      link.download = `Payslip_${empCode}_${datePart}.pdf`;
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Salary Management</h2>
        {user?.role === 'admin' && (
          <div className="space-x-3">
            <button
              onClick={() => navigate("/admin-dashboard/salary/payslip-generator")}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
            >
              Generate Payslip
            </button>
            <button
              onClick={() => navigate("/admin-dashboard/salary/template-manager")}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
            >
              Manage Templates
            </button>
            <button
              onClick={() => navigate("/admin-dashboard/salary/payslip-history")}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition"
            >
              Payslip History
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Salary Records</h3>
        


      {!id ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Welcome to Salary Management Dashboard</p>
          {user?.role === 'admin' ? (
            <>
              <p className="text-sm text-gray-500">Use the buttons above to generate payslips, manage templates, or view payslip history.</p>
              <p className="text-sm text-gray-500 mt-2">To view individual employee salary records, go to Employee Management and click the "Salary" button for a specific employee.</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Your salary information will be displayed here when available.</p>
          )}
        </div>
      ) : salaries.length === 0 ? (
        <p className="text-center text-gray-500">No Records Found</p>
      ) : (
        <table className="w-full text-sm text-left text-gray-700 border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 border-b">SNO</th>
              <th className="px-6 py-3 border-b">Emp ID</th>
              <th className="px-6 py-3 border-b">Salary</th>
              <th className="px-6 py-3 border-b">Allowance</th>
              <th className="px-6 py-3 border-b">Deduction</th>
              <th className="px-6 py-3 border-b">Total</th>
              <th className="px-6 py-3 border-b">Pay Date</th>
              <th className="px-6 py-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((salary, index) => (
              <tr key={salary._id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-6 py-3 border-b">{index + 1}</td>
                <td className="px-6 py-3 border-b">
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
                <td className="px-6 py-3 border-b">{Number(salary.basicSalary).toFixed(2)}</td>
                <td className="px-6 py-3 border-b">{Number(salary.allowances).toFixed(2)}</td>
                <td className="px-6 py-3 border-b">{Number(salary.deductions).toFixed(2)}</td>
                <td className="px-6 py-3 border-b">{Number(salary.netSalary).toFixed(2)}</td>
                <td className="px-6 py-3 border-b">{new Date(salary.payDate).toLocaleDateString()}</td>
                <td className="px-6 py-3 border-b">
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        downloadPDF(salary._id, salary?.employeeId?.employeeId || salary?.employeeId, salary.payDate)
                      }
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                      aria-label={`Download payslip PDF for ${salary?.employeeId?.employeeId || salary?.employeeId || 'employee'}`}
                    >
                      Download PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
