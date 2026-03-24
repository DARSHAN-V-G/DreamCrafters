import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { GraduationCap, UserCheck, ArrowLeft } from 'lucide-react'
import { studentAuthAPI, educatorAuthAPI } from '../../api'
import Particles from '../../components/reactbits/Particles'

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
        const loggedInRole = res.data.user?.role
        if (loggedInRole === 'educator' || loggedInRole === 'mentor') {
          navigate('/educator/webinars')
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
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
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to continue learning</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <motion.button
            type="button"
            className={`btn btn-full ${role === 'student' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setRole('student')}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <GraduationCap size={18} /> Student
          </motion.button>
          <motion.button
            type="button"
            className={`btn btn-full ${role === 'educator' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setRole('educator')}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <UserCheck size={18} /> Educator
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <motion.div
            className="form-group"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </motion.div>

          <motion.div
            className="form-group"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </motion.div>

          <div style={{ textAlign: 'right' }}>
            <Link to={`/${role}/forgot-password`} style={{ fontSize: '0.85rem' }}>Forgot password?</Link>
          </div>

          {error && (
            <motion.div
              className="alert alert-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            whileHover={{ boxShadow: '0 6px 25px rgba(102, 126, 234, 0.4)' }}
          >
            {loading ? 'Signing in...' : `Sign In as ${role === 'student' ? 'Student' : 'Educator'}`}
          </motion.button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
        <div className="auth-footer" style={{ marginTop: '0.75rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
