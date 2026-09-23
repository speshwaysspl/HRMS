import React, { useState, useEffect } from 'react'
import {
  FaUser,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaClock,
  FaExclamationTriangle,
  FaChevronRight,
  FaClipboardList,
  FaCalendarCheck,
  FaCoffee,
  FaSignInAlt,
  FaSignOutAlt,
  FaChartBar,
  FaBolt,
  FaBullhorn,
  FaBars
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import axios from 'axios'
import { API_BASE } from '../../utils/apiConfig'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getEmployeeDailyMessage } from '../../utils/greetingUtils'
import { fetchAnnouncements } from '../../utils/AnnouncementHelper'
import useMeta from '../../utils/useMeta'
import NotificationBell from '../notifications/NotificationBell'
import ErrorState from '../common/ErrorState'

// Same category labels/colors as the Announcements list page — kept in
// sync intentionally (see AnnouncementDetails.jsx / EmployeeAnnouncements.jsx).
const ANNOUNCEMENT_CATEGORY_STYLE = {
  important: { label: 'Important', className: 'text-brand-600' },
  festival: { label: 'Festival', className: 'text-accent-600' },
  event: { label: 'Event', className: 'text-accent-600' },
  achievement: { label: 'Achievement', className: 'text-accent-600' },
  quote: { label: 'Daily Quote', className: 'text-ink-faint' },
}
const announcementCategoryStyle = (category) =>
  ANNOUNCEMENT_CATEGORY_STYLE[category] || { label: 'Announcement', className: 'text-ink-faint' }

