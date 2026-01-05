import { Outlet } from 'react-router-dom'
import { Suspense, lazy, useMemo } from 'react'
import useMeta from '../utils/useMeta'

const TeamLeadSidebar = lazy(() => import('../components/dashboard/TeamLeadSidebar'))
const Navbar = lazy(() => import('../components/dashboard/Navbar'))

const TeamLeadDashboard = () => {
  const canonical = useMemo(() => `${window.location.origin}/team-lead-dashboard`, [])
  useMeta({
    title: 'Team Lead Dashboard — Speshway HRMS',
    description: 'Manage team, assign tasks, and track progress.',
    keywords: 'team lead, HRMS, project management',
    url: canonical,
    image: '/images/Logo.jpg',
    robots: 'noindex,nofollow'
  })
  return (
    <div className='flex min-h-screen bg-gray-50'>
      <Suspense fallback={<div className='md:w-64 w-0' />}>
        <TeamLeadSidebar />
      </Suspense>
      <div className='flex-1 md:ml-64 ml-0 transition-all duration-300'>
        <Suspense fallback={<div className='h-16' />}>
          <Navbar />
        </Suspense>
        <div className='p-2 sm:p-4 md:p-6 pt-16 sm:pt-18 md:pt-20 lg:pt-6'>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default TeamLeadDashboard
