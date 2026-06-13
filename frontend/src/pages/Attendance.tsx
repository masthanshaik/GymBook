import { useEffect, useState } from 'react'
import { LogIn, LogOut, ClipboardCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Member { id: string; first_name: string; last_name?: string }

const Attendance = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<{ total_check_ins_30d: number; today_check_ins: number; average_daily: number } | null>(null)

  const loadReport = () => { apiClient.getAttendanceReport().then((res) => setReport(res.data)).catch(() => {}) }

  useEffect(() => {
    apiClient.getMembers(1, 100).then((res) => setMembers(res.data.items))
      .catch(() => toast.error('Could not load members')).finally(() => setLoading(false))
    loadReport()
  }, [])

  const checkIn = async () => {
    if (!selected) { toast.error('Select a member'); return }
    setBusy(true)
    try { await apiClient.checkIn({ member_id: selected, check_in_method: 'manual' }); toast.success('Checked in'); loadReport() }
    catch (e: any) { toast.error(e.response?.data?.detail || 'Check-in failed') } finally { setBusy(false) }
  }
  const checkOut = async () => {
    if (!selected) { toast.error('Select a member'); return }
    setBusy(true)
    try { await apiClient.checkOut({ member_id: selected }); toast.success('Checked out'); loadReport() }
    catch (e: any) { toast.error(e.response?.data?.detail || 'Check-out failed') } finally { setBusy(false) }
  }

  const stats = [
    { label: "Today's Check-ins", value: report?.today_check_ins ?? 0, bg: 'bg-energy-500', ic: 'text-ink-950' },
    { label: 'Last 30 Days', value: report?.total_check_ins_30d ?? 0, bg: 'bg-ink-900', ic: 'text-energy-400' },
    { label: 'Daily Average', value: report?.average_daily ?? 0, bg: 'bg-flame-500', ic: 'text-white' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Attendance</h1>
        <p className="text-ink-500 text-sm">Check members in and out</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><ClipboardCheck size={20} className={s.ic} /></div>
            <p className="text-3xl font-extrabold text-ink-900">{s.value}</p>
            <p className="text-ink-500 text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6 max-w-lg">
        <h2 className="text-base font-bold text-ink-900 mb-4">Check In / Out</h2>
        <select className="input mb-4" value={selected} onChange={(e) => setSelected(e.target.value)} disabled={loading}>
          <option value="">Select member...</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={checkIn} disabled={busy} className="flex-1 bg-energy-500 hover:bg-energy-400 text-ink-950 py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"><LogIn size={18} /> Check In</button>
          <button onClick={checkOut} disabled={busy} className="flex-1 bg-ink-900 hover:bg-ink-800 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"><LogOut size={18} /> Check Out</button>
        </div>
      </div>
    </div>
  )
}

export default Attendance
