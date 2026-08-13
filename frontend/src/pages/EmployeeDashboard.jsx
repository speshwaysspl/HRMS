import {Outlet} from 'react-router-dom'
import useMeta from '../utils/useMeta'
import { useMemo, useState, Suspense } from 'react'
import Breadcrumbs from '../components/common/Breadcrumbs'
import Sidebar from '../components/EmployeeDashboard/Sidebar'
import Navbar from '../components/dashboard/Navbar'
import LoadingState from '../components/common/LoadingState'

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <div className='flex min-h-screen bg-surface-muted'>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 min-w-0 transition-all duration-200 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Navbar onMenuClick={() => setSidebarOpen((o) => !o)} />
        <div className='p-4 md:p-6 min-h-screen max-w-[1800px] mx-auto w-full'>
          <Breadcrumbs />
          <Suspense fallback={<LoadingState message="Loading…" />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard
