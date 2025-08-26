import React from 'react'
import { motion } from 'framer-motion'

const SummaryCard = ({icon, text, number, color}) => {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="rounded flex bg-white shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
        <div className={`text-2xl md:text-3xl flex justify-center items-center ${color} text-white px-3 md:px-4 py-4 md:py-6`}>
            {icon}
        </div>
        <div className="pl-3 md:pl-4 py-2 md:py-3 flex flex-col justify-center">
            <p className="text-sm md:text-lg font-semibold text-gray-700">{text}</p>
            <p className="text-lg md:text-xl font-bold text-gray-900">{number}</p>
        </div>
    </motion.div>
  )
}
export default SummaryCard