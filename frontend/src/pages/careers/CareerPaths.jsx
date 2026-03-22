import React, { useState, useEffect } from 'react'
import { careerAPI } from '../../api'
import DashboardLayout from '../../components/DashboardLayout'

export default function CareerPaths() {
  const [paths, setPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedPath, setSelectedPath] = useState(null)

  useEffect(() => { fetchPaths() }, [])

  const fetchPaths = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await careerAPI.getAll()
      const data = res.data
      setPaths(data.data || data.careerPaths || data || [])
    } catch (err) {
      console.error('Error fetching career paths:', err)
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPathDetail = async (id) => {
    try {
      const res = await careerAPI.getOne(id)
      const data = res.data
      setSelectedPath(data.data || data.careerPath || data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const filtered = Array.isArray(paths) ? paths.filter(c =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.field?.toLowerCase().includes(search.toLowerCase())
  ) : []

  return (
    <DashboardLayout title="Career Paths">
      <div className="page-header">
        <h1>Career Paths 🎯</h1>
        <p>Explore curated career roadmaps with step-by-step guidance</p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input className="form-input" placeholder="🔍 Search career paths..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: '400px' }} />
      </div>

      {loading && <div className="empty-state"><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>}
      {error && !loading && <div className="alert alert-error">❌ {error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state"><span className="icon">🎯</span><h3>No career paths found</h3><p>Career paths will appear here once added.</p></div>
      )}

      {selectedPath && (
        <div className="modal-overlay" onClick={() => setSelectedPath(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedPath.title}</h2>
              <button className="modal-close" onClick={() => setSelectedPath(null)}>×</button>
            </div>
            {selectedPath.description && <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{selectedPath.description}</p>}
            {selectedPath.field && <span className="badge badge-primary" style={{ marginBottom: '1rem', display: 'inline-block' }}>{selectedPath.field}</span>}
            {selectedPath.required_skills && selectedPath.required_skills.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Required Skills:</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {selectedPath.required_skills.map((sk, i) => <span key={i} className="badge badge-info">{sk}</span>)}
                </div>
              </div>
            )}
            {selectedPath.avg_salary_range && <p style={{ fontWeight: 700, color: 'var(--success)' }}>💰 Avg Salary: {selectedPath.avg_salary_range}</p>}
            {selectedPath.content && selectedPath.content.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Linked Content ({selectedPath.content.length}):</div>
                {selectedPath.content.map((c, i) => (
                  <div key={i} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{c.title}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.type} • {c.difficulty}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid-auto">
          {filtered.map(cp => (
            <div className="card card-hover" key={cp.id} style={{ cursor: 'pointer' }} onClick={() => fetchPathDetail(cp.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                {cp.field && <span className="badge badge-primary">{cp.field}</span>}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem', margin: '0 0 0.5rem' }}>{cp.title}</h3>
              {cp.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>{cp.description}</p>}
              {cp.required_skills && cp.required_skills.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {cp.required_skills.slice(0, 4).map((sk, i) => <span key={i} className="badge badge-info">{sk}</span>)}
                    {cp.required_skills.length > 4 && <span className="badge" style={{ background: 'var(--bg-input)' }}>+{cp.required_skills.length - 4}</span>}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {cp.avg_salary_range && <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>💰 {cp.avg_salary_range}</span>}
                <button className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); fetchPathDetail(cp.id) }}>View Details →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
