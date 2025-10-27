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

const Summary = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clickedAction, setClickedAction] = useState(null)
  const [error, setError] = useState(null)



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
        const token = localStorage.getItem('token')
        
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
      color: 'from-blue-500 to-blue-600',
      description: 'Submit leave request',
      onClick: () => handleQuickActionClick('Apply Leave', '/employee-dashboard/add-leave')
    },
    {
      title: 'View Payslip',
      icon: <FaMoneyBillWave />,
      color: 'from-green-500 to-green-600',
      description: 'Download payslip',
      onClick: () => handleQuickActionClick('View Payslip', `/employee-dashboard/salary/${user._id}`)
    },
    {
      title: 'Mark Attendance',
      icon: <FaClock />,
      color: 'from-purple-500 to-purple-600',
      description: 'Check in/out',
      onClick: () => handleQuickActionClick('Mark Attendance', '/employee-dashboard/attendance')
    },
    {
      title: 'View Profile',
      icon: <FaUser />,
      color: 'from-orange-500 to-orange-600',
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
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
      
      {/* Quick actions skeleton */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
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
        <div className="text-center">
          <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
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
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 md:p-8 text-white shadow-2xl"
        variants={itemVariants}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/10">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <motion.div 
            className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <FaUser className="text-3xl text-white" />
          </motion.div>
          
          <div className="text-center sm:text-left flex-1">
            <motion.p 
              className="text-lg md:text-xl font-medium text-white/90 mb-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {getGreeting()}, 
            </motion.p>
            <motion.h1 
              className="text-2xl md:text-4xl font-bold text-white mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {user.name}
            </motion.h1>
            <motion.p 
              className="text-white/80 text-sm md:text-base"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              {motivationalMessage}
            </motion.p>
          </div>
          

        </div>
      </motion.div>



      {/* Quick Actions Section */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FaChartLine className="text-indigo-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const isClicked = clickedAction === action.title
            return (
              <motion.button
                key={index}
                className={`
                  group relative flex flex-col items-center space-y-3 py-4 px-4 rounded-lg 
                  transition-all duration-500 text-white font-semibold tracking-wide
                  ${isClicked 
                    ? `bg-gradient-to-r from-teal-500 to-green-500 shadow-xl scale-105` 
                    : `bg-gradient-to-r ${action.color} hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:shadow-xl hover:scale-105`
                  }
                `}
                whileHover={{ 
                  scale: isClicked ? 1.05 : 1.05
                }}
                whileTap={{ 
                  scale: 0.98
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 250,
                  duration: 0.5
                }}
                onClick={action.onClick}
                disabled={isClicked}
              >
                {/* Animated Glow on Hover - matching sidebar */}
                <motion.div
                  className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100"
                  initial={false}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Click feedback overlay */}
                {isClicked && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-white/20 rounded-lg z-10"
                  />
                )}
                
                {/* Icon with sidebar-style animation */}
                <motion.span
                  whileHover={{ scale: isClicked ? 1 : 1.3, rotate: isClicked ? 0 : 12 }}
                  animate={{ 
                    rotate: isClicked ? 360 : 0
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 250,
                    duration: isClicked ? 0.5 : 0.3
                  }}
                  className="text-2xl relative z-20"
                >
                  {isClicked ? <FaSpinner className="animate-spin" /> : action.icon}
                </motion.span>
                
                {/* Title with sidebar-style typography */}
                <span className="text-sm font-semibold tracking-wide relative z-20">
                  {isClicked ? 'Loading...' : action.title}
                </span>
                
                {/* Chevron indicator like sidebar */}
                <motion.div
                  className="absolute top-2 right-2 text-xs opacity-70"
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <FaChevronRight />
                </motion.div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Attendance and Work Policy Guidance Section */}
      <motion.div variants={itemVariants} className="w-full">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <FaClock className="text-white text-lg" />
          </div>
          Attendance & Work Policy
        </h2>
        <motion.div 
          className="w-full bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {/* Header with icon */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaClipboardList className="text-white text-2xl" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800 mb-1">Important Guidelines</h3>
              <p className="text-gray-600">Please follow these policies for smooth operations</p>
            </div>
          </div>

          {/* Policy items */}
          <div className="grid gap-4 md:gap-6">
            {[
              {
                icon: <FaCalendarCheck className="text-green-600" />,
                title: "Daily Attendance",
                description: "Employees are required to mark their attendance daily.",
                color: "from-green-50 to-emerald-50",
                borderColor: "border-green-200",
                iconBg: "bg-green-100"
              },
              {
                icon: <FaClock className="text-blue-600" />,
                title: "Working Hours",
                description: "A minimum of eight (8) working hours is mandatory to be considered a full working day.",
                color: "from-blue-50 to-sky-50",
                borderColor: "border-blue-200",
                iconBg: "bg-blue-100"
              },
              {
                icon: <FaExclamationTriangle className="text-amber-600" />,
                title: "Partial Attendance",
                description: "Attendance of less than four (4) hours will be treated as absent, while four (4) hours or more will be considered a half day.",
                color: "from-amber-50 to-yellow-50",
                borderColor: "border-amber-200",
                iconBg: "bg-amber-100"
              },
              {
                icon: <FaCoffee className="text-orange-600" />,
                title: "Break Time Recording",
                description: "It is mandatory to record break time on a daily basis.",
                color: "from-orange-50 to-red-50",
                borderColor: "border-orange-200",
                iconBg: "bg-orange-100"
              },
              {
                icon: <FaCalendarAlt className="text-purple-600" />,
                title: "Leave & WFH Requests",
                description: "Leave and Work From Home (WFH) requests must be submitted at least one day in advance.",
                color: "from-purple-50 to-pink-50",
                borderColor: "border-purple-200",
                iconBg: "bg-purple-100"
              }
            ].map((policy, index) => (
              <motion.div
                key={index}
                className={`w-full bg-gradient-to-r ${policy.color} rounded-xl p-5 border ${policy.borderColor} hover:shadow-lg hover:border-opacity-60 transition-all duration-300 group`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start gap-4 w-full">
                  <div className={`flex-shrink-0 w-12 h-12 ${policy.iconBg} rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300`}>
                    {policy.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 mb-2 text-base">{policy.title}</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{policy.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 group-hover:shadow-md transition-all duration-300">
                      <span className="text-sm font-bold text-gray-600">{index + 1}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>


    </motion.div>
  )
}

export default Summary
