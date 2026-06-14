import { useEffect, useState } from 'react'
import { Plus, Trash2, Apple, Users, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Meal { id: string; meal_name: string; food_items: { name: string; quantity: string }[]; calories?: number; protein?: number; carbs?: number; fat?: number; timing?: string; notes?: string }
interface Plan { id: string; name: string; description?: string; goal_type?: string; daily_calories?: number; protein_grams?: number; carbs_grams?: number; fat_grams?: number; is_active: boolean; meals: Meal[] }
interface Assignment { id: string; member_id: string; plan_id: string; status: string; plan_name: string; member_name: string; trainer_name: string }
interface Member { id: string; first_name: string; last_name: string }
interface Trainer { id: string; name: string }

const GOALS = ['general', 'weight_loss', 'muscle_gain', 'endurance', 'maintenance']
const MEALS = ['Breakfast', 'Mid-Morning Snack', 'Lunch', 'Evening Snack', 'Dinner', 'Pre-Workout', 'Post-Workout']
const emptyPlan = { name: '', description: '', goal_type: 'general', daily_calories: '', protein_grams: '', carbs_grams: '', fat_grams: '' }
const emptyMeal = { meal_name: 'Breakfast', food_items_text: '', calories: '', protein: '', carbs: '', fat: '', timing: '', notes: '' }

export default function DietPlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [tab, setTab] = useState<'plans' | 'assignments'>('plans')
  const [loading, setLoading] = useState(true)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showMealModal, setShowMealModal] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [planForm, setPlanForm] = useState<any>(emptyPlan)
  const [mealForm, setMealForm] = useState<any>(emptyMeal)
  const [assignForm, setAssignForm] = useState({ member_id: '', plan_id: '', trainer_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      apiClient.getDietPlans(),
      apiClient.getDietAssignments(),
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
      const payload = { ...planForm }
      for (const f of ['daily_calories', 'protein_grams', 'carbs_grams', 'fat_grams']) {
        payload[f] = planForm[f] ? Number(planForm[f]) : null
      }
      await apiClient.createDietPlan(payload)
      toast.success('Diet plan created!')
      setShowPlanModal(false)
      setPlanForm(emptyPlan)
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this diet plan?')) return
    try { await apiClient.deleteDietPlan(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  const saveMeal = async (planId: string) => {
    if (!mealForm.meal_name.trim()) { toast.error('Meal name is required'); return }
    setSaving(true)
    try {
      const food_items = mealForm.food_items_text
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean)
        .map((l: string) => { const [name, quantity] = l.split('-').map((s: string) => s.trim()); return { name: name || l, quantity: quantity || '' } })
      await apiClient.addDietMeal(planId, {
        meal_name: mealForm.meal_name, food_items,
        calories: mealForm.calories ? Number(mealForm.calories) : null,
        protein: mealForm.protein ? Number(mealForm.protein) : null,
        carbs: mealForm.carbs ? Number(mealForm.carbs) : null,
        fat: mealForm.fat ? Number(mealForm.fat) : null,
        timing: mealForm.timing, notes: mealForm.notes,
      })
      toast.success('Meal added!')
      setShowMealModal(null)
      setMealForm(emptyMeal)
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const deleteMeal = async (planId: string, mealId: string) => {
    try { await apiClient.deleteDietMeal(planId, mealId); toast.success('Removed'); load() }
    catch { toast.error('Failed') }
  }

  const saveAssignment = async () => {
    if (!assignForm.member_id || !assignForm.plan_id) { toast.error('Select member and plan'); return }
    setSaving(true)
    try {
      await apiClient.assignDietPlan(assignForm)
      toast.success('Diet plan assigned!')
      setShowAssignModal(false)
      setAssignForm({ member_id: '', plan_id: '', trainer_id: '', notes: '' })
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    try { await apiClient.updateDietAssignment(id, { status }); toast.success('Updated'); load() }
    catch { toast.error('Failed') }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diet & Nutrition Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Create nutrition plans and assign to members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2 border border-green-300 text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 text-sm">
            <Users size={15} /> Assign Plan
          </button>
          <button onClick={() => setShowPlanModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
            <Plus size={15} /> New Plan
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(['plans', 'assignments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : tab === 'plans' ? (
        <div className="space-y-4">
          {plans.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Apple size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No diet plans yet. Create your first plan.</p>
            </div>
          ) : plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize">{plan.goal_type?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    {plan.daily_calories && <span>{plan.daily_calories} kcal/day</span>}
                    {plan.protein_grams && <span>P: {plan.protein_grams}g</span>}
                    {plan.carbs_grams && <span>C: {plan.carbs_grams}g</span>}
                    {plan.fat_grams && <span>F: {plan.fat_grams}g</span>}
                    <span>{plan.meals.length} meals</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowMealModal(plan.id)} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">+ Meal</button>
                  <button onClick={() => deletePlan(plan.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                  <button onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)} className="text-gray-400 p-1">
                    {expandedPlan === plan.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>
              {expandedPlan === plan.id && (
                <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-3">
                  {plan.meals.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No meals yet. Click "+ Meal" to add.</p>
                  ) : plan.meals.map(meal => (
                    <div key={meal.id} className="bg-white rounded-lg p-4 border border-gray-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm text-gray-800">{meal.meal_name}</span>
                            {meal.timing && <span className="text-xs text-gray-400">{meal.timing}</span>}
                          </div>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1">
                            {meal.calories && <span>{meal.calories} kcal</span>}
                            {meal.protein && <span>P:{meal.protein}g</span>}
                            {meal.carbs && <span>C:{meal.carbs}g</span>}
                            {meal.fat && <span>F:{meal.fat}g</span>}
                          </div>
                          {meal.food_items.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                              {meal.food_items.map((fi, i) => (
                                <li key={i} className="text-xs text-gray-600">• {fi.name}{fi.quantity ? ` — ${fi.quantity}` : ''}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button onClick={() => deleteMeal(plan.id, meal.id)} className="text-red-300 hover:text-red-500 ml-3"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Diet Plan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{a.member_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{a.plan_name}</td>
                    <td className="px-5 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{a.status}</span></td>
                    <td className="px-5 py-3">
                      {a.status === 'active' && (
                        <button onClick={() => updateStatus(a.id, 'completed')} className="text-xs text-green-600 hover:underline">Mark Complete</button>
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
            <h2 className="text-lg font-bold text-gray-900">New Diet Plan</h2>
            <div><label className="text-xs font-medium text-gray-600">Plan Name *</label>
              <input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" placeholder="e.g. High Protein Fat Loss" /></div>
            <div><label className="text-xs font-medium text-gray-600">Goal</label>
              <select value={planForm.goal_type} onChange={e => setPlanForm({ ...planForm, goal_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm capitalize">
                {GOALS.map(g => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-600">Daily Calories</label>
              <input type="number" value={planForm.daily_calories} onChange={e => setPlanForm({ ...planForm, daily_calories: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" placeholder="2000" /></div>
            <div className="grid grid-cols-3 gap-2">
              {['protein_grams', 'carbs_grams', 'fat_grams'].map(f => (
                <div key={f}><label className="text-xs font-medium text-gray-600 capitalize">{f.replace('_grams', '')} (g)</label>
                  <input type="number" value={planForm[f]} onChange={e => setPlanForm({ ...planForm, [f]: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPlanModal(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={savePlan} disabled={saving} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm hover:bg-green-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Meal Modal */}
      {showMealModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">Add Meal</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600">Meal Name *</label>
                <select value={mealForm.meal_name} onChange={e => setMealForm({ ...mealForm, meal_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                  {MEALS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-600">Timing</label>
                <input value={mealForm.timing} onChange={e => setMealForm({ ...mealForm, timing: e.target.value })} placeholder="7:00 AM" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
            </div>
            <div><label className="text-xs font-medium text-gray-600">Food Items (one per line, e.g. "Oats - 100g")</label>
              <textarea value={mealForm.food_items_text} onChange={e => setMealForm({ ...mealForm, food_items_text: e.target.value })}
                rows={4} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm resize-none font-mono" placeholder={"Oats - 100g\nMilk - 200ml\nBanana - 1 piece"} /></div>
            <div className="grid grid-cols-4 gap-2">
              {['calories', 'protein', 'carbs', 'fat'].map(f => (
                <div key={f}><label className="text-xs font-medium text-gray-600 capitalize">{f}{f === 'calories' ? ' (kcal)' : ' (g)'}</label>
                  <input type="number" value={mealForm[f]} onChange={e => setMealForm({ ...mealForm, [f]: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" /></div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowMealModal(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => saveMeal(showMealModal)} disabled={saving} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm hover:bg-green-700 disabled:opacity-50">{saving ? 'Saving...' : 'Add Meal'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Assign Diet Plan</h2>
            <div><label className="text-xs font-medium text-gray-600">Member *</label>
              <select value={assignForm.member_id} onChange={e => setAssignForm({ ...assignForm, member_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">Select member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-600">Diet Plan *</label>
              <select value={assignForm.plan_id} onChange={e => setAssignForm({ ...assignForm, plan_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">Select plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-600">Trainer (optional)</label>
              <select value={assignForm.trainer_id} onChange={e => setAssignForm({ ...assignForm, trainer_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">No trainer</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAssignModal(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveAssignment} disabled={saving} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm hover:bg-green-700 disabled:opacity-50">{saving ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
