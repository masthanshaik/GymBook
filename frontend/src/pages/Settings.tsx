import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'
import { useAuthStore } from '@store/auth'

const Settings = () => {
  const { user } = useAuthStore()
  const vendorId = user?.vendor_id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    vendor_name: '', email: '', phone: '',
    address: '', city: '', state: '', postal_code: '',
  })
  const [readOnly, setReadOnly] = useState({ subdomain: '', current_members: 0, subscription_plan: '' })

  useEffect(() => {
    if (!vendorId) { setLoading(false); return }
    apiClient.getVendor(vendorId)
      .then((res) => {
        const v = res.data
        setForm({
          vendor_name: v.vendor_name || '', email: v.email || '', phone: v.phone || '',
          address: v.address || '', city: v.city || '', state: v.state || '', postal_code: v.postal_code || '',
        })
        setReadOnly({ subdomain: v.subdomain, current_members: v.current_members, subscription_plan: v.subscription_plan })
      })
      .catch(() => toast.error('Could not load gym profile'))
      .finally(() => setLoading(false))
  }, [vendorId])

  const save = async () => {
    if (!vendorId) return
    if (!form.vendor_name) { toast.error('Gym name is required'); return }
    setSaving(true)
    try {
      await apiClient.updateVendor(vendorId, form)
      toast.success('Settings saved')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  if (loading) return <div><h1 className="text-2xl font-extrabold text-ink-900 mb-6">Settings</h1><p className="text-ink-500">Loading...</p></div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Settings</h1>
        <p className="text-ink-500 text-sm">Manage your gym profile</p>
      </div>

      <div className="card p-6 max-w-2xl">
        <h2 className="text-base font-bold text-ink-900 mb-4">Gym Profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-ink-50 rounded-xl p-4"><p className="text-xs text-ink-500">Subdomain</p><p className="font-bold text-ink-900">{readOnly.subdomain}</p></div>
          <div className="bg-energy-50 rounded-xl p-4"><p className="text-xs text-ink-500">Members</p><p className="font-bold text-energy-700">{readOnly.current_members}</p></div>
          <div className="bg-flame-50 rounded-xl p-4"><p className="text-xs text-ink-500">Plan</p><p className="font-bold text-flame-600 capitalize">{readOnly.subscription_plan}</p></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Gym Name</label>
            <input className="input" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-ink-700 mb-1.5">Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1.5">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-ink-700 mb-1.5">Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-ink-700 mb-1.5">City</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1.5">State</label><input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1.5">Postal Code</label><input className="input" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary mt-6 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>
    </div>
  )
}

export default Settings
