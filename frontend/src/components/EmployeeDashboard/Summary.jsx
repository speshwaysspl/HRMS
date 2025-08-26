import React from 'react'
import { FaUser, FaBuilding, FaPhone, FaEnvelope } from 'react-icons/fa'
import { useAuth } from '../../context/authContext'

const SummaryCard = () => {
  const { user } = useAuth()

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* User Welcome Card */}
      <div className="rounded-lg flex flex-col sm:flex-row bg-white shadow-md p-4 md:p-6 items-center gap-4">
        <div className="text-2xl md:text-3xl flex justify-center items-center bg-teal-600 text-white p-3 md:p-4 rounded-lg flex-shrink-0">
          <FaUser />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-base md:text-lg font-semibold">Welcome</p>
          <p className="text-lg md:text-xl font-bold">{user.name}</p>
          <p className="text-sm text-gray-500 mt-1">We're glad to have you back!</p>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 text-center">
          Company Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base">
          <div className="flex items-center gap-3">
            <FaBuilding className="text-teal-600 text-lg" />
            <span className="text-gray-700">SPESHWAY SOLUTIONS PVT LTD</span>
          </div>
          <div className="flex items-center gap-3">
            <FaPhone className="text-teal-600 text-lg" />
            <span className="text-gray-700">+1 (555) 123-4567</span>
          </div>
          <div className="flex items-center gap-3">
            <FaEnvelope className="text-teal-600 text-lg" />
            <span className="text-gray-700">info@speshway.com</span>
          </div>
          <div className="flex items-center gap-3">
            <FaUser className="text-teal-600 text-lg" />
            <span className="text-gray-700">Employee Portal</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SummaryCard
