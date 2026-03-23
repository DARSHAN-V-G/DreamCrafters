import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  Users, 
  UserCheck, 
  FileEdit, 
  Activity, 
  Settings, 
  User 
} from 'lucide-react'
import '../student/Dashboard.css'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin')
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>DreamCrafters Admin</h2>
        </div>
        <div className="nav-actions">
          <span className="user-greeting">Hello, {user?.name}!</span>
          <button onClick={handleLogout} className="btn btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Admin Dashboard</h1>
          <p className="role-badge admin-badge">Administrator</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><Users size={24} /></div>
            <h3>Total Students</h3>
            <p className="stat-value">0</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><UserCheck size={24} /></div>
            <h3>Total Educators</h3>
            <p className="stat-value">0</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><FileEdit size={24} /></div>
            <h3>Total Activities</h3>
            <p className="stat-value">0</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><Activity size={24} /></div>
            <h3>System Status</h3>
            <p className="stat-value">Active</p>
          </div>
        </div>

        <div className="info-section">
          <div className="info-card">
            <h3><Settings size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> System Management</h3>
            <p className="empty-state">Admin controls and system settings will appear here.</p>
          </div>

          <div className="info-card">
            <h3><User size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Admin Information</h3>
            <div className="profile-info">
              <p><strong>Name:</strong> {user?.name}</p>
              <p><strong>Username:</strong> {user?.username}</p>
              <p><strong>Role:</strong> Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
