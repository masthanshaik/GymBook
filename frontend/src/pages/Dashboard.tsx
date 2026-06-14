import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, DollarSign, TrendingUp, Activity, ArrowRight,
  Bell, Cake, Zap, CheckCircle,
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import { apiClient } from '@services/api'

interface Summary {
  total_members: number
  active_members: number
  monthly_revenue: number
  renewals_this_month: number
  todays_checkins: number
  renewals_due: number
}
interface Charts {
  revenue_trend: { month: string; revenue: number }[]
  member_growth: { month: string; members: number }[]
}
interface Birthday {
  id: string
  first_name: string
  last_name: string
  photo?: string
  days_until: number
}

const StatCard = ({
  label, value, icon: Icon, gradient, delay,
}: { label: string; value: string | number; icon: any; gradient: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
    className="card p-5"
  >
    <div className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center mb-4 shadow-sm`}>
      <Icon size={18} className="text-white" />
    </div>
    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">{value}</p>
    <p className="text-slate-500 text-sm mt-1.5">{label}</p>
  </motion.div>
)

const Dashboard = () => {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [charts, setCharts] = useState<Charts | null>(null)
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiClient.getDashboardSummary(),
      apiClient.getChartsData(),
      apiClient.getUpcomingBirthdays(7),
    ])
      .then(([s, c, b]) => {
        setSummary(s.data)
        setCharts(c.data)
        setBirthdays(b.data)
      })
      .catch(() => setError('Could not load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const stats = [
    { label: 'Total Members', value: summary?.total_members ?? 0, icon: Users, gradient: 'bg-orange-500', delay: 0 },
    { label: 'Monthly Revenue', value: `₹${(summary?.monthly_revenue ?? 0).toLocaleString('en-IN')}`, icon: DollarSign, gradient: 'bg-blue-500', delay: 0.05 },
    { label: 'Renewals This Month', value: summary?.renewals_this_month ?? 0, icon: TrendingUp, gradient: 'bg-emerald-500', delay: 0.1 },
    { label: "Today's Check-ins", value: summary?.todays_checkins ?? 0, icon: Activity, gradient: 'bg-violet-500', delay: 0.15 },
  ]

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome back — here's your gym at a glance</p>
      </motion.div>

      {/* Renewal alert banner */}
      {summary && summary.renewals_due > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/renewals" className="flex items-center justify-between bg-orange-500 text-white rounded-2xl px-5 py-3.5 hover:bg-orange-600 transition group shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Bell size={16} />
              </div>
              <span className="font-semibold text-sm sm:text-base">
                {summary.renewals_due} membership{summary.renewals_due > 1 ? 's' : ''} expiring soon
              </span>
            </div>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts?.revenue_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={11} stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 12 }}
                formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-6"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Member Growth</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts?.member_growth ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={11} stroke="#94a3b8" tick={{ fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 12 }}
              />
              <Bar dataKey="members" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom row: Active members + Quick actions + Birthdays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active members hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6 bg-slate-950 text-white"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Zap size={14} className="text-orange-400" />
            </div>
            <p className="text-sm font-medium text-slate-400">Active Members</p>
          </div>
          <p className="text-5xl font-extrabold text-white leading-none">{summary?.active_members ?? 0}</p>
          <p className="text-slate-500 text-sm mt-2">Currently active memberships</p>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-5"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Add Member', path: '/members' },
              { label: 'Record Payment', path: '/payments' },
              { label: 'QR Check-in', path: '/qr-checkin' },
              { label: 'View Reports', path: '/reports' },
            ].map((a) => (
              <Link
                key={a.path}
                to={a.path}
                className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition text-slate-700 font-medium text-sm group"
              >
                {a.label}
                <ArrowRight size={14} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Birthday widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Cake size={16} className="text-pink-500" />
            <h2 className="text-sm font-semibold text-slate-900">Upcoming Birthdays</h2>
          </div>
          {birthdays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Cake size={28} className="text-slate-200 mb-2" />
              <p className="text-slate-400 text-sm">No birthdays in the next 7 days</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {birthdays.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  {b.photo ? (
                    <img src={b.photo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-bold shrink-0">
                      {b.first_name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {b.first_name} {b.last_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {b.days_until === 0 ? '🎂 Today!' : `in ${b.days_until} day${b.days_until > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {b.days_until === 0 && (
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
