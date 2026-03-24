import React, { useState } from 'react'
import Sidebar from './Sidebar'
import FeedbackButton from './FeedbackButton'
import FeedbackModal from './FeedbackModal'
import { useAuth } from '../context/AuthContext'
import { Menu } from 'lucide-react'

export default function DashboardLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <nav className="top-navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="btn-ghost mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--text-primary)' }}
            >
              <Menu size={24} />
            </button>
            <h1 className="top-navbar-title">{title || 'Dashboard'}</h1>
          </div>
          <div className="top-navbar-actions">
            <FeedbackButton onClick={() => setIsFeedbackOpen(true)} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Welcome, <strong>{user?.name || user?.organizationName}</strong>
            </span>
          </div>
        </nav>
        <div className="page-content fade-in">
          {children}
        </div>
      </div>
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
        pageName={title || 'DreamCrafters'}
      />
      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </div>
  )
}
