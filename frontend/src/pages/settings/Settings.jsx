import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { studentAuthAPI, educatorAuthAPI } from '../../api'
import DashboardLayout from '../../components/DashboardLayout'
import AnimatedContent from '../../components/reactbits/AnimatedContent'

export default function Settings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirm: '' })

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 3000)
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirm) { showMsg('error', 'Passwords do not match'); return }
    if (passwords.newPassword.length < 6) { showMsg('error', 'Min 6 characters'); return }
    if (passwords.oldPassword === passwords.newPassword) { showMsg('error', 'New password must be different'); return }
    setLoading(true)
    try {
      const authAPI = user?.role === 'educator' ? educatorAuthAPI : studentAuthAPI
      const res = await authAPI.changePassword({
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      })
      if (res.data.success) {
        showMsg('success', 'Password changed successfully!')
        setPasswords({ oldPassword: '', newPassword: '', confirm: '' })
      }
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to change password')
    } finally { setLoading(false) }
  }

  return (
    <DashboardLayout title="Settings">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
      <div className="page-header">
        <h1>Account Settings</h1>
        <p>Manage your profile and password</p>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title" style={{ marginBottom: '1rem' }}>👤 Profile Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Name</span><br /><strong>{user?.name}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Username</span><br /><strong>{user?.username}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Email</span><br /><strong>{user?.email}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Role</span><br /><span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{user?.role}</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: '1rem' }}>🔒 Change Password</div>
        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" className="form-input" value={passwords.oldPassword}
              onChange={e => setPasswords({ ...passwords, oldPassword: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" value={passwords.newPassword}
              onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-input" value={passwords.confirm}
              onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Changing...' : 'Change Password'}</button>
        </form>
      </div>
      </motion.div>
    </DashboardLayout>
  )
}
