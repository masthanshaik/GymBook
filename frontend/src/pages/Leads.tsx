import { useEffect, useState } from 'react'
import { Plus, Search, UserCheck, Trash2, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Lead {
  id: string; first_name: string; last_name?: string
  email?: string; phone: string; source?: string; interest?: string
  status: string; follow_up_date?: string; notes?: string
  converted_member_id?: string; created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  trial: { label: 'Trial', color: 'bg-purple-100 text-purple-700' },
  converted: { label: 'Converted', color: 'bg-energy-100 text-energy-800' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700' },
}

const SOURCES = ['walk-in', 'online', 'referral', 'social_media', 'phone', 'other']
const STATUSES = Object.keys(STATUS_CONFIG)

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', source: 'walk-in', interest: '', status: 'new', follow_up_date: '', notes: '' }

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const load = () => {
    setLoading(true)
    const params: any = { page: 1, page_size: 100 }
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    Promise.all([apiClient.getLeads(params), apiClient.getLeadStats()])
      .then(([r, s]) => { setLeads(r.data.items || []); setStats(s.data) })
      .catch(() => toast.error('Failed to load leads'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterStatus])

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (l: Lead) => {
    setEditingId(l.id)
    setForm({ first_name: l.first_name, last_name: l.last_name || '', email: l.email || '', phone: l.phone, source: l.source || 'walk-in', interest: l.interest || '', status: l.status, follow_up_date: l.follow_up_date ? l.follow_up_date.split('T')[0] : '', notes: l.notes || '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.first_name || !form.phone) { toast.error('Name and phone are required'); return }
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (payload.follow_up_date) payload.follow_up_date = new Date(payload.follow_up_date).toISOString()
      else delete payload.follow_up_date
      if (editingId) {
        await apiClient.updateLead(editingId, payload)
        toast.success('Lead updated')
      } else {
        await apiClient.createLead(payload)
        toast.success('Lead added')
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const convert = async (id: string, name: string) => {
    if (!confirm(`Convert ${name} to a member?`)) return
    try {
      const r = await apiClient.convertLead(id)
      toast.success(r.data.message)
      load()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Conversion failed') }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this lead?')) return
    try {
      await apiClient.deleteLead(id)
      toast.success('Lead deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Leads & CRM</h1>
          <p className="text-ink-500 text-sm">Track enquiries and convert them to members</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium border-2 transition ${
                filterStatus === key ? 'border-energy-500 bg-energy-50' : 'border-transparent bg-white shadow-sm hover:shadow'
              }`}
            >
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs mr-2 ${cfg.color}`}>{stats.by_status?.[key] ?? 0}</span>
              {cfg.label}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-9 w-full text-sm" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-ink-500">Loading leads...</p>
      ) : leads.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-400">No leads found. Start adding enquiries!</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                {['Name', 'Phone', 'Source', 'Interest', 'Status', 'Follow-up', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {leads.map(l => (
                <tr key={l.id} className="hover:bg-ink-50 transition">
                  <td className="px-4 py-3 font-medium text-ink-900">{l.first_name} {l.last_name || ''}</td>
                  <td className="px-4 py-3 text-ink-600">{l.phone}</td>
                  <td className="px-4 py-3 text-ink-500 capitalize">{l.source?.replace('_', ' ') || '—'}</td>
                  <td className="px-4 py-3 text-ink-500 max-w-[120px] truncate">{l.interest || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[l.status]?.color || 'bg-ink-100 text-ink-600'}`}>
                      {STATUS_CONFIG[l.status]?.label || l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-500 text-xs">
                    {l.follow_up_date ? new Date(l.follow_up_date).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(l)} className="text-ink-400 hover:text-ink-700 transition"><Edit2 size={14} /></button>
                      {l.status !== 'converted' && (
                        <button onClick={() => convert(l.id, l.first_name)} title="Convert to member" className="text-ink-400 hover:text-energy-600 transition"><UserCheck size={14} /></button>
                      )}
                      <button onClick={() => remove(l.id)} className="text-ink-400 hover:text-red-600 transition"><Trash2 size={14} /></button>
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
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-ink-900 mb-4">{editingId ? 'Edit Lead' : 'Add Lead'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {['first_name', 'last_name'].map(f => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-ink-600 mb-1 capitalize">{f.replace('_', ' ')}{f === 'first_name' ? ' *' : ''}</label>
                    <input className="input w-full text-sm" value={(form as any)[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                  </div>
                ))}
              </div>
              {[['phone', 'Phone *', 'tel'], ['email', 'Email', 'email']].map(([f, label, type]) => (
                <div key={f}>
                  <label className="block text-xs font-medium text-ink-600 mb-1">{label}</label>
                  <input type={type} className="input w-full text-sm" value={(form as any)[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Source</label>
                  <select className="input w-full text-sm" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Status</label>
                  <select className="input w-full text-sm" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Interest / Goal</label>
                <input className="input w-full text-sm" placeholder="e.g. weight loss, muscle gain" value={form.interest} onChange={e => setForm(p => ({ ...p, interest: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Follow-up Date</label>
                <input type="date" className="input w-full text-sm" value={form.follow_up_date} onChange={e => setForm(p => ({ ...p, follow_up_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Notes</label>
                <textarea className="input w-full text-sm" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Leads
