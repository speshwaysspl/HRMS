import Sidebar from '../components/EmployeeDashboard/Sidebar'
import {Outlet} from 'react-router-dom'
import Navbar from '../components/dashboard/Navbar'

const EmployeeDashboard = () => {
  return (
    <div className='flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100'>
      <Sidebar />
      <div className='flex-1 md:ml-64 ml-0 transition-all duration-300'>
        <Navbar />
        <div className='p-4 md:p-6 pt-20 md:pt-6 pl-4 md:pl-6 pr-4 md:pr-6 min-h-screen'>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard