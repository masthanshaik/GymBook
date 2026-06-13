import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, RefreshCw, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface RenewalItem {
  membership_id: string; member_id: string; member_name: string; member_email: string
  member_phone: string; plan_name: string; ended_date: string; days_left: number; final_price: number
}
interface RenewalsData { expiring_soon: RenewalItem[]; expired: RenewalItem[]; expiring_count: number; expired_count: number; total: number }

const Renewals = () => {
  const [data, setData] = useState<RenewalsData | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState<string | null>(null)

  const load = (windowDays: number) => {
    setLoading(true)
    apiClient.getRenewals(windowDays).then((res) => setData(res.data)).catch(() => toast.error('Could not load renewals')).finally(() => setLoading(false))
  }
  useEffect(() => { load(days) }, [days])

  const renew = async (id: string) => {
    setRenewing(id)
    try { await apiClient.renewMembership(id); toast.success('Membership renewed'); load(days) }
    catch (e: any) { toast.error(e.response?.data?.detail || 'Renew failed') } finally { setRenewing(null) }
  }

  const row = (item: RenewalItem, expired: boolean) => (
    <tr key={item.membership_id} className="border-b border-ink-50 hover:bg-ink-50">
      <td className="py-3 px-5"><div className="font-semibold text-ink-900">{item.member_name}</div><div className="text-ink-500 text-xs">{item.member_phone}</div></td>
      <td className="py-3 px-5 text-ink-700 hidden sm:table-cell">{item.plan_name}</td>
      <td className="py-3 px-5 text-ink-700">{new Date(item.ended_date).toLocaleDateString()}</td>
      <td className="py-3 px-5">
        {expired ? <span className="badge bg-red-100 text-red-700">Expired {Math.abs(item.days_left)}d ago</span>
          : <span className="badge bg-flame-100 text-flame-700">{item.days_left === 0 ? 'Today' : `${item.days_left}d left`}</span>}
      </td>
      <td className="py-3 px-5"><button onClick={() => renew(item.membership_id)} disabled={renewing === item.membership_id} className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50">{renewing === item.membership_id ? '...' : 'Renew'}</button></td>
    </tr>
  )

  const cards = [
    { label: 'Expiring Soon', value: data?.expiring_count ?? 0, icon: Clock, bg: 'bg-flame-500', ic: 'text-white' },
    { label: 'Expired', value: data?.expired_count ?? 0, icon: AlertTriangle, bg: 'bg-red-500', ic: 'text-white' },
    { label: 'Total Action Needed', value: data?.total ?? 0, icon: RefreshCw, bg: 'bg-ink-900', ic: 'text-energy-400' },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div><h1 className="text-2xl font-extrabold text-ink-900">Renewal Reminders</h1><p className="text-ink-500 text-sm">Members needing renewal</p></div>
        <select className="input sm:w-44" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Next 7 days</option><option value={14}>Next 14 days</option><option value={30}>Next 30 days</option>
        </select>
      </div>

      {loading ? <p className="text-ink-500">Loading...</p> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {cards.map((c) => (
              <div key={c.label} className="card p-5">
                <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-3`}><c.icon size={20} className={c.ic} /></div>
                <p className="text-3xl font-extrabold text-ink-900">{c.value}</p>
                <p className="text-ink-500 text-sm">{c.label}</p>
              </div>
            ))}
          </div>

          {data && data.expired.length > 0 && (
            <div className="card overflow-hidden mb-5">
              <h2 className="text-base font-bold text-red-700 px-5 py-3 border-b border-ink-100 flex items-center gap-2"><AlertTriangle size={18} /> Expired</h2>
              <table className="w-full"><thead><tr className="bg-ink-50 border-b border-ink-100">
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600">Member</th>
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600 hidden sm:table-cell">Plan</th>
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600">Ended</th>
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600">Status</th>
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600">Action</th>
              </tr></thead><tbody>{data.expired.map((i) => row(i, true))}</tbody></table>
            </div>
          )}

          <div className="card overflow-hidden">
            <h2 className="text-base font-bold text-ink-900 px-5 py-3 border-b border-ink-100 flex items-center gap-2"><Clock size={18} /> Expiring Soon</h2>
            {!data || data.expiring_soon.length === 0 ? (
              <div className="p-12 text-center"><Bell size={40} className="text-ink-300 mx-auto mb-3" /><p className="text-ink-500">No memberships expiring in this window.</p></div>
            ) : (
              <table className="w-full"><thead><tr className="bg-ink-50 border-b border-ink-100">
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600">Member</th>
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600 hidden sm:table-cell">Plan</th>
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600">Ends</th>
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600">Status</th>
                <th className="text-left py-3 px-5 text-sm font-semibold text-ink-600">Action</th>
              </tr></thead><tbody>{data.expiring_soon.map((i) => row(i, false))}</tbody></table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Renewals
