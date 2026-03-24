
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, CheckCircle, AlertCircle, MessageCircle, Star } from 'lucide-react'
import '../styles/FeedbackModal.css'

export default function FeedbackModal({ isOpen, onClose, pageName = 'DreamCrafters' }) {
  const [formData, setFormData] = useState({
    type: 'feature',
    rating: 0,
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)
  const textareaRef = React.useRef(null)
  const ratingRef = React.useRef(null)

  const feedbackTypes = [
    { value: 'feature', label: '💡 Feature Request', icon: 'feature' },
    { value: 'bug', label: '🐛 Report a Bug', icon: 'bug' },
    { value: 'improvement', label: '⚡ Improvement', icon: 'improvement' },
    { value: 'other', label: '💬 Other', icon: 'other' }
  ]

  const handleTypeChange = (type) => {
    setFormData({ ...formData, type })
    // Scroll to textarea after type selection so user can immediately fill feedback
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 300)
  }

  const handleRatingChange = (rating) => {
    setFormData({ ...formData, rating })
    // Scroll to textarea after rating selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        textareaRef.current.focus()
      }
    }, 100)
  }

  const handleMessageChange = (e) => {
    setFormData({ ...formData, message: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Only message is optional now, but at least try to have something
    if (!formData.type) {
      setSubmitStatus({ type: 'error', message: 'Please select a feedback type' })
      setTimeout(() => setSubmitStatus(null), 3000)
      return
    }

    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSubmitStatus({ 
        type: 'success', 
        message: 'Thank you! Your feedback has been sent.' 
      })
      
      setTimeout(() => {
        onClose()
        setFormData({ type: 'feature', rating: 0, message: '' })
        setSubmitStatus(null)
      }, 2000)
    } catch (error) {
      setSubmitStatus({ 
        type: 'error', 
        message: 'Failed to send feedback. Please try again.' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="feedback-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.2 }}
          />

          {/* Modal */}
          <motion.div
            className="feedback-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <motion.button
              className="feedback-close-btn"
              onClick={onClose}
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={24} />
            </motion.button>

            {/* Header */}
            <div className="feedback-header">
              <motion.div
                className="feedback-icon"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, duration: 0.5, type: 'spring' }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <MessageCircle size={40} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h2 className="feedback-title">Share Your Feedback</h2>
                <p className="feedback-subtitle">Help us improve {pageName} with your thoughts</p>
              </motion.div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="feedback-form">
              {/* Feedback Type */}
              <motion.div
                className="feedback-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="section-label">What's your feedback about?</label>
                <div className="feedback-types">
                  {feedbackTypes.map((item, index) => (
                    <motion.button
                      key={item.value}
                      type="button"
                      className={`feedback-type-btn ${formData.type === item.value ? 'active' : ''}`}
                      onClick={() => handleTypeChange(item.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                    >
                      <span className="type-label">{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Rating */}
              <motion.div
                className="feedback-section"
                ref={ratingRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <label className="section-label">How happy are you with DreamCrafters?</label>
                <div className="rating-container">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      type="button"
                      className="rating-star"
                      onClick={() => handleRatingChange(star)}
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      whileTap={{ scale: 0.9 }}
                      animate={{
                        fill: star <= formData.rating ? '#667eea' : 'none',
                        scale: star <= formData.rating ? 1.1 : 1
                      }}
                    >
                      <Star
                        size={32}
                        color={star <= formData.rating ? '#667eea' : '#d1d5db'}
                        fill={star <= formData.rating ? '#667eea' : 'none'}
                      />
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Message */}
              <motion.div
                className="feedback-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="section-label">Tell us more</label>
                <textarea
                  ref={textareaRef}
                  value={formData.message}
                  onChange={handleMessageChange}
                  placeholder="Share your thoughts, suggestions, or describe the issue..."
                  className="feedback-textarea"
                  rows="4"
                  maxLength={500}
                />
                <div className="char-count">
                  {formData.message.length}/500
                </div>
              </motion.div>

              {/* Status Messages */}
              <AnimatePresence>
                {submitStatus && (
                  <motion.div
                    className={`feedback-status ${submitStatus.type}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {submitStatus.type === 'success' ? (
                      <CheckCircle size={20} />
                    ) : (
                      <AlertCircle size={20} />
                    )}
                    <span>{submitStatus.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                className="feedback-submit-btn"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                {isSubmitting ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      ⏳
                    </motion.span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {formData.type ? 'Send Feedback ✨' : 'Select Type to Send'}
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
