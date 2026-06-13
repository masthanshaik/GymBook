import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, TrendingDown } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Expense {
  id: string; title: string; amount: number; category: string
  description?: string; expense_date: string; paid_by?: string; created_at: string
}

const CATEGORIES = ['rent', 'utilities', 'equipment', 'salaries', 'maintenance', 'marketing', 'supplies', 'other']
const CAT_COLORS: Record<string, string> = {
  rent: '#0f172a', utilities: '#84cc16', equipment: '#f97316', salaries: '#06b6d4',
  maintenance: '#8b5cf6', marketing: '#ec4899', supplies: '#f59e0b', other: '#94a3b8'
}

const emptyForm = { title: '', amount: '', category: 'other', description: '', expense_date: new Date().toISOString().split('T')[0], paid_by: '' }

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([apiClient.getExpenses({ days }), apiClient.getExpenseSummary(days)])
      .then(([r, s]) => { setExpenses(r.data.items || []); setSummary(s.data) })
      .catch(() => toast.error('Failed to load expenses'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [days])

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (e: Expense) => {
    setEditingId(e.id)
    setForm({ title: e.title, amount: String(e.amount), category: e.category, description: e.description || '', expense_date: e.expense_date.split('T')[0], paid_by: e.paid_by || '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title || !form.amount) return toast.error('Title and amount are required')
    setSaving(true)
    try {
      const payload: any = { ...form, amount: parseFloat(form.amount) }
      if (payload.expense_date) payload.expense_date = new Date(payload.expense_date).toISOString()
      if (editingId) {
        await apiClient.updateExpense(editingId, payload)
        toast.success('Expense updated')
      } else {
        await apiClient.createExpense(payload)
        toast.success('Expense added')
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    try {
      await apiClient.deleteExpense(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const pieData = summary?.by_category
    ? Object.entries(summary.by_category).map(([cat, amount]) => ({ name: cat, value: amount as number }))
    : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Expense Tracking</h1>
          <p className="text-ink-500 text-sm">Monitor gym costs and profitability</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input text-sm" value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-5 bg-ink-900 text-white">
            <p className="text-3xl font-extrabold text-energy-400">₹{summary.total_revenue.toLocaleString('en-IN')}</p>
            <p className="text-ink-300 text-sm mt-1">Total Revenue</p>
          </div>
          <div className="card p-5 bg-flame-50">
            <p className="text-3xl font-extrabold text-flame-700">₹{summary.total_expenses.toLocaleString('en-IN')}</p>
            <p className="text-ink-500 text-sm mt-1">Total Expenses</p>
          </div>
          <div className={`card p-5 ${summary.net_profit >= 0 ? 'bg-energy-50' : 'bg-red-50'}`}>
            <p className={`text-3xl font-extrabold ${summary.net_profit >= 0 ? 'text-energy-700' : 'text-red-700'}`}>
              ₹{Math.abs(summary.net_profit).toLocaleString('en-IN')}
            </p>
            <p className="text-ink-500 text-sm mt-1">Net {summary.net_profit >= 0 ? 'Profit' : 'Loss'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="font-bold text-ink-900 mb-4">By Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                  label={({ name }) => name}>
                  {pieData.map((entry, i) => <Cell key={i} fill={CAT_COLORS[entry.name] || '#94a3b8'} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-ink-400 text-sm">No expenses recorded</p>
            </div>
          )}
          {summary?.by_category && Object.entries(summary.by_category).map(([cat, amt]: any) => (
            <div key={cat} className="flex justify-between text-xs py-1.5 border-t border-ink-100 first:border-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[cat] || '#94a3b8' }} />
                <span className="capitalize text-ink-700">{cat}</span>
              </div>
              <span className="font-medium text-ink-900">₹{amt.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>

        {/* Expense list */}
        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-ink-500">Loading...</p>
          ) : expenses.length === 0 ? (
            <div className="card p-10 text-center">
              <TrendingDown size={40} className="mx-auto text-ink-300 mb-3" />
              <p className="text-ink-400">No expenses recorded in this period</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 border-b border-ink-200">
                  <tr>
                    {['Date', 'Title', 'Category', 'Amount', 'Paid By', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-ink-50 transition">
                      <td className="px-4 py-3 text-ink-500 text-xs">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">{e.title}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-ink-100 text-ink-700 capitalize">{e.category}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-flame-700">₹{e.amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-ink-500">{e.paid_by || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(e)} className="text-ink-400 hover:text-ink-700"><Edit2 size={14} /></button>
                          <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-ink-900 mb-4">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Title *</label>
                <input className="input w-full text-sm" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Amount (₹) *</label>
                  <input type="number" step="0.01" className="input w-full text-sm" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Category</label>
                  <select className="input w-full text-sm" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Date</label>
                  <input type="date" className="input w-full text-sm" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Paid By</label>
                  <input className="input w-full text-sm" value={form.paid_by} onChange={e => setForm(p => ({ ...p, paid_by: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Description</label>
                <textarea className="input w-full text-sm" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
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

export default Expenses
