import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { contentAPI } from '../../api'
import DashboardLayout from '../../components/DashboardLayout'
import SpotlightCard from '../../components/reactbits/SpotlightCard'
import AnimatedContent from '../../components/reactbits/AnimatedContent'

const TYPE_ICONS = { video: '🎬', article: '📄', quiz: '❓', ebook: '📖' }
const DIFF_COLORS = { beginner: 'badge-success', intermediate: 'badge-warning', advanced: 'badge-danger' }

export default function ContentLibrary() {
  const [view, setView] = useState('all')
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [diffFilter, setDiffFilter] = useState('')

  useEffect(() => { fetchContent() }, [view, typeFilter, diffFilter])

  const fetchContent = async () => {
    setLoading(true)
    setError(null)
    try {
      let response
      if (view === 'recommended') {
        response = await contentAPI.getRecommended()
      } else if (view === 'bookmarks') {
        response = await contentAPI.getBookmarks()
      } else {
        const params = {}
        if (typeFilter) params.type = typeFilter
        if (diffFilter) params.difficulty = diffFilter
        if (search) params.search = search
        response = await contentAPI.getAll(params)
      }
      const data = response.data
      setContent(data.data || data.content || data || [])
    } catch (err) {
      console.error('Error fetching content:', err)
      if (err.response?.status === 401 && (view === 'recommended' || view === 'bookmarks')) {
        setError('Please log in to see ' + view)
      } else {
        setError(err.response?.data?.error || err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => { e.preventDefault(); fetchContent() }

  const handleBookmark = async (id, isBookmarked) => {
    try {
      if (isBookmarked) { await contentAPI.unbookmark(id) }
      else { await contentAPI.bookmark(id) }
      fetchContent()
    } catch (err) { console.error('Bookmark error:', err) }
  }

  const filtered = Array.isArray(content) ? content.filter(c => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }) : []

  return (
    <DashboardLayout title="Content Library">
      <div className="page-header">
        <h1>Content Library 📚</h1>
        <p>Explore videos, articles, eBooks and quizzes to boost your learning</p>
      </div>

      <div className="tabs">
        {[{ key: 'all', label: '📚 All Content' }, { key: 'recommended', label: '✨ Recommended' }, { key: 'bookmarks', label: '🔖 Bookmarks' }].map(tab => (
          <button key={tab.key} className={`tab${view === tab.key ? ' active' : ''}`} onClick={() => setView(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'all' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input className="form-input" placeholder="🔍 Search content..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ flex: 2, minWidth: '200px' }} />
            <select className="form-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ minWidth: '140px' }}>
              <option value="">All Types</option>
              <option value="video">🎬 Video</option>
              <option value="article">📄 Article</option>
              <option value="ebook">📖 eBook</option>
              <option value="quiz">❓ Quiz</option>
            </select>
            <select className="form-select" value={diffFilter} onChange={e => setDiffFilter(e.target.value)} style={{ minWidth: '140px' }}>
              <option value="">All Levels</option>
              <option value="beginner">🌱 Beginner</option>
              <option value="intermediate">⚡ Intermediate</option>
              <option value="advanced">🚀 Advanced</option>
            </select>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
        </div>
      )}

      {loading && <div className="empty-state"><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>}

      {error && !loading && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>❌ {error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <span className="icon">📭</span>
          <h3>No content found</h3>
          <p>{view === 'bookmarks' ? 'You haven\'t bookmarked any content yet.' : view === 'recommended' ? 'No recommendations available.' : 'Try adjusting your search or filters.'}</p>
          {view !== 'all' && <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setView('all')}>Browse All Content</button>}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 500 }}>
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'} found
          </p>
          <div className="grid-auto">
            {filtered.map((c, idx) => (
              <AnimatedContent key={c.id} delay={0} stagger={idx * 0.06}>
                <SpotlightCard className="" style={{ cursor: 'pointer', position: 'relative' }}>
                  <button onClick={(e) => { e.stopPropagation(); handleBookmark(c.id, c.isBookmarked) }}
                    className="btn-ghost" style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', fontSize: '1.2rem', zIndex: 5, background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}
                    title={c.isBookmarked ? 'Remove bookmark' : 'Bookmark'}>
                    {c.isBookmarked ? '🔖' : '📑'}
                  </button>
                  <div style={{ width: '100%', height: '120px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', marginBottom: '1rem' }}>
                    {TYPE_ICONS[c.type] || '📄'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`badge ${DIFF_COLORS[c.difficulty] || 'badge-info'}`}>{c.difficulty || 'N/A'}</span>
                    {c.duration_minutes && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>⏱️ {c.duration_minutes} min</span>}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.5rem', lineHeight: 1.4, minHeight: '2.8rem' }}>{c.title}</h3>
                  {c.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</p>}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {c.category && <span className="badge badge-primary">{typeof c.category === 'object' ? c.category.name : c.category}</span>}
                    <span className="badge" style={{ background: 'var(--bg-input)' }}>{c.type}</span>
                  </div>
                  {c.userProgress && c.userProgress.progress_percent > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div className="progress-bar" style={{ height: '6px' }}><div className="progress-fill" style={{ width: `${c.userProgress.progress_percent}%` }} /></div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{c.userProgress.progress_percent}% complete</p>
                    </div>
                  )}
                  <button className="btn btn-primary btn-full btn-sm" onClick={() => c.url && window.open(c.url, '_blank')}>
                    {c.userProgress?.status === 'completed' ? '✓ Completed' : 'Start Learning'}
                  </button>
                </SpotlightCard>
              </AnimatedContent>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}