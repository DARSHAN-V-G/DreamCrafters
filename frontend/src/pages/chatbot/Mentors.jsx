import React, { useState } from 'react'
import { 
  Users, 
  Search, 
  MapPin, 
  CheckCircle 
} from 'lucide-react'
import { mentorRequestAPI } from '../../api'
import DashboardLayout from '../../components/DashboardLayout'
import SpotlightCard from '../../components/reactbits/SpotlightCard'
import AnimatedContent from '../../components/reactbits/AnimatedContent'

export default function Mentors() {
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedMentor, setSelectedMentor] = useState(null)
  const [sessionTopic, setSessionTopic] = useState('')
  const [requested, setRequested] = useState({})

  React.useEffect(() => {
    loadMentors()
  }, [])

  const loadMentors = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await mentorRequestAPI.listEducators()
      if (res.data.success) {
        setMentors(res.data.data || [])
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load educators')
    } finally {
      setLoading(false)
    }
  }

  const filtered = mentors.filter(m =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.username?.toLowerCase().includes(search.toLowerCase())
  )

  const requestSession = async (mentorId) => {
    if (!sessionTopic.trim()) return alert('Please enter a topic')
    try {
      await mentorRequestAPI.create({ mentor_id: mentorId, topic: sessionTopic.trim() })
      setRequested({ ...requested, [mentorId]: true })
      setSelectedMentor(null)
      setSessionTopic('')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send request')
    }
  }

  return (
    <DashboardLayout title="Mentors">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          Find a Mentor
          <Users size={28} color="var(--primary)" />
        </h1>
        <p>Connect with educators and request a one-on-one session</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
        <Search 
          size={18} 
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
        />
        <input 
          className="form-input" 
          placeholder="Search by name or expertise..." 
          value={search}
          onChange={e => setSearch(e.target.value)} 
          style={{ paddingLeft: '40px' }} 
        />
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : (
      <div className="grid-2">
        {filtered.map((m, idx) => (
          <AnimatedContent key={m.id} delay={0} stagger={idx * 0.1}>
            <SpotlightCard>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: 'var(--radius-full)',
                background: 'var(--gradient)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0
              }}>
                {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{m.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={14} /> {m.location}
                </p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>@{m.username}</span>
                </div>
              </div>
            </div>
            {requested[m.id] ? (
              <div className="alert alert-success" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} /> Session requested!
              </div>
            ) : selectedMentor === m.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input className="form-input" placeholder="Enter session topic..." value={sessionTopic}
                  onChange={e => setSessionTopic(e.target.value)} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => requestSession(m.id)}>Send Request</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedMentor(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-primary btn-full btn-sm" onClick={() => setSelectedMentor(m.id)}>
                Request Session
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
