import React from 'react'
import { FaUser } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'

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


    </div>
  )
}

export default SummaryCard
