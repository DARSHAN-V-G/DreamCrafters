import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studyPlanAPI, studySessionAPI } from '../../api'
import DashboardLayout from '../../components/DashboardLayout'
import AnimatedContent from '../../components/reactbits/AnimatedContent'

export default function StudyPlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { loadPlan() }, [id])

  const loadPlan = async () => {
    setLoading(true)
    try {
      const res = await studyPlanAPI.getOne(id)
      if (res.data.success) setPlan(res.data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const completeSession = async (sid) => {
    setActionLoading(sid)
    try { await studySessionAPI.complete(sid, {}); loadPlan() }
    catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setActionLoading(null) }
  }

  const rescheduleSession = async (sid) => {
    const newDate = prompt('New date (YYYY-MM-DD):')
    if (!newDate) return
    setActionLoading(sid)
    try { await studySessionAPI.reschedule(sid, { new_date: newDate, reason: 'user_request' }); loadPlan() }
    catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setActionLoading(null) }
  }

  const deleteSession = async (sid) => {
    if (!confirm('Delete this session?')) return
    try { await studySessionAPI.delete(sid); loadPlan() }
    catch (err) { console.error(err) }
  }

  const autoReschedule = async () => {
    try {
      const res = await studySessionAPI.autoReschedule({ plan_id: parseInt(id) })
      alert(`Rescheduled ${res.data.data?.rescheduled_count || 0} sessions`)
      loadPlan()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  const statusIcons = { pending: '⏳', completed: '✅', missed: '❌', rescheduled: '🔄' }
  const priorityLabels = { 1: 'Low', 2: 'Med', 3: 'High' }
  const priorityColors = { 1: 'badge-info', 2: 'badge-warning', 3: 'badge-danger' }

  if (loading) return <DashboardLayout title="Study Plan"><div className="empty-state"><div className="loading-spinner" style={{ margin: '0 auto' }} /></div></DashboardLayout>
  if (!plan) return <DashboardLayout title="Study Plan"><div className="empty-state"><h3>Plan not found</h3></div></DashboardLayout>

  return (
    <DashboardLayout title="Study Plan">
      <button className="btn btn-ghost" onClick={() => navigate('/study-planner')} style={{ marginBottom: '1rem' }}>← Back to Plans</button>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 0.5rem' }}>{plan.title}</h2>
            {plan.goal && <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{plan.goal}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-success">{plan.status}</span>
              <span className="badge badge-info">{plan.generated_by === 'ai' ? '✨ AI Generated' : '📝 Manual'}</span>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={autoReschedule}>🔄 Auto-Reschedule Missed</button>
        </div>

        {plan.progress && (
          <div style={{ marginTop: '1.5rem' }}>
            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{plan.progress.total}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{plan.progress.completed}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Done</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{plan.progress.missed || 0}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Missed</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{plan.progress.pending || 0}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</div></div>
            </div>
            <div className="progress-bar" style={{ height: '10px' }}><div className="progress-fill" style={{ width: `${plan.progress.percent}%` }} /></div>
            <p style={{ textAlign: 'center', marginTop: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>{plan.progress.percent}% Complete</p>
          </div>
        )}
      </div>

      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Sessions ({plan.sessions?.length || 0})</h3>

      {!plan.sessions || plan.sessions.length === 0 ? (
        <div className="empty-state"><span className="icon">📋</span><h3>No sessions</h3><p>Add sessions to this plan to start tracking.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {plan.sessions.map((s, idx) => (
            <AnimatedContent key={s.id} delay={0} stagger={idx * 0.06}>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '1.5rem' }}>{statusIcons[s.status] || '⏳'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>📅 {s.scheduled_date?.split('T')[0]}</span>
                    {s.scheduled_time && <span>🕐 {s.scheduled_time}</span>}
                    <span>⏱️ {s.duration_minutes}min</span>
                    <span className={`badge ${priorityColors[s.priority] || 'badge-info'}`}>{priorityLabels[s.priority] || 'Med'}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {s.status !== 'completed' && (
                  <>
                    <button className="btn btn-sm btn-success" onClick={() => completeSession(s.id)} disabled={actionLoading === s.id}>
                      {actionLoading === s.id ? '...' : '✓ Done'}
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => rescheduleSession(s.id)}>📅</button>
                  </>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => deleteSession(s.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
              </div>
            </div>
            </AnimatedContent>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
