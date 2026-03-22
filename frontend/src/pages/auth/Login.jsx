import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { studentAuthAPI, educatorAuthAPI } from '../../api'

export default function Login() {
  const [role, setRole] = useState('student')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const authAPI = role === 'educator' ? educatorAuthAPI : studentAuthAPI
      const res = await authAPI.login({ username, password })
      if (res.data.success) {
        login(res.data.user)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to continue learning</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`btn btn-full ${role === 'student' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setRole('student')}
          >🎓 Student</button>
          <button
            type="button"
            className={`btn btn-full ${role === 'educator' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setRole('educator')}
          >👨‍🏫 Educator</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <Link to={`/${role}/forgot-password`} style={{ fontSize: '0.85rem' }}>Forgot password?</Link>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : `Sign In as ${role === 'student' ? 'Student' : 'Educator'}`}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
        <div className="auth-footer" style={{ marginTop: '0.75rem' }}>
          <Link to="/">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
