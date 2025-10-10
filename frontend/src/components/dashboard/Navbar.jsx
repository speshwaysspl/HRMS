import React from 'react'
import NotificationBell from '../notifications/NotificationBell'

const Navbar = () => {
  return (
    <div className="flex items-center justify-between h-12 sm:h-14 md:h-16 px-2 sm:px-4 md:px-6 shadow-lg relative bg-gradient-to-r from-blue-600 via-indigo-700 to-teal-600">
      
      {/* Animated Scrolling Company Name */}
      <div className="overflow-hidden whitespace-nowrap w-full max-w-xs sm:max-w-md md:max-w-lg mx-auto">
        <h1 className="text-xs sm:text-sm md:text-lg lg:text-xl font-extrabold text-white animate-scroll">
          <span style={{ fontFamily: "Times New Roman, Times, serif" }}>
            <span className="hidden sm:inline">SPESHWAY SOLUTIONS PRIVATE LIMITED</span>
            <span className="sm:hidden">SPESHWAY SOLUTIONS</span>
          </span>
        </h1>
      </div>

      {/* Notification Bell */}
      <div className="flex-shrink-0 text-white notification-bell-wrapper">
        <NotificationBell />
      </div>

      {/* Extra CSS */}
      <style>
        {`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes scroll {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }

          .animate-gradient {
            background-size: 300% 300%;
            animation: gradient 9s ease infinite;
          }

          .animate-scroll {
            animation: scroll 12s linear infinite;
            display: inline-block;
          }

          @media (max-width: 640px) {
            .animate-scroll {
              animation: scroll 8s linear infinite;
            }
          }

          /* Ensure NotificationBell (svg) appears white */
          .notification-bell-wrapper svg {
            fill: white !important;
            color: white !important;
            stroke: white !important;
          }
        `}
      </style>
    </div>
  )
}

export default Navbar
