import { useEffect, useState } from 'react'
import { BarChart3, Users, DollarSign, TrendingUp, Bell, ArrowRight } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { apiClient } from '@services/api'

interface Summary {
  total_members: number; active_members: number; monthly_revenue: number
  renewals_this_month: number; todays_checkins: number; renewals_due: number
}
interface Charts {
  revenue_trend: { month: string; revenue: number }[]
  member_growth: { month: string; members: number }[]
}

const Dashboard = () => {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [charts, setCharts] = useState<Charts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiClient.getDashboardSummary(), apiClient.getChartsData()])
      .then(([s, c]) => { setSummary(s.data); setCharts(c.data) })
      .catch(() => setError('Could not load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Total Members', value: summary?.total_members ?? 0, icon: Users, bg: 'bg-ink-900', ic: 'text-energy-400' },
    { label: 'Monthly Revenue', value: `₹${(summary?.monthly_revenue ?? 0).toLocaleString('en-IN')}`, icon: DollarSign, bg: 'bg-energy-500', ic: 'text-ink-950' },
    { label: 'Renewals This Month', value: summary?.renewals_this_month ?? 0, icon: TrendingUp, bg: 'bg-flame-500', ic: 'text-white' },
    { label: "Today's Check-ins", value: summary?.todays_checkins ?? 0, icon: BarChart3, bg: 'bg-ink-700', ic: 'text-energy-400' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Dashboard</h1>
        <p className="text-ink-500 text-sm">Welcome back — here's your gym at a glance</p>
      </div>

      {loading && <p className="text-ink-500">Loading...</p>}
      {error && <p className="text-flame-600">{error}</p>}

      {!loading && !error && (
        <>
          {summary && summary.renewals_due > 0 && (
            <a href="/renewals" className="block mb-6">
              <div className="bg-ink-900 rounded-2xl p-4 flex items-center justify-between hover:bg-ink-800 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-flame-500/20 flex items-center justify-center">
                    <Bell size={20} className="text-flame-400" />
                  </div>
                  <span className="text-white font-medium text-sm sm:text-base">
                    {summary.renewals_due} membership{summary.renewals_due > 1 ? 's' : ''} need attention
                  </span>
                </div>
                <ArrowRight size={20} className="text-energy-400 group-hover:translate-x-1 transition" />
              </div>
            </a>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat) => (
              <div key={stat.label} className="card p-5">
                <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon size={20} className={stat.ic} />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-ink-900">{stat.value}</p>
                <p className="text-ink-500 text-xs sm:text-sm mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <div className="card p-6">
              <h2 className="text-base font-bold text-ink-900 mb-4">Revenue Trend</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={charts?.revenue_trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
                  <YAxis fontSize={12} stroke="#94a3b8" />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#84cc16" strokeWidth={3} dot={{ r: 4, fill: '#84cc16' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-6">
              <h2 className="text-base font-bold text-ink-900 mb-4">New Members</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={charts?.member_growth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
                  <YAxis fontSize={12} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="members" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-6 bg-ink-900 text-white">
              <h2 className="text-base font-bold mb-1">Active Members</h2>
              <p className="text-5xl font-extrabold text-energy-400">{summary?.active_members ?? 0}</p>
              <p className="text-ink-400 text-sm mt-1">Currently active memberships</p>
            </div>
            <div className="card p-6">
              <h2 className="text-base font-bold text-ink-900 mb-3">Quick Actions</h2>
              <div className="flex flex-col gap-2">
                <a href="/members" className="flex items-center justify-between px-4 py-2.5 bg-ink-50 rounded-xl hover:bg-ink-100 transition text-ink-800 font-medium text-sm">Manage Members <ArrowRight size={16} /></a>
                <a href="/memberships" className="flex items-center justify-between px-4 py-2.5 bg-ink-50 rounded-xl hover:bg-ink-100 transition text-ink-800 font-medium text-sm">Membership Plans <ArrowRight size={16} /></a>
                <a href="/payments" className="flex items-center justify-between px-4 py-2.5 bg-ink-50 rounded-xl hover:bg-ink-100 transition text-ink-800 font-medium text-sm">Record Payment <ArrowRight size={16} /></a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
