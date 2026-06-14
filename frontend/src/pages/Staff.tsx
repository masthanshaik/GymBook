import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface StaffMember {
  id: string
  email: string
  phone?: string
  first_name: string
  last_name?: string
  role: string
  is_active: boolean
  last_login?: string
  created_at: string
}

const roleColors: Record<string, string> = {
  gym_owner: 'bg-energy-100 text-energy-800',
  gym_manager: 'bg-blue-100 text-blue-700',
  front_desk: 'bg-purple-100 text-purple-700',
  trainer: 'bg-flame-100 text-flame-700',
}

const ROLES = ['gym_manager', 'front_desk', 'trainer']

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', role: 'front_desk', password: '' }

const Staff = () => {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    apiClient.getStaff()
      .then(r => setStaff(r.data))
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (s: StaffMember) => {
    setEditingId(s.id)
    setForm({ first_name: s.first_name, last_name: s.last_name || '', email: s.email, phone: s.phone || '', role: s.role, password: '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.first_name || !form.email) { toast.error('Name and email are required'); return }
    if (!editingId && form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (!payload.password) delete payload.password
      if (editingId) {
        await apiClient.updateStaff(editingId, payload)
        toast.success('Staff member updated')
      } else {
        await apiClient.createStaff(payload)
        toast.success('Staff member added')
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return
    try {
      await apiClient.deleteStaff(id)
      toast.success('Staff member removed')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to remove')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Staff Management</h1>
          <p className="text-ink-500 text-sm">Manage your gym team members and their roles</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {loading ? (
        <p className="text-ink-500">Loading staff...</p>
      ) : staff.length === 0 ? (
        <div className="card p-10 text-center">
          <Shield size={40} className="mx-auto text-ink-300 mb-3" />
          <p className="text-ink-500">No staff members yet. Add your first team member.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                {['Name', 'Email', 'Phone', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-ink-50 transition">
                  <td className="px-4 py-3 font-medium text-ink-900">{s.first_name} {s.last_name || ''}</td>
                  <td className="px-4 py-3 text-ink-600">{s.email}</td>
                  <td className="px-4 py-3 text-ink-600">{s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[s.role] || 'bg-ink-100 text-ink-600'}`}>
                      {s.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="text-ink-400 hover:text-ink-700 transition">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => remove(s.id, s.first_name)} className="text-ink-400 hover:text-red-600 transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-ink-900 mb-4">{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
            <div className="space-y-3">
              {(['first_name', 'last_name', 'email', 'phone'] as const).map(f => (
                <div key={f}>
                  <label className="block text-sm font-medium text-ink-700 mb-1 capitalize">{f.replace('_', ' ')}{f === 'first_name' || f === 'email' ? ' *' : ''}</label>
                  <input
                    type={f === 'email' ? 'email' : 'text'}
                    className="input w-full"
                    value={(form as any)[f]}
                    onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Role *</label>
                <select className="input w-full" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Password {editingId ? '(leave blank to keep)' : '*'}</label>
                <input
                  type="password"
                  className="input w-full"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={editingId ? 'Leave blank to keep current' : 'Min 8 characters'}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Staff
