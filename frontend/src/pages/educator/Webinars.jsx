import React, { useEffect, useState } from 'react'
import { Video, AlertCircle, Users, Calendar, Clock, Plus, Edit, Trash2 } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import SpotlightCard from '../../components/reactbits/SpotlightCard'
import AnimatedContent from '../../components/reactbits/AnimatedContent'
import { webinarAPI } from '../../api'
import { normalizeWebinar } from '../../utils/m2normalize'

const emptyForm = {
  title: '',
  description: '',
  topic: '',
  join_link: '',
  scheduled_at: '',
  duration_minutes: 60,
  max_participants: '',
}

export default function EducatorWebinars() {
  const [webinars, setWebinars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    loadWebinars()
  }, [])

  const loadWebinars = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await webinarAPI.getMyWebinars()
      if (res.data.success) {
        const list = Array.isArray(res.data.data) ? res.data.data : []
        setWebinars(list.map(normalizeWebinar))
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load webinars')
    } finally {
      setLoading(false)
    }
  }

  const toLocalDateTimeValue = (dateInput) => {
    if (!dateInput) return ''
    const d = new Date(dateInput)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (webinar) => {
    setEditingId(webinar.id)
    setForm({
      title: webinar.title || '',
      description: webinar.description || '',
      topic: webinar.topic || '',
      join_link: webinar.join_link || '',
      scheduled_at: toLocalDateTimeValue(webinar.scheduled_at),
      duration_minutes: webinar.duration_minutes || 60,
      max_participants: webinar.max_participants || '',
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        duration_minutes: Number(form.duration_minutes),
        max_participants: form.max_participants ? Number(form.max_participants) : undefined,
      }

      if (editingId) {
        await webinarAPI.update(editingId, payload)
      } else {
        await webinarAPI.create(payload)
      }

      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      await loadWebinars()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save webinar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webinar?')) return
    try {
      await webinarAPI.delete(id)
      await loadWebinars()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete webinar')
    }
  }

  return (
    <DashboardLayout title="Educator Webinars">
      <div className="page-header page-header-actions">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Webinars
            <Video size={28} color="var(--primary)" />
          </h1>
          <p>Schedule and manage your webinars</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Schedule Webinar
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Webinar' : 'Create Webinar'}</h3>
          <form onSubmit={handleSave} style={{ display: 'grid', gap: '0.9rem', maxWidth: '640px' }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Topic</label>
              <input className="form-input" value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Meet Link</label>
              <input className="form-input" value={form.join_link} onChange={(e) => setForm((p) => ({ ...p, join_link: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Schedule</label>
                <input type="datetime-local" className="form-input" value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input type="number" min="1" className="form-input" value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Participants</label>
                <input type="number" min="1" className="form-input" value={form.max_participants} onChange={(e) => setForm((p) => ({ ...p, max_participants: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Webinar'}</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : webinars.length === 0 ? (
        <div className="empty-state">
          <Video size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No webinars scheduled yet</h3>
          <p>Create your first webinar to get started.</p>
        </div>
      ) : (
        <div className="grid-auto">
          {webinars.map((w, idx) => (
            <AnimatedContent key={w.id} delay={0} stagger={idx * 0.08}>
              <SpotlightCard>
                <div style={{
                  height: '100px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem', color: 'var(--primary)'
                }}>
                  <Video size={40} />
                </div>

                {w.topic && <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>{w.topic}</span>}
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0.5rem 0' }}>{w.title}</h3>

                {w.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                    {w.description}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} /> {new Date(w.scheduled_at || w.scheduledAt).toLocaleString('en-IN')}
                  </span>
                  {(w.duration_minutes != null || w.durationMinutes != null) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={14} /> {(w.duration_minutes ?? w.durationMinutes)} minutes
                    </span>
                  )}
                  {w.max_participants && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Users size={14} /> {w.registered_count || 0}/{w.max_participants} registered
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(w)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Edit size={14} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(w.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </SpotlightCard>
            </AnimatedContent>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
