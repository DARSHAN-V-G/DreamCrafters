import React, { useState } from 'react'
import { dummyJobs } from '../../utils/dummyData'
import DashboardLayout from '../../components/DashboardLayout'
import SpotlightCard from '../../components/reactbits/SpotlightCard'
import AnimatedContent from '../../components/reactbits/AnimatedContent'

export default function JobBoard() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [applied, setApplied] = useState({})
  const [expandedJob, setExpandedJob] = useState(null)

  const filtered = dummyJobs.filter(j => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.company.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter && j.job_type !== typeFilter) return false
    return true
  })

  const applyJob = (id) => {
    setApplied({ ...applied, [id]: true })
    setExpandedJob(null)
  }

  const typeColors = { 'full-time': 'badge-success', 'part-time': 'badge-info', 'internship': 'badge-warning', 'freelance': 'badge-primary' }

  return (
    <DashboardLayout title="Job Board">
      <div className="page-header">
        <h1>Job Board 💼</h1>
        <p>Discover internships and jobs matched to your skills
          <span className="badge badge-warning" style={{ marginLeft: '0.75rem' }}>Demo Data</span>
        </p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input className="form-input" placeholder="🔍 Search jobs or companies..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ flex: 2, minWidth: '200px' }} />
          <select className="form-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ minWidth: '150px' }}>
            <option value="">All Types</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="internship">Internship</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 500 }}>
        {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'} found
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map((job, idx) => (
          <AnimatedContent key={job.id} delay={0} stagger={idx * 0.08}>
            <SpotlightCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`badge ${typeColors[job.job_type] || 'badge-info'}`}>{job.job_type}</span>
                  <span className="badge" style={{ background: 'var(--bg-input)' }}>📍 {job.location}</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0 0 0.25rem' }}>{job.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>{job.company}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{job.description}</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
                  {job.required_skills.map((sk, i) => <span key={i} className="badge badge-primary">{sk}</span>)}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>💰 {job.salary_range}</span>
                  <span>📅 Deadline: {job.application_deadline}</span>
                </div>
              </div>
              <div>
                {applied[job.id] ? (
                  <span className="badge badge-success" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>✓ Applied</span>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => applyJob(job.id)}>
                    Apply Now
                  </button>
                )}
              </div>
            </div>
            </SpotlightCard>
          </AnimatedContent>
        ))}
      </div>
    </DashboardLayout>
  )
}
