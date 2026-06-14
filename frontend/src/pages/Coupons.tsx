import { useEffect, useState } from 'react'
import { Plus, Trash2, Tag, CheckCircle, XCircle, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Coupon {
  id: string; code: string; description?: string
  discount_type: 'percentage' | 'fixed'; discount_value: number
  min_purchase_amount: number; max_uses?: number; used_count: number
  valid_from?: string; valid_till?: string; is_active: boolean; created_at: string
}

const empty = {
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  min_purchase_amount: '', max_uses: '', valid_till: '',
}

const Coupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>(empty)
  const [saving, setSaving] = useState(false)
  const [validateCode, setValidateCode] = useState('')
  const [validateAmount, setValidateAmount] = useState('')
  const [validateResult, setValidateResult] = useState<any>(null)

  const load = () => {
    setLoading(true)
    apiClient.get('/coupons')
      .then(r => setCoupons(r.data))
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error('Coupon code is required'); return }
    if (!form.discount_value || Number(form.discount_value) <= 0) { toast.error('Discount value must be positive'); return }
    setSaving(true)
    try {
      await apiClient.post('/coupons', {
        ...form,
        code: form.code.toUpperCase().trim(),
        discount_value: Number(form.discount_value),
        min_purchase_amount: Number(form.min_purchase_amount) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        valid_till: form.valid_till || null,
      })
      toast.success('Coupon created!')
      setShowModal(false)
      setForm(empty)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to create coupon')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c: Coupon) => {
    try {
      await apiClient.patch(`/coupons/${c.id}`, { is_active: !c.is_active })
      toast.success(c.is_active ? 'Coupon deactivated' : 'Coupon activated')
      load()
    } catch { toast.error('Failed to update coupon') }
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    try {
      await apiClient.delete(`/coupons/${id}`)
      toast.success('Coupon deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const handleValidate = async () => {
    if (!validateCode) { toast.error('Enter a coupon code'); return }
    if (!validateAmount) { toast.error('Enter an amount'); return }
    try {
      const r = await apiClient.post('/coupons/validate', {
        code: validateCode.toUpperCase().trim(),
        amount: Number(validateAmount),
      })
      setValidateResult(r.data)
    } catch (e: any) {
      setValidateResult({ error: e?.response?.data?.detail || 'Invalid coupon' })
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Copied!')
  }

  const isExpired = (c: Coupon) => c.valid_till && new Date(c.valid_till) < new Date()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons & Discounts</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage promo codes for membership discounts</p>
        </div>
        <button onClick={() => { setForm(empty); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={16} /> New Coupon
        </button>
      </div>

      {/* Validator */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Tag size={16} /> Validate Coupon</h2>
        <div className="flex gap-3 flex-wrap">
          <input value={validateCode} onChange={e => setValidateCode(e.target.value)}
            placeholder="Coupon code" className="border rounded-lg px-3 py-2 text-sm w-44 uppercase" />
          <input value={validateAmount} onChange={e => setValidateAmount(e.target.value)}
            placeholder="Purchase amount" type="number" className="border rounded-lg px-3 py-2 text-sm w-40" />
          <button onClick={handleValidate}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">Check</button>
        </div>
        {validateResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${validateResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
            {validateResult.error ? (
              <span className="flex items-center gap-2"><XCircle size={14} /> {validateResult.error}</span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle size={14} />
                Valid! Discount: ₹{validateResult.discount_amount} — Final amount: ₹{validateResult.final_amount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Tag size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No coupons yet. Create your first promo code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(c => (
            <div key={c.id} className={`bg-white rounded-xl border p-5 relative ${!c.is_active || isExpired(c) ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg text-gray-900 tracking-widest">{c.code}</span>
                    <button onClick={() => copyCode(c.code)} className="text-gray-400 hover:text-gray-600">
                      <Copy size={13} />
                    </button>
                  </div>
                  {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                </div>
                <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  isExpired(c) ? 'bg-red-100 text-red-600' :
                  c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {isExpired(c) ? 'Expired' : c.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-semibold text-blue-600">
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`} off
                  </span>
                </div>
                {c.min_purchase_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Min amount</span>
                    <span>₹{c.min_purchase_amount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Uses</span>
                  <span>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ' (unlimited)'}</span>
                </div>
                {c.valid_till && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expires</span>
                    <span>{new Date(c.valid_till).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => toggleActive(c)}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => deleteCoupon(c.id)}
                  className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">New Coupon</h2>

            <div>
              <label className="text-xs font-medium text-gray-600">Coupon Code *</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SAVE20" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm font-mono uppercase" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. 20% off on all plans" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Discount Type</label>
                <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Discount Value *</label>
                <input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === 'percentage' ? '20' : '500'}
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Min Purchase (₹)</label>
                <input type="number" value={form.min_purchase_amount} onChange={e => setForm({ ...form, min_purchase_amount: e.target.value })}
                  placeholder="0" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Max Uses</label>
                <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Unlimited" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Valid Till</label>
              <input type="date" value={form.valid_till} onChange={e => setForm({ ...form, valid_till: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Coupons
