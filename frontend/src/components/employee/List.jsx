import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { columns, EmployeeButtons } from '../../utils/EmployeeHelper'
import DataTable from 'react-data-table-component'
import axios from 'axios'
import { FaPlus, FaSearch } from 'react-icons/fa'
import { API_BASE } from '../../utils/apiConfig'


const List = () => {
    const [employees, setEmployees] = useState([])
    const [empLoading, setEmpLoading] = useState(false)
    const [filteredEmployee, setFilteredEmployee] = useState([])


    useEffect(() => {
        const fetchEmployees = async () => {
            setEmpLoading(true)
          try {
            const responnse = await axios.get(
                `${API_BASE}/api/employee?t=${Date.now()}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );
            if (responnse.data.success) {
              let sno = 1;
              const data = await responnse.data.employees.map((emp) => {
                 return {
                   _id: emp._id,
                   sno: sno++,
                   employeeId: emp.employeeId,
                   dep_name: emp.department.dep_name,
                   name: emp.userId.name,
                   email: emp.userId.email,
                   designation: emp.designation,
                   dob: new Date(emp.dob).toLocaleDateString(),
                   joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A',
                   mobilenumber: emp.mobilenumber || 'N/A',
                   status: emp.status || 'active',
                   onStatusChange: handleStatusChange,
                   action: (<EmployeeButtons Id={emp._id} />),
                 };
               });
              setEmployees(data);
              setFilteredEmployee(data)
            }
          } catch (error) {
            console.log(error.message)
            if(error.response && !error.response.data.success) {
              alert(error.response.data.error)
            }
          } finally {
            setEmpLoading(false)
          }
        };
    
        fetchEmployees();
      }, []);

      const handleFilter = (e) => {
        const records = employees.filter((emp) => (
          emp.name.toLowerCase().includes(e.target.value.toLowerCase())
        ))
        setFilteredEmployee(records)
      }

      const handleStatusChange = (employeeId, newStatus) => {
        const serverStatus = newStatus.toLowerCase();
        setEmployees(prevEmployees => 
          prevEmployees.map(emp => 
            emp._id === employeeId ? { ...emp, status: serverStatus } : emp
          )
        );
        setFilteredEmployee(prevFiltered => 
          prevFiltered.map(emp => 
            emp._id === employeeId ? { ...emp, status: serverStatus } : emp
          )
        );
      };



      if(empLoading) {
        return (
          <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6'>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-6 md:mb-8">
                <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Manage Employees
                </h3>
                <p className="text-gray-600 text-sm md:text-base">Efficiently manage your workforce with our comprehensive employee management system</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 md:p-12">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-600 rounded-full animate-spin animation-delay-150"></div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Employees</h3>
                    <p className="text-gray-500">Please wait while we fetch the employee data...</p>
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-100"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce animation-delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6'>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Manage Employees
          </h3>
          <p className="text-gray-600 text-sm md:text-base">Efficiently manage your workforce with our comprehensive employee management system</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees by name..."
                className="w-full sm:w-80 pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                onChange={handleFilter}
              />
            </div>
            <Link
              to="/admin-dashboard/add-employee"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg text-white font-medium hover:from-teal-700 hover:to-teal-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <FaPlus className="text-sm" />
              Add New Employee
            </Link>
          </div>
        </div>
        {/* Mobile Card View */}
        <div className="block md:hidden">
          {filteredEmployee.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
              <div className="text-gray-400 mb-4">
                <FaSearch className="mx-auto text-4xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No employees found</h3>
              <p className="text-gray-500">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmployee.map((employee, index) => (
                <div key={employee._id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-500 to-blue-500 h-2"></div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 mb-1">{employee.name}</h4>
                        <p className="text-sm text-gray-500 font-medium">ID: {employee.employeeId}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                          #{employee.sno}
                        </span>
                        <div className="text-right">
                          {employee.action}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                        <span className="font-medium text-gray-600 min-w-[80px]">Email:</span>
                        <span className="text-gray-800 break-all">{employee.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span className="font-medium text-gray-600 min-w-[80px]">Department:</span>
                        <span className="text-gray-800">{employee.dep_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span className="font-medium text-gray-600 min-w-[80px]">Designation:</span>
                        <span className="text-gray-800">{employee.designation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="font-medium text-gray-600 min-w-[80px]">Mobile:</span>
                        <span className="text-gray-800">{employee.mobilenumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        <span className="font-medium text-gray-600 min-w-[80px]">DOB:</span>
                        <span className="text-gray-800">{employee.dob}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        <span className="font-medium text-gray-600 min-w-[80px]">Joined:</span>
                        <span className="text-gray-800">{employee.joiningDate}</span>
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
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
              <div className="text-gray-400 mb-6">
                <FaSearch className="mx-auto text-6xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-3">No employees found</h3>
              <p className="text-gray-500 text-lg">Try adjusting your search criteria or add new employees</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-blue-500 h-1"></div>
              <DataTable 
                columns={columns} 
                data={filteredEmployee} 
                pagination 
                responsive
                customStyles={{
                  headRow: {
                    style: {
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      minHeight: '52px',
                    },
                  },
                  headCells: {
                    style: {
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                    },
                  },
                  rows: {
                    style: {
                      minHeight: '60px',
                      '&:hover': {
                        backgroundColor: '#f1f5f9',
                        cursor: 'pointer',
                      },
                      borderBottom: '1px solid #f1f5f9',
                    },
                  },
                  cells: {
                    style: {
                      fontSize: '14px',
                      color: '#374151',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                    },
                  },
                  pagination: {
                    style: {
                      borderTop: '2px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                    },
                  },
                }}
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
    </div>
  )
}

export default List;