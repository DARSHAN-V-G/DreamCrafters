import React from 'react'
import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import '../styles/FeedbackButton.css'

export default function FeedbackButton({ onClick }) {
  return (
    <motion.button
      className="feedback-btn"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
    >
      <motion.div
        className="feedback-btn-icon"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <MessageCircle size={20} />
      </motion.div>
      <span className="feedback-btn-text">Feedback</span>
      
      {/* Pulse animation background */}
      <motion.div
        className="feedback-btn-pulse"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.button>
  )
}
