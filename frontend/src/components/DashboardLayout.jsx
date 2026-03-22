import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

export default function DashboardLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
              style={{ display: 'none', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ☰
            </button>
            <h1 className="top-navbar-title">{title || 'Dashboard'}</h1>
          </div>
          <div className="top-navbar-actions">
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Welcome, <strong>{user?.name}</strong>
            </span>
          </div>
        </nav>
        <div className="page-content fade-in">
          {children}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </div>
  )
}
