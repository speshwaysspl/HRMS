import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { columns, EmployeeButtons } from '../../utils/EmployeeHelper'
import DataTable from 'react-data-table-component'
import axios from 'axios'
import { FaPlus, FaSearch } from 'react-icons/fa'


const List = () => {
    const [employees, setEmployees] = useState([])
    const [empLoading, setEmpLoading] = useState(false)
    const [filteredEmployee, setFilteredEmployee] = useState([])


    useEffect(() => {
        const fetchEmployees = async () => {
            setEmpLoading(true)
          try {
            const responnse = await axios.get(
                `http://localhost:5000/api/employee?t=${Date.now()}`,
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
                   dob: new Date(emp.dob).toLocaleDateString(),
                   profileImage: <img width={40} className='rounded-full' src={`http://localhost:5000/${emp.userId.profileImage}`} />,
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
        return <div>Loading ...</div>
      }

  return (
    <div className='p-4 md:p-6'>
        <div className="text-center mb-4 md:mb-6">
        <h3 className="text-xl md:text-2xl font-bold">Manage Employee</h3>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search By Name"
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          onChange={handleFilter}
        />
        <Link
          to="/admin-dashboard/add-employee"
          className="w-full sm:w-auto px-4 py-2 bg-teal-600 rounded-md text-white text-center hover:bg-teal-700 transition-colors"
        >
          Add New Employee
        </Link>
      </div>
      {/* Mobile Card View */}
      <div className="block md:hidden mt-4">
        {filteredEmployee.map((employee, index) => (
          <div key={employee._id} className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0">
                {employee.profileImage}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{employee.name}</h4>
                    <p className="text-sm text-gray-600">ID: {employee.employeeId}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                    #{employee.sno}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div><span className="font-medium text-gray-600">Department:</span> {employee.dep_name}</div>
                  <div><span className="font-medium text-gray-600">DOB:</span> {employee.dob}</div>
                  <div><span className="font-medium text-gray-600">Status:</span> {employee.status}</div>
                </div>
                <div className="flex justify-end">
                  {employee.action}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className='hidden md:block mt-4 md:mt-6 overflow-x-auto'>
        <DataTable columns={columns} data={filteredEmployee} pagination responsive/>
      </div>
    </div>
  )
}

export default List;