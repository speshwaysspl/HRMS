import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { columns, EmployeeButtons } from '../../utils/EmployeeHelper'
import DataTable from 'react-data-table-component'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { FaPlus, FaSearch, FaFileExcel } from 'react-icons/fa'
import { API_BASE } from '../../utils/apiConfig'
import StatusToggle from './StatusToggle'
import { formatDMY, formatOrdinal } from '../../utils/dateUtils'
import useMeta from '../../utils/useMeta'
import LoadingState from '../common/LoadingState'
import EmptyState from '../common/EmptyState'
import PageHeader from '../common/PageHeader'


const List = () => {
  useMeta({
      title: 'Employees — Speshway HRMS',
      description: 'Browse and manage employee records.',
      keywords: 'employees, HRMS',
      image: '/images/Logo.jpg',
      url: `${window.location.origin}/admin-dashboard/employees`,
      robots: 'noindex,nofollow'
    })
    const [employees, setEmployees] = useState([])
    const [empLoading, setEmpLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef(null)

    const handleDelete = useCallback(async (id) => {
      if(!window.confirm("Are you sure you want to delete this employee?")) return;
      try {
        const response = await axios.delete(
          `${API_BASE}/api/employee/${id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          setEmployees(prevEmployees => prevEmployees.filter(emp => emp._id !== id));
        }
      } catch (error) {
        if(error.response && !error.response.data.success) {
          alert(error.response.data.error)
        } else {
          alert("Server Error in deleting employee")
        }
      }
    }, []);

    useEffect(() => {
        const fetchEmployees = async () => {
            setEmpLoading(true)
          try {
            const responnse = await axios.get(
                `${API_BASE}/api/employee?t=${Date.now()}`,
                {
                    headers: {
                        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                    },
                }
            );
            if (responnse.data.success) {
              let sno = 1;
              const data = responnse.data.employees.map((emp) => {
                 return {
                   _id: emp._id,
                   sno: sno++,
                   employeeId: emp.employeeId,
                   dep_name: emp.department?.dep_name || 'N/A',
                   name: emp.userId?.name || 'N/A',
                   email: emp.userId?.email || 'N/A',
                   designation: emp.designation || 'N/A',
                   dob: emp.dob ? formatDMY(emp.dob) : 'N/A',
                   gender: emp.gender || 'N/A',
                   joiningDate: emp.joiningDate ? formatOrdinal(emp.joiningDate) : 'N/A',
                   mobilenumber: emp.mobilenumber || 'N/A',
                   status: emp.status || 'active',
                   onStatusChange: handleStatusChange,
                   action: (<EmployeeButtons Id={emp._id} onDelete={handleDelete} />),
                 };
               });
              setEmployees(data);
            }
          } catch (error) {
            console.error("Fetch employees error:", error);
            if(error.response) {
              if (error.response.data && !error.response.data.success) {
                alert(error.response.data.error);
              } else {
                alert(`Server Error: ${error.response.status} ${error.response.statusText}`);
              }
            } else if (error.request) {
              alert("No response from server. Please check your network connection.");
            } else {
              alert(`Error: ${error.message}`);
            }
          } finally {
            setEmpLoading(false)
          }
        };
    
        fetchEmployees();
      }, [handleDelete]);

      const handleFilter = useCallback((e) => {
        setSearchQuery(e.target.value);
      }, [])

      const handleStatusChange = useCallback((employeeId, newStatus) => {
        const serverStatus = newStatus.toLowerCase();
        setEmployees(prevEmployees => 
          prevEmployees.map(emp => 
            emp._id === employeeId ? { ...emp, status: serverStatus } : emp
          )
        );
      }, [])

      const handleExport = () => {
        const exportData = employees.map(emp => ({
            "Employee ID": emp.employeeId,
            "Name": emp.name,
            "Department": emp.dep_name,
            "Designation": emp.designation,
            "DOB": emp.dob,
            "Gender": emp.gender || 'N/A',
            "Joining Date": emp.joiningDate,
            "Mobile Number": emp.mobilenumber,
            "Email": emp.email,
            "Status": emp.status
        }));
    
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
        XLSX.writeFile(workbook, "employees.xlsx");
      };

      const handleImportChange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setImporting(true);
        try {
          const formData = new FormData();
          formData.append('file', file);
          const response = await axios.post(
            `${API_BASE}/api/employee/import-excel`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                'Content-Type': 'multipart/form-data',
              },
            }
          );
          const data = response.data;
          if (data.success) {
            alert(`Imported ${data.createdCount} employees. Skipped: ${data.skippedCount}`);
            window.location.reload();
          } else {
            alert(data.error || "Failed to import employees");
          }
        } catch (error) {
          if (error.response && error.response.data && error.response.data.error) {
            alert(error.response.data.error);
          } else {
            alert("Server error in importing employees");
          }
        } finally {
          setImporting(false);
          if (e.target) {
            e.target.value = '';
          }
        }
      };

      const filteredEmployee = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(emp => emp.name.toLowerCase().includes(q) || String(emp.employeeId || '').toLowerCase().includes(q));
      }, [employees, searchQuery]);

      const tableStyles = useMemo(() => ({
        headRow: {
          style: {
            backgroundColor: '#f6f7fb',
            borderBottom: '1px solid #eef0f6',
            minHeight: '48px',
          },
        },
        headCells: {
          style: {
            fontSize: '13px',
            fontWeight: '600',
            color: '#5b6376',
            paddingLeft: '12px',
            paddingRight: '12px',
          },
        },
        rows: {
          style: {
            minHeight: '60px',
            '&:hover': {
              backgroundColor: '#f6f7fb',
            },
            borderBottom: '1px solid #eef0f6',
          },
        },
        cells: {
          style: {
            fontSize: '14px',
            color: '#1c2333',
            paddingLeft: '12px',
            paddingRight: '12px',
          },
        },
        pagination: {
          style: {
            borderTop: '1px solid #eef0f6',
            backgroundColor: '#ffffff',
          },
        },
      }), [])



      if(empLoading) {
        return (
          <div>
            <PageHeader
              title="Manage Employees"
              subtitle="Efficiently manage your workforce with our comprehensive employee management system"
            />
            <div className="bg-white rounded-xl shadow-card border border-surface-subtle p-8 md:p-12">
              <LoadingState message="Please wait while we fetch the employee data..." />
            </div>
          </div>
        )
      }

  return (
    <div>
      <PageHeader
        title="Manage Employees"
        subtitle="Efficiently manage your workforce with our comprehensive employee management system"
      />

      <div className="bg-white rounded-xl shadow-card border border-surface-subtle p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Search by name or employee ID..."
                className="w-full sm:w-80 pl-10 pr-4 py-3 border border-surface-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors bg-white text-ink placeholder-ink-faint"
                onChange={handleFilter}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="file"
                accept=".xlsx,.xls"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImportChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={importing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-surface-subtle bg-white rounded-lg text-ink font-medium hover:bg-surface-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FaFileExcel className="text-sm" />
                {importing ? 'Importing...' : 'Import'}
              </button>
              <button
                onClick={handleExport}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-surface-subtle bg-white rounded-lg text-ink font-medium hover:bg-surface-muted transition-colors"
              >
                <FaFileExcel className="text-sm" />
                Export
              </button>
              <Link
                to="/admin-dashboard/add-employee"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-accent-600 rounded-lg text-white font-medium hover:bg-accent-700 transition-colors"
              >
                <FaPlus className="text-sm" />
                Add New Employee
              </Link>
            </div>
          </div>
        </div>
        {/* Mobile Card View */}
        <div className="block md:hidden">
          {filteredEmployee.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card border border-surface-subtle">
              <EmptyState icon={FaSearch} title="No employees found" message="Try adjusting your search criteria" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmployee.map((employee, index) => (
                <div key={employee._id} className="bg-white rounded-xl shadow-card border border-surface-subtle overflow-hidden">
                  <div className="p-4">
                    {/* Header with Name, ID and Serial Number */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-ink mb-1 flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${employee.status === "active" ? "bg-accent-500" : "bg-red-500"}`}
                            title={employee.status === "active" ? "Active" : "Inactive"}
                          />
                          {employee.name}
                        </h4>
                        <p className="text-sm text-ink-muted font-medium">ID: {employee.employeeId}</p>
                      </div>
                      <span className="bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full">
                        #{employee.sno}
                      </span>
                    </div>

                    {/* Employee Details Grid - Organized like table columns */}
                    <div className="space-y-3 text-sm mb-4">
                      {/* Primary Information */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-ink-muted text-xs uppercase tracking-wide">Department</span>
                          <span className="text-ink font-medium">{employee.dep_name}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-ink-muted text-xs uppercase tracking-wide">Designation</span>
                          <span className="text-ink font-medium">{employee.designation}</span>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="bg-surface-muted rounded-lg p-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-ink-muted min-w-[50px]">Email:</span>
                            <span className="text-ink break-all text-xs">{employee.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-ink-muted min-w-[50px]">Mobile:</span>
                            <span className="text-ink">{employee.mobilenumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Date Information */}
                      <div className="flex flex-col">
                        <span className="font-medium text-ink-muted text-xs uppercase tracking-wide">Joining Date</span>
                        <span className="text-ink">{employee.joiningDate}</span>
                      </div>
                    </div>

                    {/* Status and Actions Section */}
                    <div className="border-t border-surface-subtle pt-4">
                      <div className="flex flex-col gap-3">
                        {/* Status Toggle */}
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-ink-muted">Status:</span>
                          <StatusToggle
                            employeeId={employee._id}
                            currentStatus={employee.status}
                            onStatusChange={employee.onStatusChange}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-ink-muted">Actions:</span>
                          <EmployeeButtons Id={employee._id} onDelete={handleDelete} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className='hidden md:block'>
          {filteredEmployee.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card border border-surface-subtle">
              <EmptyState icon={FaSearch} title="No employees found" message="Try adjusting your search criteria or add new employees" />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-card border border-surface-subtle">
              <DataTable
                columns={columns}
                data={filteredEmployee}
                pagination
                responsive
                customStyles={tableStyles}
                paginationComponentOptions={{
                  rowsPerPageText: 'Rows per page:',
                  rangeSeparatorText: 'of',
                  selectAllRowsItem: true,
                  selectAllRowsItemText: 'All',
                }}
              />
            </div>
          )}
        </div>
    </div>
  )
}

export default List;
