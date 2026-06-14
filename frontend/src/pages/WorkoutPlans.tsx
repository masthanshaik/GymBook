import { useEffect, useState } from 'react'
import { Plus, Trash2, Dumbbell, ChevronDown, ChevronUp, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Exercise { id: string; day_number: number; exercise_name: string; sets?: number; reps?: string; duration_seconds?: number; rest_seconds?: number; notes?: string }
interface Plan { id: string; name: string; description?: string; goal_type?: string; level: string; duration_weeks: number; sessions_per_week: number; is_active: boolean; exercises: Exercise[] }
interface Assignment { id: string; member_id: string; plan_id: string; trainer_id?: string; status: string; notes?: string; plan_name: string; member_name: string; trainer_name: string }
interface Member { id: string; first_name: string; last_name: string }
interface Trainer { id: string; name: string; role: string }

const GOALS = ['general', 'weight_loss', 'muscle_gain', 'endurance', 'flexibility']
const LEVELS = ['beginner', 'intermediate', 'advanced']
const emptyPlan = { name: '', description: '', goal_type: 'general', level: 'beginner', duration_weeks: '4', sessions_per_week: '3' }
const emptyEx = { day_number: '1', exercise_name: '', sets: '', reps: '', rest_seconds: '60', notes: '' }

export default function WorkoutPlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [tab, setTab] = useState<'plans' | 'assignments'>('plans')
  const [loading, setLoading] = useState(true)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showExModal, setShowExModal] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [planForm, setPlanForm] = useState<any>(emptyPlan)
  const [exForm, setExForm] = useState<any>(emptyEx)
  const [assignForm, setAssignForm] = useState({ member_id: '', plan_id: '', trainer_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      apiClient.getWorkoutPlans(),
      apiClient.getWorkoutAssignments(),
      apiClient.getMembers(1, 200),
      apiClient.getTrainers(),
    ]).then(([p, a, m, t]) => {
      setPlans(p.data)
      setAssignments(a.data)
      setMembers(m.data.items || [])
      setTrainers(t.data)
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const savePlan = async () => {
    if (!planForm.name.trim()) { toast.error('Plan name is required'); return }
    setSaving(true)
    try {
      await apiClient.createWorkoutPlan({ ...planForm, duration_weeks: Number(planForm.duration_weeks), sessions_per_week: Number(planForm.sessions_per_week) })
      toast.success('Plan created!')
      setShowPlanModal(false)
      setPlanForm(emptyPlan)
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return
    try { await apiClient.deleteWorkoutPlan(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  const saveExercise = async (planId: string) => {
    if (!exForm.exercise_name.trim()) { toast.error('Exercise name is required'); return }
    setSaving(true)
    try {
      await apiClient.addWorkoutExercise(planId, { ...exForm, day_number: Number(exForm.day_number), sets: exForm.sets ? Number(exForm.sets) : null, rest_seconds: Number(exForm.rest_seconds) || 60 })
      toast.success('Exercise added!')
      setShowExModal(null)
      setExForm(emptyEx)
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const deleteExercise = async (planId: string, exId: string) => {
    try { await apiClient.deleteWorkoutExercise(planId, exId); toast.success('Removed'); load() }
    catch { toast.error('Failed') }
  }

  const saveAssignment = async () => {
    if (!assignForm.member_id || !assignForm.plan_id) { toast.error('Select member and plan'); return }
    setSaving(true)
    try {
      await apiClient.assignWorkoutPlan(assignForm)
      toast.success('Plan assigned!')
      setShowAssignModal(false)
      setAssignForm({ member_id: '', plan_id: '', trainer_id: '', notes: '' })
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const updateAssignmentStatus = async (id: string, status: string) => {
    try { await apiClient.updateWorkoutAssignment(id, { status }); toast.success('Updated'); load() }
    catch { toast.error('Failed') }
  }

  const groupByDay = (exercises: Exercise[]) => {
    const map: Record<number, Exercise[]> = {}
    exercises.forEach(e => { if (!map[e.day_number]) map[e.day_number] = []; map[e.day_number].push(e) })
    return map
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workout Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Create training programs and assign to members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowAssignModal(true) }} className="flex items-center gap-2 border border-blue-300 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm">
            <Users size={15} /> Assign Plan
          </button>
          <button onClick={() => setShowPlanModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            <Plus size={15} /> New Plan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['plans', 'assignments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : tab === 'plans' ? (
        <div className="space-y-4">
          {plans.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Dumbbell size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No workout plans yet. Create your first plan.</p>
            </div>
          ) : plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{plan.level}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{plan.goal_type?.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{plan.duration_weeks} weeks · {plan.sessions_per_week}x/week · {plan.exercises.length} exercises</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowExModal(plan.id)} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">+ Exercise</button>
                  <button onClick={() => deletePlan(plan.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                  <button onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)} className="text-gray-400 hover:text-gray-600 p-1">
                    {expandedPlan === plan.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {expandedPlan === plan.id && (
                <div className="border-t border-gray-100 p-5 bg-gray-50">
                  {plan.exercises.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No exercises yet. Click "+ Exercise" to add some.</p>
                  ) : (
                    Object.entries(groupByDay(plan.exercises)).map(([day, exs]) => (
                      <div key={day} className="mb-4">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Day {day}</p>
                        <div className="space-y-2">
                          {exs.map(ex => (
                            <div key={ex.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                              <div>
                                <span className="font-medium text-sm text-gray-800">{ex.exercise_name}</span>
                                <span className="text-xs text-gray-500 ml-3">
                                  {ex.sets && `${ex.sets} sets`}{ex.reps && ` × ${ex.reps}`}{ex.rest_seconds && ` · ${ex.rest_seconds}s rest`}
                                </span>
                              </div>
                              <button onClick={() => deleteExercise(plan.id, ex.id)} className="text-red-300 hover:text-red-500"><Trash2 size={13} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No assignments yet.</div>
          ) : (
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Member</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Trainer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{a.member_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{a.plan_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{a.trainer_name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.status === 'active' ? 'bg-green-100 text-green-700' : a.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      {a.status === 'active' && (
                        <div className="flex gap-2">
                          <button onClick={() => updateAssignmentStatus(a.id, 'completed')} className="text-xs text-blue-600 hover:underline">Complete</button>
                          <button onClick={() => updateAssignmentStatus(a.id, 'paused')} className="text-xs text-gray-500 hover:underline">Pause</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* New Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">New Workout Plan</h2>
            <div><label className="text-xs font-medium text-gray-600">Plan Name *</label>
              <input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" placeholder="e.g. 4-Week Fat Loss Program" /></div>
            <div><label className="text-xs font-medium text-gray-600">Description</label>
              <textarea value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm resize-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600">Goal</label>
                <select value={planForm.goal_type} onChange={e => setPlanForm({ ...planForm, goal_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm capitalize">
                  {GOALS.map(g => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-600">Level</label>
                <select value={planForm.level} onChange={e => setPlanForm({ ...planForm, level: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm capitalize">
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600">Duration (weeks)</label>
                <input type="number" value={planForm.duration_weeks} onChange={e => setPlanForm({ ...planForm, duration_weeks: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-600">Sessions/week</label>
                <input type="number" value={planForm.sessions_per_week} onChange={e => setPlanForm({ ...planForm, sessions_per_week: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPlanModal(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={savePlan} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showExModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Add Exercise</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600">Day *</label>
                <input type="number" min={1} max={7} value={exForm.day_number} onChange={e => setExForm({ ...exForm, day_number: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-600">Exercise Name *</label>
                <input value={exForm.exercise_name} onChange={e => setExForm({ ...exForm, exercise_name: e.target.value })} placeholder="e.g. Bench Press" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-medium text-gray-600">Sets</label>
                <input type="number" value={exForm.sets} onChange={e => setExForm({ ...exForm, sets: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-600">Reps</label>
                <input value={exForm.reps} onChange={e => setExForm({ ...exForm, reps: e.target.value })} placeholder="10–12" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-600">Rest (sec)</label>
                <input type="number" value={exForm.rest_seconds} onChange={e => setExForm({ ...exForm, rest_seconds: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
            </div>
            <div><label className="text-xs font-medium text-gray-600">Notes</label>
              <input value={exForm.notes} onChange={e => setExForm({ ...exForm, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowExModal(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => saveExercise(showExModal)} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Add Exercise'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Assign Workout Plan</h2>
            <div><label className="text-xs font-medium text-gray-600">Member *</label>
              <select value={assignForm.member_id} onChange={e => setAssignForm({ ...assignForm, member_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">Select member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-600">Plan *</label>
              <select value={assignForm.plan_id} onChange={e => setAssignForm({ ...assignForm, plan_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">Select plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-600">Trainer (optional)</label>
              <select value={assignForm.trainer_id} onChange={e => setAssignForm({ ...assignForm, trainer_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">No trainer</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm resize-none" /></div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAssignModal(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveAssignment} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
