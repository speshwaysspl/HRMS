import React from 'react'

const Navbar = () => {
  return (
    <div className="flex items-center justify-center h-14 px-4 md:px-6 shadow-lg relative bg-gradient-to-r from-blue-600 via-indigo-700 to-teal-600">
      
      {/* Animated Scrolling Company Name */}
      <div className="overflow-hidden whitespace-nowrap w-full max-w-md mx-auto">
        <h1 className="text-sm sm:text-lg md:text-xl font-extrabold text-white animate-scroll">
          <span style={{ fontFamily: "Times New Roman, Times, serif" }}>
            SPESHWAY SOLUTIONS PRIVATE LIMITED
          </span>
        </h1>
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
            0% { transform: translateX(-50%); }
            100% { transform: translateX(50%); }
          }

          .animate-gradient {
            background-size: 300% 300%;
            animation: gradient 5s ease infinite;
          }

          .animate-scroll {
            animation: scroll 8s linear infinite;
            display: inline-block;
          }
        `}
      </style>
    </div>
  )
}

export default Navbar
