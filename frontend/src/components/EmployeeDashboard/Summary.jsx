import React, { useState, useEffect } from 'react'
import { 
  FaUser, 
  FaCalendarAlt, 
  FaMoneyBillWave, 
  FaChartLine,
  FaClock,
  FaExclamationTriangle,
  FaAward,
  FaSpinner,
  FaChevronRight,
  FaClipboardList,
  FaCalendarCheck,
  FaCoffee
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import axios from 'axios'
import { API_BASE } from '../../utils/apiConfig'
import { useNavigate } from 'react-router-dom'
import { getEmployeeDailyMessage } from '../../utils/greetingUtils'
import useMeta from '../../utils/useMeta'
import ErrorState from '../common/ErrorState'

const Summary = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clickedAction, setClickedAction] = useState(null)
  const [error, setError] = useState(null)

  useMeta({
    title: 'Employee Overview — Speshway HRMS',
    description: 'Personal dashboard with quick actions and monthly stats.',
    keywords: 'employee overview, HRMS',
    image: '/images/Logo.jpg',
    url: `${window.location.origin}/employee-dashboard`
  })



  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  }

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const token = sessionStorage.getItem('token')
        
        // Single API call to get all dashboard data
        const dashboardResponse = await axios.get(`${API_BASE}/api/dashboard/employee-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!dashboardResponse.data.success) {
          setError('Failed to fetch dashboard data')
          return
        }

        // Use backend-calculated data directly
        setDashboardData(dashboardResponse.data.data)
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user])



  // Get current time greeting based on IST
  const getGreeting = () => {
    // Get current time in IST (UTC+5:30)
    const now = new Date()
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
    const hour = istTime.getHours()
    
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Daily motivational messages varying by designation and department
  const motivationalMessage = React.useMemo(
    () => getEmployeeDailyMessage(user, dashboardData),
    [user, dashboardData]
  )







  // Enhanced click handler with visual feedback
  const handleQuickActionClick = (actionTitle, navigationPath) => {
    setClickedAction(actionTitle)
    
    // Add a small delay to show the click feedback
    setTimeout(() => {
      navigate(navigationPath)
      setClickedAction(null)
    }, 200)
  }

  // Quick actions with enhanced navigation
  const quickActions = [
    {
      title: 'Apply Leave',
      icon: <FaCalendarAlt />,
      color: 'bg-brand-600',
      description: 'Submit leave request',
      onClick: () => handleQuickActionClick('Apply Leave', '/employee-dashboard/add-leave')
    },
    {
      title: 'View Payslip',
      icon: <FaMoneyBillWave />,
      color: 'bg-accent-600',
      description: 'Download payslip',
      onClick: () => handleQuickActionClick('View Payslip', `/employee-dashboard/salary/${user._id}`)
    },
    {
      title: 'Mark Attendance',
      icon: <FaClock />,
      color: 'bg-brand-700',
      description: 'Check in/out',
      onClick: () => handleQuickActionClick('Mark Attendance', '/employee-dashboard/attendance')
    },
    {
      title: 'View Profile',
      icon: <FaUser />,
      color: 'bg-ink',
      description: 'Update details',
      onClick: () => handleQuickActionClick('View Profile', `/employee-dashboard/profile/${user._id}`)
    }
  ]

  // Get performance data
  const getPerformanceData = () => {
    if (!dashboardData) return { attendanceRate: 0, performanceScore: 0 }
    
    const { monthlyStats } = dashboardData
    const attendanceRate = monthlyStats?.attendancePercentage || 0
    
    // Calculate performance score based on attendance and other factors
    let performanceScore = attendanceRate
    if (dashboardData.leaveBalance.pendingRequests === 0) performanceScore += 5
    if (attendanceRate >= 95) performanceScore += 10
    
    return {
      attendanceRate: Math.round(attendanceRate),
      performanceScore: Math.min(100, Math.round(performanceScore))
    }
  }

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <motion.div 
      className="space-y-6 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Welcome section skeleton */}
      <div className="bg-white rounded-xl shadow-card p-6 border border-surface-subtle">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-muted rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-surface-muted rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-surface-muted rounded w-2/3"></div>
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="bg-white rounded-xl shadow-card p-6 border border-surface-subtle">
        <div className="animate-pulse">
          <div className="h-6 bg-surface-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-surface-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )

  // Show loading state
  if (loading) {
    return <LoadingSkeleton />
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <ErrorState
          title="Something went wrong"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const performanceData = getPerformanceData()

  return (
    <motion.div 
      className="p-4 md:p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Enhanced Welcome Section */}
      <motion.div
        className="relative overflow-hidden rounded-xl bg-brand-800 p-6 md:p-8 text-white shadow-panel"
        variants={itemVariants}
      >
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div
            className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center"
          >
            <FaUser className="text-2xl text-white" />
          </div>

          <div className="text-center sm:text-left flex-1">
            <p
              className="text-base md:text-lg font-medium text-white/80 mb-1"
            >
              {getGreeting()},
            </p>
            <h1
              className="text-2xl md:text-3xl font-semibold text-white mb-2"
            >
              {user.name}
            </h1>
            <p
              className="text-white/75 text-sm md:text-base"
            >
              {motivationalMessage}
            </p>
          </div>

        </div>
      </motion.div>



      {/* Quick Actions Section */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl md:text-2xl font-semibold text-ink mb-4 flex items-center gap-2">
          <FaChartLine className="text-brand-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const isClicked = clickedAction === action.title
            return (
              <button
                key={index}
                className={`
                  group relative flex flex-col items-center space-y-3 py-4 px-4 rounded-lg
                  transition-colors duration-150 text-white font-medium tracking-wide
                  ${isClicked ? 'bg-accent-700' : `${action.color} hover:opacity-90`}
                `}
                onClick={action.onClick}
                disabled={isClicked}
              >
                {/* Icon */}
                <span className="text-2xl relative z-20">
                  {isClicked ? <FaSpinner className="animate-spin" /> : action.icon}
                </span>

                {/* Title */}
                <span className="text-sm font-medium tracking-wide relative z-20">
                  {isClicked ? 'Loading...' : action.title}
                </span>

                {/* Chevron indicator */}
                <div className="absolute top-2 right-2 text-xs opacity-70">
                  <FaChevronRight />
                </div>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Attendance and Work Policy Guidance Section */}
      <motion.div variants={itemVariants} className="w-full">
        <h2 className="text-xl md:text-2xl font-semibold text-ink mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <FaClock className="text-white text-lg" />
          </div>
          Attendance & Work Policy
        </h2>
        <div
          className="w-full bg-white rounded-xl p-6 md:p-8 border border-surface-subtle shadow-card"
        >
          {/* Header with icon */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-surface-subtle">
            <div className="w-12 h-12 bg-brand-600 rounded-lg flex items-center justify-center">
              <FaClipboardList className="text-white text-xl" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-ink mb-1">Important Guidelines</h3>
              <p className="text-ink-muted">Please follow these policies for smooth operations</p>
            </div>
          </div>

          {/* Policy items */}
          <div className="grid gap-4 md:gap-6">
            {[
              {
                icon: <FaCalendarCheck className="text-accent-600" />,
                title: "Daily Attendance",
                description: "Employees are required to mark their attendance daily.",
                iconBg: "bg-accent-100"
              },
              {
                icon: <FaClock className="text-brand-600" />,
                title: "Working Hours",
                description: "A minimum of eight (8) working hours is mandatory to be considered a full working day.",
                iconBg: "bg-brand-100"
              },
              {
                icon: <FaExclamationTriangle className="text-amber-600" />,
                title: "Partial Attendance",
                description: "Attendance of less than four (4) hours will be treated as absent, while four (4) hours or more will be considered a half day.",
                iconBg: "bg-amber-100"
              },
              {
                icon: <FaCoffee className="text-amber-600" />,
                title: "Break Time Recording",
                description: "It is mandatory to record break time on a daily basis.",
                iconBg: "bg-amber-100"
              },
              {
                icon: <FaCalendarAlt className="text-brand-600" />,
                title: "Leave & WFH Requests",
                description: "Leave and Work From Home (WFH) requests must be submitted at least one day in advance.",
                iconBg: "bg-brand-100"
              }
            ].map((policy, index) => (
              <div
                key={index}
                className="w-full bg-surface-muted rounded-lg p-5 border border-surface-subtle hover:bg-surface-subtle/30 transition-colors duration-150 group"
              >
                <div className="flex items-start gap-4 w-full">
                  <div className={`flex-shrink-0 w-10 h-10 ${policy.iconBg} rounded-lg flex items-center justify-center`}>
                    {policy.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-ink mb-2 text-base">{policy.title}</h4>
                    <p className="text-sm text-ink-muted leading-relaxed">{policy.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-surface-subtle">
                      <span className="text-sm font-semibold text-ink-muted">{index + 1}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>


    </motion.div>
  )
}

export default Summary
