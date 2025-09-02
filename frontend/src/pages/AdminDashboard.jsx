import React from 'react'
import { useAuth } from '../context/AuthContext'
import AdminSidebar from '../components/dashboard/AdminSidebar'
import Navbar from '../components/dashboard/Navbar'
import AdminSummary from '../components/dashboard/AdminSummary'
import { Outlet } from 'react-router-dom'

const AdminDashboard = () => {
  const {user} = useAuth()
 
  return (
    <div className='flex min-h-screen bg-gray-100'>
      <AdminSidebar />
      <div className='flex-1 md:ml-64 ml-0 transition-all duration-300'>
        <Navbar />
        <div className='p-4 md:p-6 pt-20 md:pt-6 pl-4 md:pl-6 pr-4 md:pr-6'>
          <Outlet />
        </div>
      </div>
    </div>
    
  )
}

export default AdminDashboard