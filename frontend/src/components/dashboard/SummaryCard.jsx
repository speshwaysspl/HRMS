import React from 'react'
import { motion } from 'framer-motion'

const SummaryCard = ({icon, text, number, color}) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl flex bg-white border border-surface-subtle shadow-card overflow-hidden hover:shadow-panel transition-shadow duration-200"
    >
        <div className={`text-2xl md:text-3xl flex justify-center items-center ${color} text-white px-3 md:px-4 py-4 md:py-6`}>
            {icon}
        </div>
        <div className="pl-3 md:pl-4 py-2 md:py-3 flex flex-col justify-center">
            <p className="text-sm md:text-base font-medium text-ink-muted">{text}</p>
            <p className="text-lg md:text-xl font-semibold text-ink">{number}</p>
        </div>
    </motion.div>
  )
}
export default SummaryCard
