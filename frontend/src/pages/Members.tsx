import { useEffect, useState } from 'react'
import { Plus, Search, X, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'
import WebcamCapture from '../components/WebcamCapture'

interface Member {
  id: string
  first_name: string
  last_name?: string
  email: string
  phone: string
  status: string
  city?: string
  photo?: string
}

const empty = { first_name: '', last_name: '', email: '', phone: '', city: '', photo: '' }

interface MemberDetail {
  member: any
  memberships: any[]
  payments: any[]
  attendance: any[]
  stats: { total_paid: number; total_visits: number; active_memberships: number }
}

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    active: 'bg-energy-100 text-energy-800',
    trial: 'bg-flame-100 text-flame-700',
    expired: 'bg-red-100 text-red-700',
    inactive: 'bg-ink-100 text-ink-600',
  }
  return m[s] || 'bg-ink-100 text-ink-600'
}

const Avatar = ({ photo, name, size = 40 }: { photo?: string; name: string; size?: number }) => (
  photo ? (
    <img src={photo} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-ink-900 text-energy-400 flex items-center justify-center font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || <User size={size * 0.5} />}
    </div>
  )
)

const Members = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = () => {
    setLoading(true)
    apiClient.getMembers(1, 50)
      .then((res) => setMembers(res.data.items))
      .catch(() => toast.error('Could not load members'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const viewDetail = (id: string) => {
    setDetailLoading(true); setDetail(null)
    apiClient.getMemberDetail(id)
      .then((res) => setDetail(res.data))
      .catch(() => toast.error('Could not load details'))
      .finally(() => setDetailLoading(false))
  }

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    return m.first_name.toLowerCase().includes(q) || (m.last_name || '').toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) || m.phone.includes(q)
  })

  const openAdd = () => { setEditingId(null); setForm(empty); setShowModal(true) }
  const openEdit = (m: Member) => {
    setEditingId(m.id)
    setForm({ first_name: m.first_name, last_name: m.last_name || '', email: m.email, phone: m.phone, city: m.city || '', photo: m.photo || '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.first_name || !form.email || !form.phone) { toast.error('Name, email and phone required'); return }
    setSaving(true)
    try {
      if (editingId) { await apiClient.updateMember(editingId, form); toast.success('Member updated') }
      else { await apiClient.createMember(form); toast.success('Member added') }
      setShowModal(false); load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this member?')) return
    try { await apiClient.deleteMember(id); toast.success('Member deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Members</h1>
          <p className="text-ink-500 text-sm">{members.length} total members</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center justify-center gap-2">
          <Plus size={18} /> Add Member
        </button>
      </div>

      <div className="card p-3 mb-5">
        <div className="flex items-center bg-ink-50 rounded-xl px-4 py-2.5">
          <Search size={18} className="text-ink-400" />
          <input type="text" placeholder="Search by name, email or phone..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent ml-3 w-full outline-none text-ink-900 placeholder-ink-400" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="text-ink-500 p-8 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <User size={40} className="text-ink-300 mx-auto mb-3" />
            <p className="text-ink-500">No members yet. Add your first member to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50">
                  <th className="text-left py-3 px-5 font-semibold text-ink-600 text-sm">Member</th>
                  <th className="text-left py-3 px-5 font-semibold text-ink-600 text-sm">Phone</th>
                  <th className="text-left py-3 px-5 font-semibold text-ink-600 text-sm">Status</th>
                  <th className="text-left py-3 px-5 font-semibold text-ink-600 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-ink-50 hover:bg-ink-50 transition">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar photo={m.photo} name={`${m.first_name} ${m.last_name || ''}`} />
                        <div>
                          <p className="font-semibold text-ink-900">{m.first_name} {m.last_name}</p>
                          <p className="text-ink-500 text-xs">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-ink-700">{m.phone}</td>
                    <td className="py-3 px-5"><span className={`badge ${statusColor(m.status)} capitalize`}>{m.status}</span></td>
                    <td className="py-3 px-5">
                      <button onClick={() => viewDetail(m.id)} className="text-ink-600 hover:text-ink-900 mr-3 font-medium text-sm">View</button>
                      <button onClick={() => openEdit(m)} className="text-energy-700 hover:text-energy-800 mr-3 font-medium text-sm">Edit</button>
                      <button onClick={() => remove(m.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-ink-50">
              {filtered.map((m) => (
                <div key={m.id} className="p-4 flex items-center gap-3">
                  <Avatar photo={m.photo} name={`${m.first_name} ${m.last_name || ''}`} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900 truncate">{m.first_name} {m.last_name}</p>
                    <p className="text-ink-500 text-xs truncate">{m.phone}</p>
                    <span className={`badge ${statusColor(m.status)} capitalize mt-1 inline-block`}>{m.status}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <button onClick={() => viewDetail(m.id)} className="text-ink-600 font-medium">View</button>
                    <button onClick={() => openEdit(m)} className="text-energy-700 font-medium">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-ink-900">{editingId ? 'Edit Member' : 'Add Member'}</h2>
              <button onClick={() => setShowModal(false)} className="text-ink-400 hover:text-ink-700"><X size={22} /></button>
            </div>

            <div className="mb-5">
              <WebcamCapture value={form.photo} onCapture={(d) => setForm({ ...form, photo: d })} />
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="First name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                <input className="input" placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <input className="input" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="input" placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <button onClick={save} disabled={saving} className="btn-primary w-full mt-5 disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {(detailLoading || detail) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-ink-900">Member Profile</h2>
              <button onClick={() => setDetail(null)} className="text-ink-400 hover:text-ink-700"><X size={22} /></button>
            </div>
            {detailLoading ? (
              <p className="text-ink-500 py-8 text-center">Loading...</p>
            ) : detail ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <Avatar photo={detail.member.photo} name={`${detail.member.first_name} ${detail.member.last_name || ''}`} size={72} />
                  <div>
                    <h3 className="text-xl font-bold text-ink-900">{detail.member.first_name} {detail.member.last_name}</h3>
                    <p className="text-ink-500 text-sm">{detail.member.email}</p>
                    <p className="text-ink-500 text-sm">{detail.member.phone}</p>
                    <span className={`badge ${statusColor(detail.member.status)} capitalize mt-1 inline-block`}>{detail.member.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-energy-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-extrabold text-energy-700">₹{detail.stats.total_paid.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-ink-600 font-medium">Total Paid</p>
                  </div>
                  <div className="bg-ink-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-extrabold text-ink-900">{detail.stats.total_visits}</p>
                    <p className="text-xs text-ink-600 font-medium">Visits</p>
                  </div>
                  <div className="bg-flame-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-extrabold text-flame-600">{detail.stats.active_memberships}</p>
                    <p className="text-xs text-ink-600 font-medium">Active Plans</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-ink-900 mb-2">Memberships</h4>
                  {detail.memberships.length === 0 ? <p className="text-ink-400 text-sm">No memberships yet</p> : (
                    <div className="space-y-2">
                      {detail.memberships.map((ms) => (
                        <div key={ms.id} className="flex justify-between items-center text-sm border border-ink-100 rounded-xl px-4 py-2.5">
                          <div>
                            <span className={`badge ${statusColor(ms.status)} capitalize`}>{ms.status}</span>
                            {ms.started_date && (
                              <span className="text-ink-500 ml-2 text-xs">
                                {new Date(ms.started_date).toLocaleDateString()} → {ms.ended_date ? new Date(ms.ended_date).toLocaleDateString() : '—'}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold">₹{(ms.final_price ?? 0).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-ink-900 mb-2">Recent Payments</h4>
                  {detail.payments.length === 0 ? <p className="text-ink-400 text-sm">No payments yet</p> : (
                    <div className="space-y-2">
                      {detail.payments.map((p) => (
                        <div key={p.id} className="flex justify-between text-sm border border-ink-100 rounded-xl px-4 py-2.5">
                          <span className="text-ink-700">{p.purpose?.replace('_', ' ') || 'Payment'}</span>
                          <span className="font-semibold">₹{p.amount.toLocaleString('en-IN')} <span className="text-ink-400 capitalize font-normal">({p.status})</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-ink-900 mb-2">Recent Visits</h4>
                  {detail.attendance.length === 0 ? <p className="text-ink-400 text-sm">No check-ins yet</p> : (
                    <div className="space-y-2">
                      {detail.attendance.map((a) => (
                        <div key={a.id} className="flex justify-between text-sm border border-ink-100 rounded-xl px-4 py-2.5">
                          <span className="text-ink-700">{a.check_in_time ? new Date(a.check_in_time).toLocaleDateString() : '-'}</span>
                          <span className="text-ink-500">{a.duration_minutes ? `${a.duration_minutes} min` : 'In progress'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default Members
