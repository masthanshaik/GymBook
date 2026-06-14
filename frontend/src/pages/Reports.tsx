import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { apiClient } from '@services/api'

const COLORS = ['#84cc16', '#0f172a', '#f97316', '#06b6d4', '#8b5cf6', '#ec4899']

type Tab = 'overview' | 'financial' | 'members' | 'leads'

const Reports = () => {
  const [tab, setTab] = useState<Tab>('overview')
  const [financial, setFinancial] = useState<any>(null)
  const [memberStats, setMemberStats] = useState<any>(null)
  const [charts, setCharts] = useState<any>(null)
  const [planDist, setPlanDist] = useState<any[]>([])
  const [retention, setRetention] = useState<any[]>([])
  const [leadsFunnel, setLeadsFunnel] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiClient.getFinancialExtended(30),
      apiClient.getMembersReport(),
      apiClient.getChartsData(),
      apiClient.getPlanDistribution(),
      apiClient.getRetentionReport(),
      apiClient.getLeadsFunnel(),
    ]).then(([fin, mem, ch, plans, ret, leads]) => {
      setFinancial(fin.data)
      setMemberStats(mem.data)
      setCharts(ch.data)
      setPlanDist(plans.data)
      setRetention(ret.data)
      setLeadsFunnel(leads.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'leads', label: 'Leads / CRM', icon: TrendingUp },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Reports & Analytics</h1>
        <p className="text-ink-500 text-sm">Insights across your gym operations</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-ink-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-ink-500">Loading analytics...</p>}

      {!loading && tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Net Revenue (30d)', value: `₹${(financial?.net_revenue ?? 0).toLocaleString('en-IN')}`, color: 'text-energy-600' },
              { label: 'Total Members', value: memberStats?.total_members ?? 0, color: 'text-ink-900' },
              { label: 'Active Members', value: memberStats?.active_members ?? 0, color: 'text-ink-900' },
              { label: 'Retention Rate', value: `${memberStats?.retention_rate ?? 0}%`, color: 'text-ink-900' },
            ].map(k => (
              <div key={k.label} className="card p-5">
                <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
                <p className="text-ink-500 text-xs mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue + Member growth charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-6">
              <h2 className="font-bold text-ink-900 mb-4">Revenue Trend (6 months)</h2>
              <ResponsiveContainer width="100%" height={220}>
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
              <h2 className="font-bold text-ink-900 mb-4">New Members (6 months)</h2>
              <ResponsiveContainer width="100%" height={220}>
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

          {/* Plan distribution + Retention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-6">
              <h2 className="font-bold text-ink-900 mb-4">Plan Distribution</h2>
              {planDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPie>
                    <Pie data={planDist} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={80} label={({ plan, percent }) => `${plan} ${(percent * 100).toFixed(0)}%`}>
                      {planDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : <p className="text-ink-400 text-sm">No active memberships yet</p>}
            </div>
            <div className="card p-6">
              <h2 className="font-bold text-ink-900 mb-4">Retention vs Churn (6 months)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={retention}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
                  <YAxis fontSize={12} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new" name="New Members" fill="#84cc16" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expired" name="Expired" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: `₹${(financial?.total_revenue ?? 0).toLocaleString('en-IN')}`, bg: 'bg-energy-50', text: 'text-energy-700' },
              { label: 'Total Expenses', value: `₹${(financial?.total_expenses ?? 0).toLocaleString('en-IN')}`, bg: 'bg-flame-50', text: 'text-flame-700' },
              { label: 'Net Profit', value: `₹${(financial?.net_profit ?? 0).toLocaleString('en-IN')}`, bg: 'bg-ink-50', text: 'text-ink-900' },
              { label: 'Refunds', value: `₹${(financial?.total_refunds ?? 0).toLocaleString('en-IN')}`, bg: 'bg-red-50', text: 'text-red-700' },
              { label: 'Transactions', value: financial?.transactions_count ?? 0, bg: 'bg-blue-50', text: 'text-blue-700' },
              { label: 'Avg Transaction', value: `₹${(financial?.average_transaction ?? 0).toLocaleString('en-IN')}`, bg: 'bg-purple-50', text: 'text-purple-700' },
            ].map(k => (
              <div key={k.label} className={`card p-5 ${k.bg}`}>
                <p className={`text-2xl font-extrabold ${k.text}`}>{k.value}</p>
                <p className="text-ink-500 text-xs mt-1">{k.label} (last 30 days)</p>
              </div>
            ))}
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-ink-900 mb-4">Revenue by Payment Method</h2>
            {financial?.payment_methods && Object.keys(financial.payment_methods).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(financial.payment_methods).map(([method, amount]: any) => {
                  const pct = financial.total_revenue > 0 ? (amount / financial.total_revenue) * 100 : 0
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium capitalize text-ink-700">{method}</span>
                        <span className="text-ink-500">₹{amount.toLocaleString('en-IN')} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                        <div className="h-full bg-energy-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : <p className="text-ink-400 text-sm">No completed payments in the last 30 days</p>}
          </div>
        </div>
      )}

      {!loading && tab === 'members' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Members', value: memberStats?.total_members ?? 0 },
              { label: 'Active', value: memberStats?.active_members ?? 0 },
              { label: 'Inactive', value: memberStats?.inactive_members ?? 0 },
              { label: 'Expired', value: memberStats?.expired_members ?? 0 },
            ].map(k => (
              <div key={k.label} className="card p-5">
                <p className="text-2xl font-extrabold text-ink-900">{k.value}</p>
                <p className="text-ink-500 text-xs mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-6">
              <h2 className="font-bold text-ink-900 mb-4">Member Status Breakdown</h2>
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPie>
                  <Pie
                    data={[
                      { name: 'Active', value: memberStats?.active_members ?? 0 },
                      { name: 'Inactive', value: memberStats?.inactive_members ?? 0 },
                      { name: 'Expired', value: memberStats?.expired_members ?? 0 },
                    ]}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill="#84cc16" />
                    <Cell fill="#94a3b8" />
                    <Cell fill="#f97316" />
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            <div className="card p-6">
              <h2 className="font-bold text-ink-900 mb-1">Retention Rate</h2>
              <p className="text-5xl font-extrabold text-energy-500 my-4">{memberStats?.retention_rate ?? 0}%</p>
              <p className="text-ink-500 text-sm">New members this month: {memberStats?.new_members_this_month ?? 0}</p>

              <div className="mt-4">
                <h3 className="font-bold text-ink-900 mb-3">Monthly Trend</h3>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={retention}>
                    <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                    <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="new" name="New" fill="#84cc16" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expired" name="Expired" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'leads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {leadsFunnel && Object.entries(leadsFunnel).map(([status, count]: any) => {
              const colors: Record<string, string> = {
                new: 'bg-blue-50 text-blue-700',
                contacted: 'bg-yellow-50 text-yellow-700',
                trial: 'bg-purple-50 text-purple-700',
                converted: 'bg-energy-50 text-energy-700',
                lost: 'bg-red-50 text-red-700',
              }
              return (
                <div key={status} className={`card p-5 ${colors[status] || 'bg-ink-50 text-ink-700'}`}>
                  <p className="text-2xl font-extrabold">{count}</p>
                  <p className="text-xs mt-1 capitalize">{status}</p>
                </div>
              )
            })}
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-ink-900 mb-4">Lead Conversion Funnel</h2>
            {leadsFunnel && Object.keys(leadsFunnel).length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(leadsFunnel).map(([k, v]) => ({ stage: k, count: v as number }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="stage" fontSize={12} stroke="#94a3b8" />
                  <YAxis fontSize={12} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-ink-400 text-sm">No lead data yet. Start adding enquiries in the <a href="/leads" className="text-energy-600 underline">Leads</a> section.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
