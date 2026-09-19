import { Outlet } from 'react-router-dom'
import useMeta from '../utils/useMeta'
import { useMemo, useState, Suspense } from 'react'
import Breadcrumbs from '../components/common/Breadcrumbs'
import AdminSidebar from '../components/dashboard/AdminSidebar'
import Navbar from '../components/dashboard/Navbar'
import LoadingState from '../components/common/LoadingState'

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
  // Open by default on desktop (matches the md:ml-64 breakpoint below), closed
  // on mobile so the sidebar overlay doesn't cover the screen on first load.
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
  return (
    <div className='flex min-h-screen bg-surface-muted'>
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 min-w-0 transition-all duration-200 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Navbar onMenuClick={() => setSidebarOpen((o) => !o)} />
        <div className='p-2 sm:p-4 md:p-6 pb-6 max-w-[1800px] mx-auto w-full'>
          <Breadcrumbs />
          <Suspense fallback={<LoadingState message="Loading…" />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
