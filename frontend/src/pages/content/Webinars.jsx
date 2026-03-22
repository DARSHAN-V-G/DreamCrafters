import React, { useState, useEffect } from 'react'
import { webinarAPI } from '../../api'
import DashboardLayout from '../../components/DashboardLayout'
import SpotlightCard from '../../components/reactbits/SpotlightCard'
import AnimatedContent from '../../components/reactbits/AnimatedContent'

export default function Webinars() {
  const [webinars, setWebinars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [registering, setRegistering] = useState(null)

  useEffect(() => { fetchWebinars() }, [])

  const fetchWebinars = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await webinarAPI.getAll()
      const data = res.data
      setWebinars(data.data || data.webinars || data || [])
    } catch (err) {
      console.error('Error fetching webinars:', err)
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  const registerWebinar = async (id) => {
    setRegistering(id)
    try {
      await webinarAPI.register(id)
      fetchWebinars()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register')
    } finally { setRegistering(null) }
  }

  const cancelRegistration = async (id) => {
    try {
      await webinarAPI.cancelRegistration(id)
      fetchWebinars()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel')
    }
  }

  return (
    <DashboardLayout title="Webinars">
      <div className="page-header">
        <h1>Webinars 🎥</h1>
        <p>Join live sessions hosted by industry experts and mentors</p>
      </div>

      {loading && <div className="empty-state"><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>}
      {error && !loading && <div className="alert alert-error">❌ {error}</div>}

      {!loading && !error && (!Array.isArray(webinars) || webinars.length === 0) && (
        <div className="empty-state"><span className="icon">🎥</span><h3>No webinars available</h3><p>New webinars will appear here once scheduled.</p></div>
      )}

      {!loading && !error && Array.isArray(webinars) && webinars.length > 0 && (
        <div className="grid-auto">
          {webinars.map((w, idx) => (
            <AnimatedContent key={w.id} delay={0} stagger={idx * 0.08}>
              <SpotlightCard>
              <div style={{
                height: '100px', borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', marginBottom: '1rem'
              }}>🎥</div>
              {w.topic && <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>{w.topic}</span>}
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0.5rem 0' }}>{w.title}</h3>
              {w.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>{w.description}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {w.host_name && <span>👨‍🏫 {w.host_name}</span>}
                <span>📅 {new Date(w.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                {w.duration_minutes && <span>⏱️ {w.duration_minutes} minutes</span>}
                {w.max_participants && <span>👥 {w.registered_count || 0}/{w.max_participants} registered</span>}
              </div>
              {w.max_participants && (
                <div style={{ marginBottom: '1rem' }}>
                  <div className="progress-bar" style={{ height: '6px' }}>
                    <div className="progress-fill" style={{ width: `${((w.registered_count || 0) / w.max_participants) * 100}%` }} />
                  </div>
                </div>
              )}
              {w.isRegistered ? (
                <button className="btn btn-danger btn-full btn-sm" onClick={() => cancelRegistration(w.id)}>
                  Cancel Registration
                </button>
              ) : (
                <button className="btn btn-primary btn-full btn-sm" onClick={() => registerWebinar(w.id)}
                  disabled={registering === w.id}>
                  {registering === w.id ? 'Registering...' : 'Register Now'}
                </button>
              )}
            </SpotlightCard>
            </AnimatedContent>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
