import React from 'react'
import Sidebar from '../components/EmployeeDashboard/Sidebar'
import {Outlet} from 'react-router-dom'
import Navbar from '../components/dashboard/Navbar'

const EmployeeDashboard = () => {
  return (
    <div className='flex min-h-screen bg-gray-100'>
      <Sidebar />
      <div className='flex-1 md:ml-64 ml-0 transition-all duration-300'>
        <Navbar />
        <div className='p-4 md:p-6 pt-16 md:pt-6'>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
// import React from 'react'

export default EmployeeDashboard