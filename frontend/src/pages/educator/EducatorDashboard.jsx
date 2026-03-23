import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  Users, 
  BookOpen, 
  CheckSquare, 
  BarChart, 
  ClipboardList, 
  Building 
} from 'lucide-react'
import './Dashboard.css'

export default function EducatorDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>DreamCrafters</h2>
        </div>
        <div className="nav-actions">
          <span className="user-greeting">Hello, {user?.organizationName}!</span>
          <button onClick={() => navigate('/educator/settings')} className="btn btn-secondary">Change Password</button>
          <button onClick={handleLogout} className="btn btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Educator Dashboard</h1>
          <p className="role-badge educator-badge">Educator</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><Users size={24} /></div>
            <h3>Total Students</h3>
            <p className="stat-value">0</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><BookOpen size={24} /></div>
            <h3>Active Activities</h3>
            <p className="stat-value">0</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><CheckSquare size={24} /></div>
            <h3>Pending Approvals</h3>
            <p className="stat-value">0</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><BarChart size={24} /></div>
            <h3>This Month</h3>
            <p className="stat-value">0 pts</p>
          </div>
        </div>

        <div className="info-section">
          <div className="info-card">
            <h3><ClipboardList size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Recent Submissions</h3>
            <p className="empty-state">No recent submissions to review.</p>
          </div>

          <div className="info-card">
            <h3><Building size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Organization Information</h3>
            <div className="profile-info">
              <p><strong>Organization:</strong> {user?.organizationName}</p>
              <p><strong>Username:</strong> {user?.username}</p>
              <p><strong>Email:</strong> {user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
