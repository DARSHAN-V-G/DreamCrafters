import { useEffect, useState } from 'react'
import { User, Save } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { studentAuthAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'

export default function Profile() {
  const { updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [form, setForm] = useState({ name: '', username: '', location: '' })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await studentAuthAPI.getProfile()
      if (res.data.success) {
        const user = res.data.user
        setForm({
          name: user.name || '',
          username: user.username || '',
          location: user.location || '',
        })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await studentAuthAPI.updateProfile(form)
      if (res.data.success) {
        updateUser(res.data.user)
        setMessage({ type: 'success', text: 'Profile updated successfully' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Profile">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          Profile
          <User size={28} color="var(--primary)" />
        </h1>
        <p>View and edit your account details</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem' }}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ maxWidth: '640px' }}>
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                className="form-input"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="City, State"
              />
            </div>

            <div>
              <button className="btn btn-primary" type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}
