import React from 'react'
import { FiMenu } from 'react-icons/fi'
import NotificationBell from '../notifications/NotificationBell'

/**
 * `variant="employee"` renders a dark gradient mobile bar (md:hidden)
 * matching the Flutter mobile app's employee home-screen app bar, while
 * keeping the original plain white bar for desktop (hidden md:flex) and
 * for every other dashboard (Admin/HR) that shares this component.
 *
 * `hideMobileBar`: the Home page builds its own full mobile header (photo
 * background + hamburger + title + bell + greeting, matching the Flutter
 * app bar exactly) — pass this to avoid rendering a duplicate plain bar
 * above it there. Desktop bar is unaffected.
 */
const Navbar = ({ onMenuClick, variant = 'default', hideMobileBar = false }) => {
  if (variant === 'employee') {
    return (
      <>
        {/* Mobile: dark gradient bar, matches the mobile app's app bar */}
        {!hideMobileBar && (
          <div className="md:hidden flex items-center gap-3 h-14 px-4 sticky top-0 z-30 bg-gradient-to-r from-brand-900 to-brand-800 text-white shadow-panel">
            <button
              onClick={onMenuClick}
              className="flex-shrink-0 p-2 -ml-2 rounded-lg text-white/90 hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              <FiMenu size={20} />
            </button>
            <div className="min-w-0 flex-1 overflow-hidden h-8 flex items-center" aria-label="Speshway HRMS">
              <h1 className="marquee-title text-[15px] font-extrabold tracking-[0.09em]">
                <span className="text-white">SPESHWAY </span>
                <span className="text-[#10B981]">HRMS</span>
              </h1>
            </div>
            {/* Direct-child selector so only the bell trigger button (not the
                white notification dropdown's own buttons) turns white. */}
            <div className="flex-shrink-0 flex items-center gap-1 [&>div>button]:!text-white/90 [&>div>button:hover]:!text-white [&>div>button:hover]:!bg-white/10">
              <NotificationBell />
            </div>
          </div>
        )}

        {/* Desktop: unchanged plain white bar */}
        <div className="hidden md:flex items-center gap-3 h-16 px-6 sticky top-0 z-30 bg-white border-b border-surface-subtle">
          <button
            onClick={onMenuClick}
            className="flex-shrink-0 p-2 -ml-2 rounded-lg text-ink-muted hover:bg-surface-muted transition-colors"
            aria-label="Toggle menu"
          >
            <FiMenu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-wide text-brand-700 truncate">
              SPESHWAY SOLUTIONS PRIVATE LIMITED
            </h1>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1 text-ink-muted">
            <NotificationBell />
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="flex items-center gap-3 h-14 md:h-16 px-4 md:px-6 sticky top-0 z-30 bg-white border-b border-surface-subtle">
      <button
        onClick={onMenuClick}
        className="flex-shrink-0 p-2 -ml-2 rounded-lg text-ink-muted hover:bg-surface-muted transition-colors"
        aria-label="Toggle menu"
      >
        <FiMenu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-sm md:text-base font-semibold tracking-wide text-brand-700 truncate">
          <span className="hidden sm:inline">SPESHWAY SOLUTIONS PRIVATE LIMITED</span>
          <span className="sm:hidden">SPESHWAY SOLUTIONS</span>
        </h1>
      </div>

      <div className="flex-shrink-0 flex items-center gap-1 text-ink-muted">
        <NotificationBell />
      </div>
    </div>
  )
}

export default Navbar
