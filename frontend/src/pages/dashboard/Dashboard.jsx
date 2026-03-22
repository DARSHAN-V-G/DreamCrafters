import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { studentAuthAPI, educatorAuthAPI } from '../../api'
import DashboardLayout from '../../components/DashboardLayout'
import TiltCard from '../../components/reactbits/TiltCard'
import CountUp from '../../components/reactbits/CountUp'
import AnimatedContent from '../../components/reactbits/AnimatedContent'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const authAPI = user?.role === 'educator' ? educatorAuthAPI : studentAuthAPI
      const res = await authAPI.getProfile()
      if (res.data.success) setProfile(res.data.user)
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  const stats = [
    { icon: '📅', label: 'Study Plans', value: 3, color: 'purple', link: '/study-planner' },
    { icon: '📚', label: 'Content', value: 24, color: 'blue', link: '/content' },
    { icon: '🎯', label: 'Career Paths', value: 5, color: 'green', link: '/careers' },
    { icon: '💼', label: 'Jobs', value: 6, color: 'orange', link: '/jobs' },
  ]

  const quickActions = [
    { icon: '📅', label: 'Create Study Plan', desc: 'Generate an AI-powered plan', path: '/study-planner' },
    { icon: '📚', label: 'Browse Content', desc: 'Explore videos & articles', path: '/content' },
    { icon: '💬', label: 'Chat with AI', desc: 'Get instant guidance', path: '/chat' },
    { icon: '👨‍🏫', label: 'Find a Mentor', desc: 'Connect with experts', path: '/mentors' },
    { icon: '💼', label: 'Browse Jobs', desc: 'Find opportunities', path: '/jobs' },
    { icon: '🎯', label: 'Career Paths', desc: 'Explore career roadmaps', path: '/careers' },
  ]

  return (
    <DashboardLayout title="Dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="page-header">
          <h1>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
          <p>Here's your learning overview</p>
        </div>

        <div className="stats-grid">
          {stats.map((s, i) => (
            <AnimatedContent key={i} delay={0} stagger={i * 0.1}>
              <TiltCard maxTilt={6} scale={1.02}>
                <div className="stat-card" onClick={() => navigate(s.link)} style={{ cursor: 'pointer' }}>
                  <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                  <div className="stat-info">
                    <h3>{s.label}</h3>
                    <div className="stat-value">
                      <CountUp to={s.value} duration={1.2} delay={0.2 + i * 0.1} />
                    </div>
                  </div>
                </div>
              </TiltCard>
            </AnimatedContent>
          ))}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Quick Actions
          </h2>
          <div className="grid-3">
            {quickActions.map((a, i) => (
              <AnimatedContent key={i} delay={0} stagger={i * 0.08}>
                <TiltCard maxTilt={5} scale={1.01}>
                  <div className="card" onClick={() => navigate(a.path)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2rem' }}>{a.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{a.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{a.desc}</div>
                    </div>
                  </div>
                </TiltCard>
              </AnimatedContent>
            ))}
          </div>
        </div>

        {(profile || user) && (
          <AnimatedContent delay={0.3}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">👤 Profile Information</div>
                <motion.button
                  className="btn btn-sm btn-secondary"
                  onClick={() => navigate('/settings')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Settings
                </motion.button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Name</span><br /><strong>{(profile || user)?.name}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Username</span><br /><strong>{(profile || user)?.username}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Email</span><br /><strong>{(profile || user)?.email}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Role</span><br /><span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{(profile || user)?.role}</span></div>
              </div>
            </div>
          </AnimatedContent>
        )}
      </motion.div>
    </DashboardLayout>
  )
}
