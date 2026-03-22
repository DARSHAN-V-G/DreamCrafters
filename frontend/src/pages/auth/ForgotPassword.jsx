import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { studentAuthAPI, educatorAuthAPI } from '../../api'

export default function ForgotPassword() {
  const [role, setRole] = useState('student')
  const [step, setStep] = useState(1) // 1: email, 2: verify OTP, 3: new password
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const authAPI = role === 'educator' ? educatorAuthAPI : studentAuthAPI

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await authAPI.requestPasswordReset({ email })
      setMessage(res.data.message)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authAPI.verifyPasswordResetOTP({ email, otp })
      setMessage('OTP verified! Enter your new password.')
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    try {
      const res = await authAPI.resetPassword({ email, otp, newPassword })
      setMessage(res.data.message || 'Password reset successful!')
      setStep(4) // done
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p className="subtitle">{step <= 3 ? `Step ${step} of 3` : 'Done!'}</p>

        {step < 4 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button type="button" className={`btn btn-full ${role === 'student' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRole('student'); setStep(1); setError(''); setMessage('') }}>🎓 Student</button>
            <button type="button" className={`btn btn-full ${role === 'educator' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRole('educator'); setStep(1); setError(''); setMessage('') }}>👨‍🏫 Educator</button>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestReset} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your registered email" required />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>{loading ? 'Sending...' : 'Send Reset OTP'}</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <div className="form-group">
              <label className="form-label">Enter OTP</label>
              <input type="text" className="form-input" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength="6" required />
              <span className="form-hint">Sent to: {email}</span>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
          </form>
        )}

        {step === 4 && (
          <div>
            <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{message}</div>
            <Link to="/login" className="btn btn-primary btn-full btn-lg">Go to Login</Link>
          </div>
        )}

        <div className="auth-footer">
          <Link to="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  )
}
