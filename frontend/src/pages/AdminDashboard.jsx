import { Outlet } from 'react-router-dom'
import useMeta from '../utils/useMeta'
import { useMemo, Suspense, lazy, useState } from 'react'

const AdminSidebar = lazy(() => import('../components/dashboard/AdminSidebar'))
const Navbar = lazy(() => import('../components/dashboard/Navbar'))

const AdminDashboard = () => {
  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard`, [])
  useMeta({
    title: 'Admin Dashboard — Speshway HRMS',
    description: 'Manage employees, departments, announcements, attendance and payroll.',
    keywords: 'HRMS admin, payroll, attendance, employees',
    url: canonical,
    image: '/images/Logo.jpg',
    robots: 'noindex,nofollow'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className='flex min-h-screen bg-gray-50'>
      <Suspense fallback={<div className='md:w-64 w-0' />}>
        <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </Suspense>
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64 ml-0' : 'ml-0'}`}>
        <Suspense fallback={<div className='h-16' />}>
          <Navbar />
        </Suspense>
        <div className='p-2 sm:p-4 md:p-6 pt-16 sm:pt-14 md:pt-16 lg:pt-16'>
          <Outlet />
        </div>
      </div>
    </div>
    
  )
}

export default AdminDashboard
