import AdminSidebar from '../components/dashboard/AdminSidebar'
import Navbar from '../components/dashboard/Navbar'
import AdminSummary from '../components/dashboard/AdminSummary'
import { Outlet } from 'react-router-dom'

const AdminDashboard = () => {
  return (
    <div className='flex min-h-screen bg-gray-50'>
      <AdminSidebar />
      <div className='flex-1 md:ml-64 ml-0 transition-all duration-300'>
        <Navbar />
        <div className='p-2 sm:p-4 md:p-6 pt-16 sm:pt-18 md:pt-20 lg:pt-6'>
          <Outlet />
        </div>
      </div>
    </div>
    
  )
}

export default AdminDashboard