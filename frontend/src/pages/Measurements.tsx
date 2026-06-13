import { useEffect, useState } from 'react'
import { Plus, Trash2, Activity, Search } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Member { id: string; first_name: string; last_name?: string; phone: string }
interface Measurement {
  id: string; member_id: string; recorded_date: string
  weight_kg?: number; height_cm?: number; bmi?: number; body_fat_pct?: number; muscle_mass_kg?: number
  chest_cm?: number; waist_cm?: number; hips_cm?: number
  left_arm_cm?: number; right_arm_cm?: number; left_thigh_cm?: number; right_thigh_cm?: number
  notes?: string
}

const emptyForm = {
  recorded_date: new Date().toISOString().split('T')[0],
  weight_kg: '', height_cm: '', body_fat_pct: '', muscle_mass_kg: '',
  chest_cm: '', waist_cm: '', hips_cm: '',
  left_arm_cm: '', right_arm_cm: '', left_thigh_cm: '', right_thigh_cm: '',
  notes: '',
}

const Measurements = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loadingM, setLoadingM] = useState(false)

  useEffect(() => {
    apiClient.getMembers(1, 100).then(r => setMembers(r.data.items || []))
  }, [])

  const filtered = members.filter(m =>
    `${m.first_name} ${m.last_name || ''} ${m.phone}`.toLowerCase().includes(search.toLowerCase())
  )

  const selectMember = (m: Member) => {
    setSelectedMember(m)
    setLoadingM(true)
    apiClient.getMemberMeasurements(m.id)
      .then(r => setMeasurements(r.data))
      .catch(() => toast.error('Failed to load measurements'))
      .finally(() => setLoadingM(false))
  }

  const save = async () => {
    if (!selectedMember) return
    setSaving(true)
    try {
      const payload: any = { ...form }
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
      if (payload.recorded_date) payload.recorded_date = new Date(payload.recorded_date).toISOString()
      await apiClient.addMeasurement(selectedMember.id, payload)
      toast.success('Measurement recorded')
      setShowModal(false)
      setForm(emptyForm)
      selectMember(selectedMember)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this measurement?')) return
    try {
      await apiClient.deleteMeasurement(id)
      toast.success('Deleted')
      if (selectedMember) selectMember(selectedMember)
    } catch { toast.error('Failed to delete') }
  }

  const chartData = [...measurements].reverse().map(m => ({
    date: new Date(m.recorded_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    weight: m.weight_kg,
    bmi: m.bmi,
    waist: m.waist_cm,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Body Measurements</h1>
        <p className="text-ink-500 text-sm">Track member progress over time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member list */}
        <div className="card p-4">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9 w-full text-sm" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
            {filtered.map(m => (
              <button
                key={m.id}
                onClick={() => selectMember(m)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition text-sm font-medium ${
                  selectedMember?.id === m.id ? 'bg-energy-500 text-ink-950' : 'hover:bg-ink-50 text-ink-700'
                }`}
              >
                <span>{m.first_name} {m.last_name || ''}</span>
                <span className="block text-xs opacity-70">{m.phone}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-ink-400 text-sm text-center py-4">No members found</p>}
          </div>
        </div>

        {/* Measurement content */}
        <div className="lg:col-span-2 space-y-5">
          {!selectedMember ? (
            <div className="card p-10 text-center">
              <Activity size={40} className="mx-auto text-ink-300 mb-3" />
              <p className="text-ink-500">Select a member to view or add measurements</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-ink-900 text-lg">{selectedMember.first_name} {selectedMember.last_name || ''}</h2>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
                  <Plus size={15} /> Record Measurement
                </button>
              </div>

              {/* Charts */}
              {chartData.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-4">
                    <h3 className="text-sm font-bold text-ink-700 mb-3">Weight (kg)</h3>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" fontSize={10} stroke="#94a3b8" />
                        <YAxis fontSize={10} stroke="#94a3b8" />
                        <Tooltip />
                        <Line type="monotone" dataKey="weight" stroke="#84cc16" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card p-4">
                    <h3 className="text-sm font-bold text-ink-700 mb-3">Waist (cm)</h3>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" fontSize={10} stroke="#94a3b8" />
                        <YAxis fontSize={10} stroke="#94a3b8" />
                        <Tooltip />
                        <Line type="monotone" dataKey="waist" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Records table */}
              {loadingM ? (
                <p className="text-ink-500 text-sm">Loading...</p>
              ) : measurements.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-ink-400 text-sm">No measurements recorded yet</p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-ink-50 border-b border-ink-200">
                      <tr>
                        {['Date', 'Weight', 'BMI', 'Body Fat%', 'Waist', 'Chest', ''].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-ink-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {measurements.map(m => (
                        <tr key={m.id} className="hover:bg-ink-50">
                          <td className="px-3 py-2 font-medium text-ink-900">{new Date(m.recorded_date).toLocaleDateString('en-IN')}</td>
                          <td className="px-3 py-2 text-ink-600">{m.weight_kg ? `${m.weight_kg} kg` : '—'}</td>
                          <td className="px-3 py-2 text-ink-600">{m.bmi ?? '—'}</td>
                          <td className="px-3 py-2 text-ink-600">{m.body_fat_pct ? `${m.body_fat_pct}%` : '—'}</td>
                          <td className="px-3 py-2 text-ink-600">{m.waist_cm ? `${m.waist_cm} cm` : '—'}</td>
                          <td className="px-3 py-2 text-ink-600">{m.chest_cm ? `${m.chest_cm} cm` : '—'}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => remove(m.id)} className="text-ink-300 hover:text-red-500 transition">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-ink-900 mb-4">Record Measurement</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Date</label>
                <input type="date" className="input w-full text-sm" value={form.recorded_date}
                  onChange={e => setForm(p => ({ ...p, recorded_date: e.target.value }))} />
              </div>
              {[
                ['weight_kg', 'Weight (kg)'], ['height_cm', 'Height (cm)'],
                ['body_fat_pct', 'Body Fat %'], ['muscle_mass_kg', 'Muscle Mass (kg)'],
                ['chest_cm', 'Chest (cm)'], ['waist_cm', 'Waist (cm)'],
                ['hips_cm', 'Hips (cm)'], ['left_arm_cm', 'Left Arm (cm)'],
                ['right_arm_cm', 'Right Arm (cm)'], ['left_thigh_cm', 'Left Thigh (cm)'],
                ['right_thigh_cm', 'Right Thigh (cm)'],
              ].map(([f, label]) => (
                <div key={f}>
                  <label className="block text-xs font-medium text-ink-600 mb-1">{label}</label>
                  <input type="number" step="0.1" className="input w-full text-sm" value={(form as any)[f]}
                    onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-ink-600 mb-1">Notes</label>
                <textarea className="input w-full text-sm" rows={2} value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
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

export default Measurements
