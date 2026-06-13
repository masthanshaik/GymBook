import { useEffect, useState } from 'react'
import { Plus, X, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface GymClass { id: string; name: string; class_type?: string; capacity: number; current_enrollment: number; level?: string }
interface Member { id: string; first_name: string; last_name?: string }

const emptyClass = { name: '', class_type: 'yoga', capacity: 20, level: 'beginner' }

const Classes = () => {
  const [classes, setClasses] = useState<GymClass[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showClass, setShowClass] = useState(false)
  const [showEnroll, setShowEnroll] = useState<string | null>(null)
  const [form, setForm] = useState(emptyClass)
  const [enrollMemberId, setEnrollMemberId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([apiClient.getClasses(), apiClient.getMembers(1, 100)])
      .then(([c, m]) => { setClasses(c.data.items); setMembers(m.data.items) })
      .catch(() => toast.error('Could not load classes')).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const saveClass = async () => {
    if (!form.name || form.capacity <= 0) { toast.error('Name and capacity required'); return }
    setSaving(true)
    try { await apiClient.createClass(form); toast.success('Class created'); setShowClass(false); setForm(emptyClass); load() }
    catch (e: any) { toast.error(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const enroll = async () => {
    if (!enrollMemberId || !showEnroll) { toast.error('Select a member'); return }
    setSaving(true)
    try { await apiClient.enrollMember(showEnroll, enrollMemberId); toast.success('Member enrolled'); setShowEnroll(null); setEnrollMemberId(''); load() }
    catch (e: any) { toast.error(e.response?.data?.detail || 'Enrollment failed') } finally { setSaving(false) }
  }

  const fillPct = (c: GymClass) => Math.min(100, Math.round((c.current_enrollment / c.capacity) * 100))

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Classes</h1>
          <p className="text-ink-500 text-sm">{classes.length} classes running</p>
        </div>
        <button onClick={() => setShowClass(true)} className="btn-primary flex items-center justify-center gap-2"><Plus size={18} /> New Class</button>
      </div>

      {loading ? <p className="text-ink-500">Loading...</p> : classes.length === 0 ? (
        <div className="card p-12 text-center"><CalendarDays size={40} className="text-ink-300 mx-auto mb-3" /><p className="text-ink-500">No classes yet. Create one to get started.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((c) => (
            <div key={c.id} className="card p-6 hover:shadow-card-hover transition">
              <div className="flex justify-between items-start mb-3">
                <div className="w-11 h-11 rounded-xl bg-ink-900 flex items-center justify-center"><CalendarDays size={20} className="text-energy-400" /></div>
                <span className="badge bg-flame-100 text-flame-700 capitalize">{c.class_type}</span>
              </div>
              <h3 className="text-lg font-bold text-ink-900">{c.name}</h3>
              <p className="text-ink-500 text-sm mb-3 capitalize">Level: {c.level}</p>
              <div className="mb-2 flex justify-between text-sm"><span className="text-ink-600">{c.current_enrollment} / {c.capacity} enrolled</span><span className="text-ink-400">{fillPct(c)}%</span></div>
              <div className="h-2 bg-ink-100 rounded-full mb-4 overflow-hidden"><div className="h-full bg-energy-500 rounded-full" style={{ width: `${fillPct(c)}%` }} /></div>
              <button onClick={() => setShowEnroll(c.id)} className="btn-primary w-full text-sm">Enroll Member</button>
            </div>
          ))}
        </div>
      )}

      {showClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5"><h2 className="text-xl font-bold text-ink-900">New Class</h2><button onClick={() => setShowClass(false)} className="text-ink-400 hover:text-ink-700"><X size={22} /></button></div>
            <div className="space-y-3">
              <input className="input" placeholder="Class name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select className="input" value={form.class_type} onChange={(e) => setForm({ ...form, class_type: e.target.value })}>
                <option value="yoga">Yoga</option><option value="crossfit">CrossFit</option><option value="zumba">Zumba</option><option value="strength">Strength</option><option value="cardio">Cardio</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className="input" placeholder="Capacity *" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
                <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                  <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <button onClick={saveClass} disabled={saving} className="btn-primary w-full mt-5 disabled:opacity-50">{saving ? 'Saving...' : 'Create Class'}</button>
          </div>
        </div>
      )}

      {showEnroll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5"><h2 className="text-xl font-bold text-ink-900">Enroll Member</h2><button onClick={() => setShowEnroll(null)} className="text-ink-400 hover:text-ink-700"><X size={22} /></button></div>
            <select className="input" value={enrollMemberId} onChange={(e) => setEnrollMemberId(e.target.value)}>
              <option value="">Select member...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
            <button onClick={enroll} disabled={saving} className="btn-primary w-full mt-5 disabled:opacity-50">{saving ? 'Enrolling...' : 'Enroll'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Classes
