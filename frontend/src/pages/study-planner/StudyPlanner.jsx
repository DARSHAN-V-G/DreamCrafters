import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { studyPlanAPI } from '../../api'
import DashboardLayout from '../../components/DashboardLayout'

export default function StudyPlanner() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPlan, setNewPlan] = useState({ title: '', goal: '', start_date: '', end_date: '' })
  const [showGenerate, setShowGenerate] = useState(false)
  const [genForm, setGenForm] = useState({ goal: '', start_date: '', end_date: '', daily_hours: 2 })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => { loadPlans() }, [filter])

  const loadPlans = async () => {
    setLoading(true)
    try {
      const params = filter ? { status: filter } : {}
      const res = await studyPlanAPI.getAll(params)
      if (res.data.success) setPlans(res.data.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const res = await studyPlanAPI.create(newPlan)
      if (res.data.success) { setShowCreate(false); setNewPlan({ title: '', goal: '', start_date: '', end_date: '' }); loadPlans() }
    } catch (err) { setError(err.response?.data?.error || 'Failed') }
    finally { setCreating(false) }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const data = { ...genForm, daily_hours: parseInt(genForm.daily_hours) }
      const res = await studyPlanAPI.generate(data)
      if (res.data.success) { setShowGenerate(false); loadPlans() }
    } catch (err) { setError(err.response?.data?.error || 'Failed') }
    finally { setCreating(false) }
  }

  const deletePlan = async (id) => {
    if (!confirm('Delete this plan?')) return
    try { await studyPlanAPI.delete(id); loadPlans() } catch(err) { console.error(err) }
  }

  const statusColors = { active: 'badge-success', paused: 'badge-warning', completed: 'badge-primary', archived: 'badge-info' }

  return (
    <DashboardLayout title="Study Planner">
      <div className="page-header page-header-actions">
        <div><h1>Study Planner 📅</h1><p>Plan your study sessions and track progress</p></div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => { setShowCreate(true); setShowGenerate(false) }}>+ Manual Plan</button>
          <button className="btn btn-primary" onClick={() => { setShowGenerate(true); setShowCreate(false) }}>✨ AI Generate</button>
        </div>
      </div>

      {(showCreate || showGenerate) && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>{showGenerate ? '✨ Generate AI Study Plan' : '📝 Create Study Plan'}</h3>
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={showGenerate ? handleGenerate : handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            {showGenerate ? (
              <>
                <div className="form-group"><label className="form-label">Goal *</label><input className="form-input" value={genForm.goal} onChange={e => setGenForm({...genForm, goal: e.target.value})} placeholder="e.g. Prepare for JEE" required /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start Date *</label><input type="date" className="form-input" value={genForm.start_date} onChange={e => setGenForm({...genForm, start_date: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-input" value={genForm.end_date} onChange={e => setGenForm({...genForm, end_date: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Daily Hours *</label>
                  <select className="form-select" value={genForm.daily_hours} onChange={e => setGenForm({...genForm, daily_hours: e.target.value})}>
                    {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h} hour{h>1?'s':''}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={newPlan.title} onChange={e => setNewPlan({...newPlan, title: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Goal</label><input className="form-input" value={newPlan.goal} onChange={e => setNewPlan({...newPlan, goal: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start Date *</label><input type="date" className="form-input" value={newPlan.start_date} onChange={e => setNewPlan({...newPlan, start_date: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-input" value={newPlan.end_date} onChange={e => setNewPlan({...newPlan, end_date: e.target.value})} /></div>
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : showGenerate ? 'Generate Plan' : 'Create Plan'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowCreate(false); setShowGenerate(false); setError('') }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['', 'active', 'paused', 'completed', 'archived'].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <span className="icon">📅</span>
          <h3>No study plans yet</h3>
          <p>Create your first study plan or let AI generate one for you!</p>
        </div>
      ) : (
        <div className="grid-auto">
          {plans.map(plan => (
            <div className="card card-hover" key={plan.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/study-planner/${plan.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <span className={`badge ${statusColors[plan.status] || 'badge-info'}`}>{plan.status}</span>
                <span className="badge badge-info">{plan.generated_by === 'ai' ? '✨ AI' : '📝 Manual'}</span>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0 0 0.5rem', lineHeight: 1.4 }}>{plan.title}</h3>
              {plan.goal && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{plan.goal}</p>}
              {plan.progress && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{plan.progress.completed}/{plan.progress.total} sessions</span>
                    <strong>{plan.progress.percent}%</strong>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${plan.progress.percent}%` }} /></div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>{plan.start_date?.split('T')[0]}</span>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deletePlan(plan.id) }} style={{ color: 'var(--danger)' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
