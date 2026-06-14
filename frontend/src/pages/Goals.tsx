import { useEffect, useState } from 'react'
import { Plus, Trash2, Target, CheckCircle, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Goal {
  id: string; member_id: string; goal_type: string; title: string
  description?: string; target_value?: number; target_unit?: string
  current_value?: number; deadline?: string; status: string; notes?: string; created_at: string
}

interface Member { id: string; first_name: string; last_name: string }

const GOAL_TYPES = ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'custom']
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  achieved: 'bg-green-100 text-green-700',
  abandoned: 'bg-gray-100 text-gray-500',
}

const empty = {
  member_id: '', goal_type: 'weight_loss', title: '', description: '',
  target_value: '', target_unit: 'kg', current_value: '', deadline: '', notes: '',
}

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>(empty)
  const [saving, setSaving] = useState(false)
  const [filterMember, setFilterMember] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [progressValue, setProgressValue] = useState('')

  const load = () => {
    setLoading(true)
    const params: any = {}
    if (filterMember) params.member_id = filterMember
    if (filterStatus) params.goal_status = filterStatus
    Promise.all([
      apiClient.get('/goals', { params }),
      apiClient.getMembers(),
    ])
      .then(([gr, mr]) => {
        setGoals(gr.data)
        setMembers(mr.data.items || mr.data.members || [])
      })
      .catch(() => toast.error('Failed to load goals'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterMember, filterStatus])

  const memberName = (id: string) => {
    const m = members.find(m => m.id === id)
    return m ? `${m.first_name} ${m.last_name}` : 'Unknown'
  }

  const handleSave = async () => {
    if (!form.member_id) { toast.error('Select a member'); return }
    if (!form.title.trim()) { toast.error('Goal title is required'); return }
    setSaving(true)
    try {
      await apiClient.post('/goals', {
        ...form,
        target_value: form.target_value ? Number(form.target_value) : null,
        current_value: form.current_value ? Number(form.current_value) : null,
        deadline: form.deadline || null,
      })
      toast.success('Goal created!')
      setShowModal(false)
      setForm(empty)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to create goal')
    } finally {
      setSaving(false)
    }
  }

  const updateProgress = async (goal: Goal) => {
    if (!progressValue && progressValue !== '0') { toast.error('Enter a value'); return }
    try {
      await apiClient.patch(`/goals/${goal.id}`, { current_value: Number(progressValue) })
      toast.success('Progress updated!')
      setEditingGoal(null)
      setProgressValue('')
      load()
    } catch { toast.error('Failed to update') }
  }

  const updateStatus = async (goal: Goal, newStatus: string) => {
    try {
      await apiClient.patch(`/goals/${goal.id}`, { status: newStatus })
      toast.success(`Goal marked as ${newStatus}`)
      load()
    } catch { toast.error('Failed to update status') }
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    try {
      await apiClient.delete(`/goals/${id}`)
      toast.success('Goal deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const progress = (g: Goal) => {
    if (!g.target_value || !g.current_value) return null
    const pct = Math.min(100, Math.round((g.current_value / g.target_value) * 100))
    return pct
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fitness Goals</h1>
          <p className="text-sm text-gray-500 mt-1">Track member fitness goals and progress</p>
        </div>
        <button onClick={() => { setForm(empty); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="achieved">Achieved</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Target size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No goals found. Create one to start tracking progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map(g => {
            const pct = progress(g)
            return (
              <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{memberName(g.member_id)}</p>
                    <h3 className="font-semibold text-gray-900 mt-0.5">{g.title}</h3>
                    {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[g.status] || ''}`}>
                      {g.status}
                    </span>
                    <button onClick={() => deleteGoal(g.id)} className="text-red-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-gray-600">
                  <span className="capitalize bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {g.goal_type.replace('_', ' ')}
                  </span>
                  {g.deadline && (
                    <span className="text-xs text-gray-500">
                      Deadline: {new Date(g.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {g.target_value && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress: {g.current_value ?? 0} / {g.target_value} {g.target_unit}</span>
                      <span>{pct ?? 0}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {g.status === 'active' && (
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    {editingGoal?.id === g.id ? (
                      <>
                        <input type="number" value={progressValue} onChange={e => setProgressValue(e.target.value)}
                          placeholder={`Current ${g.target_unit || 'value'}`}
                          className="border rounded px-2 py-1 text-xs w-28" />
                        <button onClick={() => updateProgress(g)}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Save</button>
                        <button onClick={() => setEditingGoal(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingGoal(g); setProgressValue(String(g.current_value ?? '')) }}
                          className="text-xs border border-blue-200 text-blue-600 px-3 py-1 rounded hover:bg-blue-50">
                          Update Progress
                        </button>
                        <button onClick={() => updateStatus(g, 'achieved')}
                          className="text-xs border border-green-200 text-green-600 px-3 py-1 rounded hover:bg-green-50 flex items-center gap-1">
                          <Trophy size={11} /> Mark Achieved
                        </button>
                        <button onClick={() => updateStatus(g, 'abandoned')}
                          className="text-xs border border-gray-200 text-gray-500 px-3 py-1 rounded hover:bg-gray-50">
                          Abandon
                        </button>
                      </>
                    )}
                  </div>
                )}
                {g.status === 'achieved' && (
                  <div className="flex items-center gap-1 text-green-600 text-xs pt-1 border-t border-gray-100">
                    <CheckCircle size={13} /> Goal achieved!
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">New Fitness Goal</h2>

            <div>
              <label className="text-xs font-medium text-gray-600">Member *</label>
              <select value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">Select member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Goal Type</label>
              <select value={form.goal_type} onChange={e => setForm({ ...form, goal_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 text-sm capitalize">
                {GOAL_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Lose 5kg in 3 months" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Target Value</label>
                <input type="number" value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })}
                  placeholder="75" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Current Value</label>
                <input type="number" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })}
                  placeholder="85" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Unit</label>
                <input value={form.target_unit} onChange={e => setForm({ ...form, target_unit: e.target.value })}
                  placeholder="kg" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Goals