// Same 5-color palette + status vocabulary as the Flutter mobile app's
// employee home screen — kept in sync intentionally, see MEMORY.md.
const STATUS_STYLES = {
  'present + overtime': { text: '#16A34A', bg: '#DCFCE7', border: '#A7F3D0', label: 'Present + Overtime' },
  present: { text: '#16A34A', bg: '#DCFCE7', border: '#A7F3D0', label: 'Present' },
  'half day': { text: '#D97706', bg: '#FEF3C7', border: '#FDE68A', label: 'Half Day' },
  leave: { text: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'On Leave' },
  wfh: { text: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'WFH' },
  'checked in': { text: '#0D9488', bg: '#CCFBF1', border: '#99F6E4', label: 'Checked In' },
  absent: { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Absent' },
  default: { text: '#64748B', bg: '#F1F5F9', border: '#E2E8F0', label: 'Not Marked' }
}

const getStatusStyle = (status, inTime, outTime) => {
  const norm = (status || '').toLowerCase()
  if (norm.includes('overtime')) return STATUS_STYLES['present + overtime']
  if (norm.includes('present') && !norm.includes('absent')) return STATUS_STYLES.present
  if (norm.includes('half')) return STATUS_STYLES['half day']
  if (norm.includes('wfh')) return STATUS_STYLES.wfh
  if (norm.includes('leave')) return STATUS_STYLES.leave
  if (norm === 'checked in' || (inTime && !outTime)) return STATUS_STYLES['checked in']
  if (norm.includes('absent')) return STATUS_STYLES.absent
  return { ...STATUS_STYLES.default, label: status || 'Not Marked' }
}

const formatTimeDisplay = (val) => {
  if (!val) return '--:--'
  const s = val.toString().trim()
  if (/am|pm/i.test(s)) return s
  const [h, m] = s.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return s
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`
}

const formatWorkedHours = (hours) => {
  if (!hours || hours <= 0) return '0h 00m'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

const getAnnouncementTime = (dateStr) => {
  if (!dateStr) return ''
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Small circular gauge matching the mobile app's "hours worked" ring. */
const HoursGauge = ({ progress, label, sublabel }) => {
  const size = 66
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(Math.max(progress, 0), 1))
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#0D9488"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-extrabold text-ink">{label}</span>
        <span className="text-[9px] font-medium text-ink-muted">{sublabel}</span>
      </div>
    </div>
  )
}

const Summary = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  // Provided by EmployeeDashboard.jsx via <Outlet context={{ toggleSidebar }} />
  // so this page's own mobile header (below) can open the sidebar drawer,
  // since the generic Navbar's mobile bar is hidden on this page.
  const { toggleSidebar } = useOutletContext() || {}
  const [dashboardData, setDashboardData] = useState(null)
  const [announcements, setAnnouncements] = useState([])
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  }
  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const token = sessionStorage.getItem('token')
        const [dashboardResponse, announcementList] = await Promise.all([
          axios.get(`${API_BASE}/api/dashboard/employee-stats`, { headers: { Authorization: `Bearer ${token}` } }),
          fetchAnnouncements()
        ])

        if (!dashboardResponse.data.success) {
          setError('Failed to fetch dashboard data')
          return
        }

        setDashboardData(dashboardResponse.data.data)
        setAnnouncements(announcementList || [])
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    if (user) load()
  }, [user])

  const getGreeting = () => {
    const now = new Date()
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const hour = istTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const motivationalMessage = React.useMemo(
    () => getEmployeeDailyMessage(user, dashboardData),
    [user, dashboardData]
  )

  const handleQuickActionClick = (actionTitle, navigationPath) => {
    setClickedAction(actionTitle)
    setTimeout(() => {
      navigate(navigationPath)
      setClickedAction(null)
    }, 200)
  }

  // Same 4 actions, styled as colorful gradient tiles matching the mobile
  // app's 2x2 quick-actions grid (icon+chevron header row, title/subtitle).
  const quickActions = [
    {
      title: 'Apply Leave',
      subtitle: 'Request time off',
      icon: <FaCalendarAlt />,
      iconColor: '#16A34A',
      iconBg: '#DCFCE7',
      gradient: 'from-[#F0FDF4] to-white',
      border: '#DCFCE7',
      onClick: () => handleQuickActionClick('Apply Leave', '/employee-dashboard/add-leave')
    },
    {
      title: 'View Payslip',
      subtitle: 'Monthly records',
      icon: <FaMoneyBillWave />,
      iconColor: '#2563EB',
      iconBg: '#DBEAFE',
      gradient: 'from-[#EFF6FF] to-white',
      border: '#DBEAFE',
      onClick: () => handleQuickActionClick('View Payslip', `/employee-dashboard/salary/${user._id}`)
    },
    {
      title: 'Mark Attendance',
      subtitle: 'Punch In / Out',
      icon: <FaClock />,
      iconColor: '#EA580C',
      iconBg: '#FFEDD5',
      gradient: 'from-[#FFF7ED] to-white',
      border: '#FFEDD5',
      onClick: () => handleQuickActionClick('Mark Attendance', '/employee-dashboard/attendance')
    },
    {
      title: 'My Profile',
      subtitle: 'Personal details',
      icon: <FaUser />,
      iconColor: '#9333EA',
      iconBg: '#F3E8FF',
      gradient: 'from-[#FAF5FF] to-white',
      border: '#F3E8FF',
      onClick: () => handleQuickActionClick('View Profile', `/employee-dashboard/profile/${user._id}`)
    }
  ]

  const policies = [
    {
      icon: <FaCalendarCheck />,
      title: 'Daily Attendance',
      description: 'Employees are required to mark their attendance daily.',
      iconBg: '#DCFCE7',
      iconColor: '#15803D'
    },
    {
      icon: <FaClock />,
      title: 'Working Hours',
      description: 'A minimum of eight (8) working hours is mandatory to be considered a full working day.',
      iconBg: '#DBEAFE',
      iconColor: '#2563EB'
    },
    {
      icon: <FaExclamationTriangle />,
      title: 'Partial Attendance',
      description: 'Attendance of less than four (4) hours will be treated as absent, while four (4) hours or more will be considered a half day.',
      iconBg: '#FFEDD5',
      iconColor: '#EA580C'
    },
    {
      icon: <FaCoffee />,
      title: 'Break Time Recording',
      description: 'It is mandatory to record break time on a daily basis.',
      iconBg: '#F3E8FF',
      iconColor: '#9333EA'
    },
    {
      icon: <FaCalendarAlt />,
      title: 'Leave & WFH Requests',
      description: 'Leave and Work From Home (WFH) requests must be submitted at least one day in advance.',
      iconBg: '#EEF1F8',
      iconColor: '#2C3968'
    }
  ]

  const LoadingSkeleton = () => (
    <motion.div className="space-y-6 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="bg-white rounded-xl shadow-card p-6 border border-surface-subtle">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-muted rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-surface-muted rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-surface-muted rounded w-2/3"></div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-card p-6 border border-surface-subtle">
        <div className="animate-pulse">
          <div className="h-6 bg-surface-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-surface-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <ErrorState title="Something went wrong" message={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  const today = dashboardData?.todayAttendance || {}
  const workingHours = Number(today.workingHours) || 0
  const gaugeProgress = Math.min(workingHours / 8, 1)
  const statusStyle = getStatusStyle(today.status, today.inTime, today.outTime)
  const latestAnnouncement = announcements[0]

  return (
    <motion.div className="md:p-6 space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Greeting header — matches the mobile app's app bar exactly: a
          single continuous panel (photo background + gradient scrim) that
          carries the hamburger/title/bell row AND the greeting content
          together, not two separate elements. Full-bleed on mobile via
          negative margins to escape the page's own p-4 padding; on desktop
          it's just the greeting block (the white Navbar above already has
          its own title/bell there, so that row is mobile-only). */}
      <motion.div
        className="relative overflow-hidden -mx-4 -mt-4 md:mx-0 md:mt-0 rounded-b-[22px] md:rounded-2xl text-white md:shadow-panel bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(22,27,53,0.55) 45%, rgba(14,17,34,0.85) 100%), url('/images/appbar_bg.png')" }}
        variants={itemVariants}
      >
        {/* Mobile-only hamburger/title/bell row — desktop keeps the plain
            white Navbar's own row instead (this page hides that bar's
            mobile version specifically to avoid a duplicate). */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4">
          <button
            onClick={toggleSidebar}
            className="flex-shrink-0 p-2 -ml-2 rounded-lg text-white/90 hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <FaBars size={18} />
          </button>
          <div className="flex-1 min-w-0 overflow-hidden h-8 flex items-center" aria-label="Speshway HRMS">
            <h1 className="marquee-title text-[15px] font-extrabold tracking-[0.09em]">
              <span className="text-white">SPESHWAY </span>
              <span className="text-[#10B981]">HRMS</span>
            </h1>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1 [&>div>button]:!text-white/90 [&>div>button:hover]:!text-white [&>div>button:hover]:!bg-white/10">
            <NotificationBell />
          </div>
        </div>

        <div className="p-4 pt-1 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-white/90">{getGreeting()},</p>
              <h2 className="text-xl md:text-2xl font-extrabold text-white truncate flex items-center gap-2 mt-0.5">
                {user.name} <span className="text-lg">👋</span>
              </h2>
              <p className="text-xs md:text-sm text-white/90 mt-0.5 truncate">
                {(() => {
                  const emp = dashboardData?.employee
                  const designation = emp?.designation?.toString().trim()
                  const department = emp?.department?.toString().trim()
                  if (designation) return department ? `${designation} · ${department}` : designation
                  return 'Employee'
                })()}
              </p>
            </div>
            <p className="text-xs md:text-sm font-bold text-white whitespace-nowrap">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="mt-3 inline-flex items-center gap-2 bg-black/40 border border-white/20 rounded-full px-3 py-1.5 max-w-full">
            <span className="text-[#4ADE80] flex-shrink-0">🌿</span>
            <span className="text-xs italic font-medium text-white/95 truncate">“{motivationalMessage}”</span>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions — colorful gradient tiles matching the mobile app */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl md:text-2xl font-semibold text-ink mb-4 flex items-center gap-2">
          <FaBolt className="text-ink" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map((action, index) => {
            const isClicked = clickedAction === action.title
            return (
              <button
                key={index}
                onClick={action.onClick}
                disabled={isClicked}
                className={`group text-left bg-gradient-to-b ${action.gradient} rounded-2xl p-3.5 md:p-4 border transition-shadow hover:shadow-card`}
                style={{ borderColor: action.border }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                    style={{ backgroundColor: action.iconBg, color: action.iconColor }}
                  >
                    {action.icon}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center">
                    <FaChevronRight className="text-[10px]" style={{ color: action.iconColor }} />
                  </span>
                </div>
                <div className="font-bold text-ink text-sm">{isClicked ? 'Loading...' : action.title}</div>
                <div className="text-ink-muted text-xs mt-0.5">{action.subtitle}</div>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Today's Attendance — new, matches the mobile app's home-screen card */}
      <motion.div variants={itemVariants}>
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-surface-subtle shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base md:text-lg font-extrabold text-ink flex items-center gap-2">
              <FaClipboardList className="text-ink" />
              Today's Attendance
            </h3>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
              style={{ color: statusStyle.text, backgroundColor: statusStyle.bg, borderColor: statusStyle.border }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusStyle.text }} />
              {statusStyle.label}
            </span>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <div className="flex items-stretch gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-surface-muted rounded-xl border border-surface-subtle px-2.5 py-2 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center flex-shrink-0">
                <FaSignInAlt size={14} />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] text-ink-muted font-medium">Check In</div>
                <div className="text-sm font-extrabold text-ink truncate">{formatTimeDisplay(today.inTime)}</div>
              </div>
            </div>
            <div className="w-px bg-surface-subtle" />
            <div className="flex-1 flex items-center gap-2 bg-surface-muted rounded-xl border border-surface-subtle px-2.5 py-2 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <FaSignOutAlt size={14} />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] text-ink-muted font-medium">Check Out</div>
                <div className="text-sm font-extrabold text-ink truncate">{formatTimeDisplay(today.outTime)}</div>
              </div>
            </div>
            <HoursGauge progress={gaugeProgress} label={formatWorkedHours(workingHours)} sublabel="Worked" />
          </div>

          <button
            onClick={() => navigate('/employee-dashboard/attendance')}
            className="w-full flex items-center justify-center gap-2 bg-[#064E3B] hover:bg-[#053b2d] text-white font-bold text-sm py-3 rounded-xl transition-colors"
          >
            <FaChartBar size={14} />
            Go to Live Attendance Tracker
            <FaChevronRight size={12} />
          </button>
        </div>
      </motion.div>

      {/* Recent Announcements — new, matches the mobile app's home-screen card */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl md:text-2xl font-semibold text-ink mb-4 flex items-center gap-2">
          <FaBullhorn className="text-ink" />
          Recent Announcements
        </h2>
        {(() => {
          const { label, className } = announcementCategoryStyle(latestAnnouncement?.category)
          return (
            <button
              onClick={() => navigate('/employee-dashboard/announcements')}
              className="w-full text-left rounded-2xl p-4 border border-surface-subtle bg-surface hover:shadow-panel transition-shadow"
            >
              <div className="flex items-start gap-3">
                {latestAnnouncement?.imageUrl && (
                  <img
                    src={latestAnnouncement.imageUrl}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-[10.5px] font-bold uppercase tracking-wide ${className}`}>{label}</span>
                  <div className="font-bold text-ink text-sm leading-snug line-clamp-2 mt-0.5">
                    {latestAnnouncement?.title?.trim() || 'New Holiday List Released'}
                  </div>
                  <div className="text-ink-muted text-xs leading-relaxed line-clamp-2 mt-1.5">
                    {latestAnnouncement?.description?.trim() || 'Please check the updated holiday calendar.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                  <FaClock size={11} />
                  {latestAnnouncement?.createdAt ? getAnnouncementTime(latestAnnouncement.createdAt) : 'Just now'}
                </span>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-500">
                  View all
                  <FaChevronRight size={10} />
                </span>
              </div>
            </button>
          )
        })()}
      </motion.div>

      {/* Attendance and Work Policy Guidance Section */}
      <motion.div variants={itemVariants} className="w-full">
        <h2 className="text-xl md:text-2xl font-semibold text-ink mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <FaClock className="text-white text-lg" />
          </div>
          Attendance & Work Policy
        </h2>
        <div className="w-full bg-white rounded-xl p-6 md:p-8 border border-surface-subtle shadow-card">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-surface-subtle">
            <div className="w-12 h-12 bg-brand-600 rounded-lg flex items-center justify-center">
              <FaClipboardList className="text-white text-xl" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-ink mb-1">Important Guidelines</h3>
              <p className="text-ink-muted">Please follow these policies for smooth operations</p>
            </div>
          </div>

          <div className="grid gap-4 md:gap-6">
            {policies.map((policy, index) => (
              <div
                key={index}
                className="w-full bg-surface-muted rounded-lg p-5 border border-surface-subtle hover:bg-surface-subtle/30 transition-colors duration-150 group"
              >
                <div className="flex items-start gap-4 w-full">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: policy.iconBg, color: policy.iconColor }}
                  >
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
