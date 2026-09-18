import React from 'react'
import { FiMenu } from 'react-icons/fi'
import NotificationBell from '../notifications/NotificationBell'

const Navbar = ({ onMenuClick }) => {
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
