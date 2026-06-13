import { useEffect, useState } from 'react'
import { Plus, X, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Plan {
  id: string
  name: string
  description?: string
  duration_months: number
  price: number
  is_active: boolean
}
interface Member { id: string; first_name: string; last_name?: string }

const emptyPlan = { name: '', description: '', duration_months: 1, price: 0 }

const addMonths = (date: Date, months: number) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}
const toInputDate = (d: Date) => d.toISOString().slice(0, 10)

const Memberships = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showPlan, setShowPlan] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [planForm, setPlanForm] = useState(emptyPlan)
  const [assign, setAssign] = useState({ member_id: '', plan_id: '', discount_applied: 0, started_date: '', ended_date: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([apiClient.getMembershipPlans(), apiClient.getMembers(1, 100)])
      .then(([p, m]) => { setPlans(p.data.items); setMembers(m.data.items) })
      .catch(() => toast.error('Could not load data'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const savePlan = async () => {
    if (!planForm.name || planForm.price <= 0) { toast.error('Name and valid price required'); return }
    setSaving(true)
    try {
      await apiClient.createMembershipPlan(planForm)
      toast.success('Plan created'); setShowPlan(false); setPlanForm(emptyPlan); load()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const openAssign = (planId: string) => {
    const plan = plans.find((p) => p.id === planId)
    const start = new Date()
    const end = plan ? addMonths(start, plan.duration_months) : start
    setAssign({ member_id: '', plan_id: planId, discount_applied: 0, started_date: toInputDate(start), ended_date: toInputDate(end) })
    setShowAssign(true)
  }

  // recalc end date when start date changes, based on plan duration
  const onStartChange = (val: string) => {
    const plan = plans.find((p) => p.id === assign.plan_id)
    const start = new Date(val)
    const end = plan ? addMonths(start, plan.duration_months) : start
    setAssign({ ...assign, started_date: val, ended_date: toInputDate(end) })
  }

  const doAssign = async () => {
    const plan = plans.find((p) => p.id === assign.plan_id)
    if (!assign.member_id || !plan) { toast.error('Select a member'); return }
    setSaving(true)
    try {
      await apiClient.assignMembership({
        member_id: assign.member_id,
        plan_id: assign.plan_id,
        original_price: plan.price,
        discount_applied: Number(assign.discount_applied) || 0,
        started_date: assign.started_date ? new Date(assign.started_date).toISOString() : undefined,
        ended_date: assign.ended_date ? new Date(assign.ended_date).toISOString() : undefined,
      })
      toast.success('Membership assigned'); setShowAssign(false)
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Assign failed') }
    finally { setSaving(false) }
  }

  const deactivate = async (planId: string) => {
    if (!confirm('Deactivate this plan?')) return
    try { await apiClient.deactivateMembershipPlan(planId); toast.success('Plan deactivated'); load() }
    catch (e: any) { toast.error(e.response?.data?.detail || 'Failed') }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Membership Plans</h1>
          <p className="text-ink-500 text-sm">{plans.filter(p => p.is_active).length} active plans</p>
        </div>
        <button onClick={() => setShowPlan(true)} className="btn-primary flex items-center justify-center gap-2">
          <Plus size={18} /> New Plan
        </button>
      </div>

      {loading ? <p className="text-ink-500">Loading...</p> : plans.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={40} className="text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">No plans yet. Create your first membership plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div key={p.id} className={`card p-6 ${!p.is_active ? 'opacity-60' : 'hover:shadow-card-hover transition'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="w-11 h-11 rounded-xl bg-ink-900 flex items-center justify-center">
                  <Package size={20} className="text-energy-400" />
                </div>
                {!p.is_active && <span className="badge bg-ink-100 text-ink-500">Inactive</span>}
              </div>
              <h3 className="text-lg font-bold text-ink-900">{p.name}</h3>
              <p className="text-ink-500 text-sm mb-3">{p.description || `${p.duration_months}-month plan`}</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-ink-900">₹{p.price.toLocaleString('en-IN')}</span>
                <span className="text-ink-400 text-sm">/ {p.duration_months}mo</span>
              </div>
              {p.is_active && (
                <div className="flex gap-2">
                  <button onClick={() => openAssign(p.id)} className="flex-1 btn-primary text-sm">Assign</button>
                  <button onClick={() => deactivate(p.id)} className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium text-sm">Remove</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Plan modal */}
      {showPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-ink-900">New Plan</h2>
              <button onClick={() => setShowPlan(false)} className="text-ink-400 hover:text-ink-700"><X size={22} /></button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Plan name *" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
              <input className="input" placeholder="Description" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-500 font-medium">Duration (months)</label>
                  <input type="number" className="input mt-1" value={planForm.duration_months} onChange={(e) => setPlanForm({ ...planForm, duration_months: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-ink-500 font-medium">Price (₹)</label>
                  <input type="number" className="input mt-1" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <button onClick={savePlan} disabled={saving} className="btn-primary w-full mt-5 disabled:opacity-50">{saving ? 'Saving...' : 'Create Plan'}</button>
          </div>
        </div>
      )}

      {/* Assign modal with dates */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-ink-900">Assign Membership</h2>
              <button onClick={() => setShowAssign(false)} className="text-ink-400 hover:text-ink-700"><X size={22} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink-500 font-medium">Member</label>
                <select className="input mt-1" value={assign.member_id} onChange={(e) => setAssign({ ...assign, member_id: e.target.value })}>
                  <option value="">Select member...</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-500 font-medium">Start Date</label>
                  <input type="date" className="input mt-1" value={assign.started_date} onChange={(e) => onStartChange(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-ink-500 font-medium">End Date</label>
                  <input type="date" className="input mt-1" value={assign.ended_date} onChange={(e) => setAssign({ ...assign, ended_date: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-ink-400">End date auto-fills from the plan duration but you can adjust it.</p>
              <div>
                <label className="text-xs text-ink-500 font-medium">Discount (₹, optional)</label>
                <input type="number" className="input mt-1" placeholder="0" value={assign.discount_applied} onChange={(e) => setAssign({ ...assign, discount_applied: Number(e.target.value) })} />
              </div>
            </div>
            <button onClick={doAssign} disabled={saving} className="btn-primary w-full mt-5 disabled:opacity-50">{saving ? 'Assigning...' : 'Assign Membership'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Memberships
