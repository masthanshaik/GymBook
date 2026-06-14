import { useState, useEffect } from 'react'
import { Calendar, CreditCard, Target, Activity, LogOut, Dumbbell } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = 'http://127.0.0.1:8000/api/v1/member-portal'

const portalApi = (token: string) =>
  axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` } })

type Tab = 'membership' | 'attendance' | 'goals' | 'measurements'

const MemberPortal = () => {
  const [token, setToken] = useState(() => localStorage.getItem('member_portal_token') || '')
  const [member, setMember] = useState<any>(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [logging, setLogging] = useState(false)
  const [tab, setTab] = useState<Tab>('membership')
  const [data, setData] = useState<any>(null)
  const [loadingTab, setLoadingTab] = useState(false)

  useEffect(() => {
    if (token) {
      portalApi(token).get('/me')
        .then(r => setMember(r.data))
        .catch(() => { localStorage.removeItem('member_portal_token'); setToken('') })
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    setLoadingTab(true)
    setData(null)
    portalApi(token).get(`/${tab}`)
      .then(r => setData(r.data))
      .catch(() => toast.error(`Failed to load ${tab}`))
      .finally(() => setLoadingTab(false))
  }, [tab, token])

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) { toast.error('Enter email and password'); return }
    setLogging(true)
    try {
      const r = await axios.post(`${API}/login`, loginForm)
      localStorage.setItem('member_portal_token', r.data.access_token)
      setToken(r.data.access_token)
      setMember(r.data.member)
      toast.success(`Welcome, ${r.data.member.first_name}!`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLogging(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('member_portal_token')
    setToken('')
    setMember(null)
    setData(null)
  }

  if (!token || !member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Dumbbell size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Member Portal</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to view your fitness journey</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input type="email" value={loginForm.email}
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="you@example.com" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Password</label>
              <input type="password" value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            </div>
            <button onClick={handleLogin} disabled={logging}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {logging ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">Contact your gym to get portal access</p>
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'membership', label: 'Membership', icon: CreditCard },
    { key: 'attendance', label: 'Attendance', icon: Calendar },
    { key: 'goals', label: 'Goals', icon: Target },
    { key: 'measurements', label: 'Measurements', icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Dumbbell size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{member.first_name} {member.last_name}</p>
              <p className="text-xs text-gray-500">{member.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon size={14} /> <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>

        {loadingTab ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <>
            {tab === 'membership' && (
              <div className="space-y-3">
                {(!data || data.length === 0) ? (
                  <div className="text-center py-12 bg-white rounded-xl border text-gray-400">No memberships found</div>
                ) : data.map((m: any) => (
                  <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{m.plan_name}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        m.status === 'active' ? 'bg-green-100 text-green-700' :
                        m.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                      }`}>{m.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div><span className="text-gray-400">Start:</span> {new Date(m.started_date).toLocaleDateString()}</div>
                      <div><span className="text-gray-400">End:</span> {new Date(m.ended_date).toLocaleDateString()}</div>
                      <div><span className="text-gray-400">Duration:</span> {m.plan_duration_months} month(s)</div>
                      <div><span className="text-gray-400">Amount:</span> ₹{m.final_price}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'attendance' && (
              <div className="space-y-2">
                {(!data || data.length === 0) ? (
                  <div className="text-center py-12 bg-white rounded-xl border text-gray-400">No attendance records</div>
                ) : data.map((r: any) => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(r.check_in_time).toLocaleDateString()} — {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {r.check_out_time && (
                        <p className="text-xs text-gray-500">
                          Out: {new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {r.duration_minutes ? ` · ${r.duration_minutes} min` : ''}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{r.status === 'checked_in' ? 'In Gym' : 'Done'}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'goals' && (
              <div className="space-y-3">
                {(!data || data.length === 0) ? (
                  <div className="text-center py-12 bg-white rounded-xl border text-gray-400">No goals set yet</div>
                ) : data.map((g: any) => {
                  const pct = g.target_value && g.current_value
                    ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : null
                  return (
                    <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{g.title}</p>
                          <p className="text-xs text-gray-500 capitalize">{g.goal_type?.replace('_', ' ')}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          g.status === 'achieved' ? 'bg-green-100 text-green-700' :
                          g.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}>{g.status}</span>
                      </div>
                      {g.target_value && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{g.current_value ?? 0} / {g.target_value} {g.target_unit}</span>
                            <span>{pct ?? 0}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${pct ?? 0}%` }} />
                          </div>
                        </div>
                      )}
                      {g.deadline && (
                        <p className="text-xs text-gray-400 mt-2">Deadline: {new Date(g.deadline).toLocaleDateString()}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'measurements' && (
              <div className="space-y-3">
                {(!data || data.length === 0) ? (
                  <div className="text-center py-12 bg-white rounded-xl border text-gray-400">No measurements recorded</div>
                ) : data.map((r: any) => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="font-medium text-gray-900 mb-3">
                      {new Date(r.recorded_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {r.weight_kg && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">Weight</p><p className="font-semibold">{r.weight_kg} kg</p></div>}
                      {r.height_cm && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">Height</p><p className="font-semibold">{r.height_cm} cm</p></div>}
                      {r.bmi && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">BMI</p><p className="font-semibold">{r.bmi}</p></div>}
                      {r.body_fat_pct && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">Body Fat</p><p className="font-semibold">{r.body_fat_pct}%</p></div>}
                      {r.muscle_mass_kg && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">Muscle</p><p className="font-semibold">{r.muscle_mass_kg} kg</p></div>}
                      {r.waist_cm && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">Waist</p><p className="font-semibold">{r.waist_cm} cm</p></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default MemberPortal
