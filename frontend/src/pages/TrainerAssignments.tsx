import { useEffect, useState } from 'react'
import { Plus, Trash2, UserCheck, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Assignment { id: string; trainer_id: string; member_id: string; trainer_name: string; member_name: string; monthly_fee?: number; is_active: boolean; assigned_date: string; notes?: string }
interface Trainer { id: string; name: string; role: string; member_count?: number; trainer_id?: string; trainer_name?: string }
interface Member { id: string; first_name: string; last_name: string }

const emptyForm = { trainer_id: '', member_id: '', monthly_fee: '', notes: '' }

export default function TrainerAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [trainerSummary, setTrainerSummary] = useState<Trainer[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [tab, setTab] = useState<'assignments' | 'trainers'>('assignments')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterTrainer, setFilterTrainer] = useState('')

  const load = () => {
    setLoading(true)
    const params: any = { active_only: true }
    if (filterTrainer) params.trainer_id = filterTrainer
    Promise.all([
      apiClient.getTrainerAssignments(params),
      apiClient.getTrainers(),
      apiClient.getTrainerSummary(),
      apiClient.getMembers(1, 200),
    ]).then(([a, t, ts, m]) => {
      setAssignments(a.data)
      setTrainers(t.data)
      setTrainerSummary(ts.data)
      setMembers(m.data.items || [])
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterTrainer])

  const saveAssignment = async () => {
    if (!form.trainer_id || !form.member_id) { toast.error('Select trainer and member'); return }
    setSaving(true)
    try {
      await apiClient.assignTrainer({ ...form, monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null })
      toast.success('Trainer assigned!')
      setShowModal(false)
      setForm(emptyForm)
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const unassign = async (id: string) => {
    if (!confirm('Unassign this trainer?')) return
    try { await apiClient.updateTrainerAssignment(id, { is_active: false }); toast.success('Unassigned'); load() }
    catch { toast.error('Failed') }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal Trainer Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">Assign personal trainers to members and track their load</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm">
          <Plus size={15} /> Assign Trainer
        </button>
      </div>

      {/* Trainer Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {trainerSummary.map(t => (
          <div key={t.trainer_id} className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${filterTrainer === t.trainer_id ? 'border-purple-400 ring-1 ring-purple-400' : 'border-gray-200 hover:border-gray-300'}`}
            onClick={() => setFilterTrainer(filterTrainer === t.trainer_id ? '' : (t.trainer_id ?? ''))}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <UserCheck size={14} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{t.trainer_name}</p>
                <p className="text-xs text-gray-500 capitalize">{t.role.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600">{t.member_count}</div>
            <div className="text-xs text-gray-500">active members</div>
          </div>
        ))}
        {trainerSummary.length === 0 && !loading && (
          <div className="col-span-4 text-center py-8 text-gray-400">No trainers found. Add staff with trainer role first.</div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['assignments', 'trainers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {filterTrainer && (
        <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-2 rounded-lg w-fit">
          <Users size={14} /> Filtering by trainer: {trainers.find(t => t.id === filterTrainer)?.name}
          <button onClick={() => setFilterTrainer('')} className="ml-1 text-purple-400 hover:text-purple-600 font-bold">×</button>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : tab === 'assignments' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {assignments.length === 0 ? (
            <div className="text-center py-16">
              <UserCheck size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No active assignments{filterTrainer ? ' for this trainer' : ''}.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Member</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Trainer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Monthly Fee</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Since</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr></thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{a.member_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{a.trainer_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{a.monthly_fee ? `₹${a.monthly_fee.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 hidden sm:table-cell">{new Date(a.assigned_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => unassign(a.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                        <Trash2 size={12} /> Unassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map(t => {
            const summary = trainerSummary.find(ts => ts.trainer_id === t.id)
            const myAssignments = assignments.filter(a => a.trainer_id === t.id)
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600">{t.name[0]}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{t.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between"><span>Active Members</span><span className="font-semibold text-purple-600">{summary?.member_count ?? 0}</span></div>
                </div>
                {myAssignments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">ASSIGNED MEMBERS</p>
                    <div className="space-y-1">
                      {myAssignments.map(a => (
                        <div key={a.id} className="flex items-center justify-between text-xs text-gray-700">
                          <span>{a.member_name}</span>
                          <span className="text-gray-400">{a.monthly_fee ? `₹${a.monthly_fee}` : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Assign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Assign Personal Trainer</h2>
            <div><label className="text-xs font-medium text-gray-600">Trainer *</label>
              <select value={form.trainer_id} onChange={e => setForm({ ...form, trainer_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">Select trainer</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role.replace('_', ' ')})</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-600">Member *</label>
              <select value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">Select member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-600">Monthly PT Fee (₹)</label>
              <input type="number" value={form.monthly_fee} onChange={e => setForm({ ...form, monthly_fee: e.target.value })} placeholder="0" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
            <div><label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm resize-none" /></div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveAssignment} disabled={saving} className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm hover:bg-purple-700 disabled:opacity-50">{saving ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
