import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Users } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { mentorRequestAPI } from '../../api'

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await mentorRequestAPI.list()
      if (res.data.success) {
        setRequests(res.data.data || [])
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id, action) => {
    setBusyId(id)
    try {
      if (action === 'accept') {
        await mentorRequestAPI.accept(id)
      } else {
        await mentorRequestAPI.reject(id)
      }
      await loadRequests()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update request')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout title="Requests">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          Session Requests
          <Users size={28} color="var(--primary)" />
        </h1>
        <p>Review student mentor-session requests</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="empty-state">
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <Users size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No requests yet</h3>
          <p>Student requests will appear here.</p>
        </div>
      ) : (
        <div className="grid-auto">
          {requests.map((request) => (
            <div className="card" key={request.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.35rem' }}>{request.topic || 'Session Request'}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    Student: <strong>{request.student?.name || 'Unknown'}</strong>
                  </p>
                </div>
                <span className={`badge ${request.status === 'accepted' ? 'badge-success' : request.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`} style={{ textTransform: 'capitalize' }}>
                  {request.status}
                </span>
              </div>

              <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Requested on {new Date(request.createdAt).toLocaleString('en-IN')}
              </div>

              {request.status === 'requested' && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => updateStatus(request.id, 'accept')}
                    disabled={busyId === request.id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <CheckCircle2 size={16} /> Accept
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => updateStatus(request.id, 'reject')}
                    disabled={busyId === request.id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
