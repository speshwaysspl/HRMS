import {Outlet} from 'react-router-dom'
import useMeta from '../utils/useMeta'
import { useMemo, Suspense, lazy } from 'react'

const Sidebar = lazy(() => import('../components/EmployeeDashboard/Sidebar'))
const Navbar = lazy(() => import('../components/dashboard/Navbar'))

const EmployeeDashboard = () => {
  const canonical = useMemo(() => `${window.location.origin}/employee-dashboard`, [])
  useMeta({
    title: 'Employee Dashboard — Speshway HRMS',
    description: 'View attendance, apply leave, access payslips and announcements.',
    keywords: 'employee dashboard, HRMS',
    url: canonical,
    image: '/images/Logo.jpg',
    robots: 'noindex,nofollow'
  })
  return (
    <div className='flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100'>
      <Suspense fallback={<div className='md:w-64 w-0' />}>
        <Sidebar />
      </Suspense>
      <div className='flex-1 md:ml-64 ml-0 transition-all duration-300'>
        <Suspense fallback={<div className='h-16' />}>
          <Navbar />
        </Suspense>
        <div className='p-4 md:p-6 pt-20 md:pt-6 pl-4 md:pl-6 pr-4 md:pr-6 min-h-screen'>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard
