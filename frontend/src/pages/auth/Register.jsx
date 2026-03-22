import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { studentAuthAPI, educatorAuthAPI } from '../../api'
import Particles from '../../components/reactbits/Particles'

export default function Register() {
  const [role, setRole] = useState('student')
  const [step, setStep] = useState(1) // 1: email, 2: OTP, 3: details
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [formData, setFormData] = useState({ name: '', username: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const authAPI = role === 'educator' ? educatorAuthAPI : studentAuthAPI

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await authAPI.requestSignup({ email })
      setMessage(res.data.message)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authAPI.verifyOTP({ email, otp })
      setMessage('OTP verified! Complete your registration')
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleDetailsSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.completeSignup({
        email, otp,
        name: formData.name,
        username: formData.username,
        password: formData.password
      })
      if (res.data.success) {
        login(res.data.user)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Particles count={50} color="#667eea" speed={0.2} size={1.5} opacity={0.4} />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1>Create Account</h1>
        <p className="subtitle">Step {step} of 3</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button type="button" className={`btn btn-full ${role === 'student' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setRole('student'); setStep(1); setError(''); setMessage('') }}>🎓 Student</button>
          <button type="button" className={`btn btn-full ${role === 'educator' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setRole('educator'); setStep(1); setError(''); setMessage('') }}>👨‍🏫 Educator</button>
        </div>

        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOTPSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Enter OTP</label>
              <input type="text" className="form-input" value={otp}
                onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" maxLength="6" required />
              <span className="form-hint">Check your email: {email}</span>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button type="button" onClick={() => { setStep(1); setError(''); setMessage('') }} className="btn btn-secondary btn-full">
              Change Email
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleDetailsSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter your full name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="form-input" value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="Choose a username" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Create a password (min 6 chars)" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} placeholder="Confirm your password" required />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
        <div className="auth-footer" style={{ marginTop: '0.75rem' }}>
          <Link to="/">← Back to Home</Link>
        </div>
      </motion.div>
    </div>
  )
}
