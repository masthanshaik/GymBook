import { useEffect, useState } from 'react'
import { Plus, X, Lock, Unlock } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Locker {
  id: string; locker_number: string; location?: string; status: string
  member_id?: string; member_name?: string; assigned_date?: string; expiry_date?: string
  monthly_fee: number; notes?: string
}
interface Member { id: string; first_name: string; last_name?: string; phone: string }

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-energy-100 text-energy-800 border-energy-200',
  occupied: 'bg-flame-100 text-flame-700 border-flame-200',
  maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

const Lockers = () => {
  const [lockers, setLockers] = useState<Locker[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0 })
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showAssign, setShowAssign] = useState<Locker | null>(null)
  const [newLocker, setNewLocker] = useState({ locker_number: '', location: '', monthly_fee: '' })
  const [assignForm, setAssignForm] = useState({ member_id: '', expiry_date: '', monthly_fee: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    apiClient.getLockers().then(r => {
      setLockers(r.data.items || [])
      setStats({ total: r.data.total, available: r.data.available, occupied: r.data.occupied })
    }).catch(() => toast.error('Failed to load lockers')).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    apiClient.getMembers(1, 200).then(r => setMembers(r.data.items || []))
  }, [])

  const addLocker = async () => {
    if (!newLocker.locker_number) return toast.error('Locker number is required')
    setSaving(true)
    try {
      await apiClient.createLocker({ ...newLocker, monthly_fee: parseFloat(newLocker.monthly_fee || '0') })
      toast.success('Locker added')
      setShowAdd(false)
      setNewLocker({ locker_number: '', location: '', monthly_fee: '' })
      load()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const assign = async () => {
    if (!showAssign || !assignForm.member_id) return toast.error('Select a member')
    setSaving(true)
    try {
      const payload: any = { member_id: assignForm.member_id, monthly_fee: parseFloat(assignForm.monthly_fee || String(showAssign.monthly_fee)) }
      if (assignForm.expiry_date) payload.expiry_date = new Date(assignForm.expiry_date).toISOString()
      await apiClient.assignLocker(showAssign.id, payload)
      toast.success('Locker assigned')
      setShowAssign(null)
      setAssignForm({ member_id: '', expiry_date: '', monthly_fee: '' })
      load()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const release = async (locker: Locker) => {
    if (!confirm(`Release locker ${locker.locker_number} from ${locker.member_name}?`)) return
    try {
      await apiClient.releaseLocker(locker.id)
      toast.success('Locker released')
      load()
    } catch { toast.error('Failed to release') }
  }

  const setMaintenance = async (locker: Locker) => {
    const isMaintenance = locker.status === 'maintenance'
    try {
      await apiClient.updateLocker(locker.id, { status: isMaintenance ? 'available' : 'maintenance' })
      toast.success(isMaintenance ? 'Locker marked available' : 'Locker under maintenance')
      load()
    } catch { toast.error('Failed') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Locker Management</h1>
          <p className="text-ink-500 text-sm">Assign and track gym lockers</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Locker
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Lockers', value: stats.total, color: 'text-ink-900' },
          { label: 'Available', value: stats.available, color: 'text-energy-600' },
          { label: 'Occupied', value: stats.occupied, color: 'text-flame-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-ink-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-ink-500">Loading lockers...</p>
      ) : lockers.length === 0 ? (
        <div className="card p-10 text-center">
          <Lock size={40} className="mx-auto text-ink-300 mb-3" />
          <p className="text-ink-400">No lockers added yet. Click "Add Locker" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {lockers.map(l => (
            <div key={l.id} className={`relative rounded-2xl border-2 p-4 transition hover:shadow-md ${STATUS_COLORS[l.status] || 'bg-ink-50 border-ink-200'}`}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-xl font-extrabold">{l.locker_number}</span>
                {l.status === 'occupied' ? <Lock size={16} /> : <Unlock size={16} />}
              </div>
              {l.location && <p className="text-xs opacity-70 mb-1">{l.location}</p>}
              {l.status === 'occupied' && (
                <p className="text-xs font-medium truncate mb-1">{l.member_name}</p>
              )}
              {l.monthly_fee > 0 && <p className="text-xs opacity-70">₹{l.monthly_fee}/mo</p>}
              <div className="mt-3 flex flex-col gap-1">
                {l.status === 'available' && (
                  <button onClick={() => { setShowAssign(l); setAssignForm({ member_id: '', expiry_date: '', monthly_fee: String(l.monthly_fee) }) }}
                    className="text-xs font-medium bg-energy-500 text-ink-950 rounded-lg px-2 py-1 hover:bg-energy-400 transition">
                    Assign
                  </button>
                )}
                {l.status === 'occupied' && (
                  <button onClick={() => release(l)} className="text-xs font-medium bg-white/70 rounded-lg px-2 py-1 hover:bg-white transition">
                    Release
                  </button>
                )}
                <button onClick={() => setMaintenance(l)} className="text-xs bg-white/50 rounded-lg px-2 py-1 hover:bg-white/80 transition">
                  {l.status === 'maintenance' ? 'Mark Available' : 'Maintenance'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Locker Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-ink-900">Add Locker</h2>
              <button onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Locker Number *</label>
                <input className="input w-full text-sm" placeholder="e.g. A01, 101" value={newLocker.locker_number} onChange={e => setNewLocker(p => ({ ...p, locker_number: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Location / Section</label>
                <input className="input w-full text-sm" placeholder="e.g. Row A, Male section" value={newLocker.location} onChange={e => setNewLocker(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Monthly Fee (₹)</label>
                <input type="number" step="1" className="input w-full text-sm" value={newLocker.monthly_fee} onChange={e => setNewLocker(p => ({ ...p, monthly_fee: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={addLocker} disabled={saving} className="btn-primary flex-1">{saving ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-ink-900">Assign Locker {showAssign.locker_number}</h2>
              <button onClick={() => setShowAssign(null)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Member *</label>
                <select className="input w-full text-sm" value={assignForm.member_id} onChange={e => setAssignForm(p => ({ ...p, member_id: e.target.value }))}>
                  <option value="">Select member...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name || ''} — {m.phone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Expiry Date</label>
                <input type="date" className="input w-full text-sm" value={assignForm.expiry_date} onChange={e => setAssignForm(p => ({ ...p, expiry_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Monthly Fee (₹)</label>
                <input type="number" className="input w-full text-sm" value={assignForm.monthly_fee} onChange={e => setAssignForm(p => ({ ...p, monthly_fee: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAssign(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={assign} disabled={saving} className="btn-primary flex-1">{saving ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Lockers
