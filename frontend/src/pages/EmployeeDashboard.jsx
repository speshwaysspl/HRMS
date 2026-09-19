import {Outlet, useLocation} from 'react-router-dom'
import useMeta from '../utils/useMeta'
import { useMemo, useState, Suspense } from 'react'
import Breadcrumbs from '../components/common/Breadcrumbs'
import Sidebar from '../components/EmployeeDashboard/Sidebar'
import MobileBottomNav from '../components/EmployeeDashboard/MobileBottomNav'
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
  // Open by default on desktop (matches the md:ml-64 breakpoint below), closed
  // on mobile so the sidebar overlay doesn't cover the screen on first load.
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
  const location = useLocation()
  // The Home page builds its own full mobile header (photo background +
  // hamburger + title + bell + greeting, matching the Flutter app's app
  // bar exactly) — so the generic mobile bar is hidden there to avoid a
  // duplicate/second bar. Every other employee page keeps the plain bar.
  const isHome = location.pathname === '/employee-dashboard'
  const toggleSidebar = () => setSidebarOpen((o) => !o)
  return (
    <div className='flex min-h-screen bg-surface-muted'>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 min-w-0 transition-all duration-200 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Navbar onMenuClick={toggleSidebar} variant="employee" hideMobileBar={isHome} />
        <div className='p-4 md:p-6 pb-24 md:pb-6 min-h-screen max-w-[1800px] mx-auto w-full'>
          {!isHome && <Breadcrumbs />}
          <Suspense fallback={<LoadingState message="Loading…" />}>
            <Outlet context={{ toggleSidebar }} />
          </Suspense>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}

export default EmployeeDashboard
