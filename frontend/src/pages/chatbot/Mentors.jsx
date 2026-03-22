import React, { useState } from 'react'
import { dummyMentors } from '../../utils/dummyData'
import DashboardLayout from '../../components/DashboardLayout'
import SpotlightCard from '../../components/reactbits/SpotlightCard'
import AnimatedContent from '../../components/reactbits/AnimatedContent'

export default function Mentors() {
  const [search, setSearch] = useState('')
  const [selectedMentor, setSelectedMentor] = useState(null)
  const [sessionTopic, setSessionTopic] = useState('')
  const [requested, setRequested] = useState({})

  const filtered = dummyMentors.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.interests.some(i => i.toLowerCase().includes(search.toLowerCase()))
  )

  const requestSession = (mentorId) => {
    if (!sessionTopic.trim()) return alert('Please enter a topic')
    setRequested({ ...requested, [mentorId]: true })
    setSelectedMentor(null)
    setSessionTopic('')
  }

  return (
    <DashboardLayout title="Mentors">
      <div className="page-header">
        <h1>Find a Mentor 👨‍🏫</h1>
        <p>Connect with experienced mentors for personalized guidance
          <span className="badge badge-warning" style={{ marginLeft: '0.75rem' }}>Demo Data</span>
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input className="form-input" placeholder="🔍 Search by name or expertise..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: '400px' }} />
      </div>

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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0' }}>📍 {m.location}</p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--warning)', fontWeight: 600 }}>⭐ {m.avg_rating}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{m.completed_sessions} sessions</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '1rem 0' }}>
              {m.interests.map((int, i) => <span key={i} className="badge badge-info">{int}</span>)}
            </div>
            {requested[m.id] ? (
              <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>✓ Session requested!</div>
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
    </DashboardLayout>
  )
}
