import { useEffect, useState } from 'react'
import { Plus, X, CreditCard, Zap, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

// Extend window for Razorpay
declare global { interface Window { Razorpay: any } }

interface Member { id: string; first_name: string; last_name?: string }
interface Payment { id: string; amount: number; status: string; payment_method: string; purpose?: string; initiated_at: string; razorpay_order_id?: string }

const badge = (s: string) => {
  const m: Record<string, string> = {
    completed: 'bg-energy-100 text-energy-800', pending: 'bg-flame-100 text-flame-700',
    refunded: 'bg-ink-100 text-ink-600', failed: 'bg-red-100 text-red-700',
  }
  return m[s] || 'bg-ink-100 text-ink-600'
}

const printInvoice = (payment: Payment, memberName: string) => {
  const win = window.open('', '_blank', 'width=600,height=700')
  if (!win) { toast.error('Allow popups to print invoice'); return }
  const date = new Date(payment.initiated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice #${payment.id.slice(0,8).toUpperCase()}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:32px;color:#1e293b;background:#fff}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #f97316;padding-bottom:20px;margin-bottom:24px}
      .logo{font-size:22px;font-weight:800;color:#0f172a}.logo span{color:#f97316}
      .inv-no{font-size:13px;color:#64748b;text-align:right}.inv-no strong{display:block;font-size:18px;color:#0f172a;margin-bottom:2px}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;background:#f8fafc;padding:16px;border-radius:10px}
      .meta-block p{margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600}
      .meta-block strong{font-size:14px;color:#0f172a}
      .amount-box{background:#0f172a;color:#fff;border-radius:12px;padding:20px;text-align:center;margin:20px 0}
      .amount-box .label{font-size:11px;opacity:.6;text-transform:uppercase;letter-spacing:.08em}
      .amount-box .value{font-size:36px;font-weight:800;color:#f97316}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;background:#dcfce7;color:#15803d}
      .badge.pending{background:#fef3c7;color:#b45309}
      .footer{margin-top:32px;border-top:1px solid #f1f5f9;padding-top:16px;font-size:11px;color:#94a3b8;text-align:center}
      @media print{body{padding:0}}
    </style></head><body>
    <div class="header">
      <div class="logo">Gym<span>Book</span><div style="font-size:11px;font-weight:400;color:#94a3b8;margin-top:4px">Payment Receipt</div></div>
      <div class="inv-no"><p style="font-size:11px;color:#94a3b8;margin:0">Invoice No.</p><strong>#${payment.id.slice(0,8).toUpperCase()}</strong><div style="font-size:12px;color:#94a3b8">${date}</div></div>
    </div>
    <div class="meta">
      <div class="meta-block"><p>Member</p><strong>${memberName}</strong></div>
      <div class="meta-block"><p>Purpose</p><strong style="text-transform:capitalize">${(payment.purpose || 'Payment').replace(/_/g,' ')}</strong></div>
      <div class="meta-block"><p>Payment Method</p><strong style="text-transform:capitalize">${payment.payment_method}</strong></div>
      <div class="meta-block"><p>Status</p><span class="badge ${payment.status !== 'completed' ? 'pending' : ''}">${payment.status}</span></div>
    </div>
    <div class="amount-box"><div class="label">Amount Paid</div><div class="value">₹${payment.amount.toLocaleString('en-IN')}</div></div>
    <div class="footer">Thank you for your payment · GymBook v2.0 · Generated ${new Date().toLocaleString('en-IN')}</div>
    <script>setTimeout(()=>window.print(),400)</script></body></html>`)
  win.document.close()
}

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })

const openRazorpay = async (payment: Payment, memberName: string, onSuccess: () => void) => {
  if (!payment.razorpay_order_id) return
  const ok = await loadRazorpayScript()
  if (!ok) { toast.error('Razorpay failed to load'); return }

  const rzp = new window.Razorpay({
    key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
    order_id: payment.razorpay_order_id,
    amount: payment.amount * 100,
    currency: 'INR',
    name: 'GymBook',
    description: payment.purpose?.replace('_', ' ') || 'Membership Payment',
    prefill: { name: memberName },
    theme: { color: '#3B82F6' },
    handler: async () => {
      try {
        await apiClient.confirmPayment(payment.id)
        toast.success('Payment successful!')
        onSuccess()
      } catch { toast.error('Payment confirmed but verification failed') }
    },
    modal: { ondismiss: () => toast('Payment cancelled', { icon: 'ℹ️' }) },
  })
  rzp.open()
}

const Payments = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [history, setHistory] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ member_id: '', amount: 0, payment_method: 'razorpay', purpose: 'new_membership' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient.getMembers(1, 100).then((res) => setMembers(res.data.items || []))
      .catch(() => toast.error('Could not load members')).finally(() => setLoading(false))
  }, [])

  const loadHistory = (memberId: string) => {
    setSelectedMember(memberId)
    if (!memberId) { setHistory([]); return }
    apiClient.getPaymentHistory(memberId).then((res) => setHistory(res.data.items || [])).catch(() => toast.error('Could not load history'))
  }

  const record = async () => {
    if (!form.member_id || form.amount <= 0) { toast.error('Select member and enter amount'); return }
    setSaving(true)
    try {
      const res = await apiClient.initiatePayment(form)
      const payment: Payment = res.data
      const member = members.find(m => m.id === form.member_id)
      const memberName = member ? `${member.first_name} ${member.last_name || ''}` : ''

      setShowModal(false)
      setForm({ member_id: '', amount: 0, payment_method: 'razorpay', purpose: 'new_membership' })

      // If Razorpay order was created, open checkout
      if (payment.razorpay_order_id) {
        await openRazorpay(payment, memberName, () => {
          if (selectedMember === form.member_id) loadHistory(selectedMember)
        })
      } else {
        // Cash/UPI — already marked completed
        toast.success('Payment recorded')
        if (selectedMember === form.member_id) loadHistory(selectedMember)
      }
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const retryRazorpay = async (payment: Payment) => {
    const member = members.find(m => m.id === selectedMember)
    const memberName = member ? `${member.first_name} ${member.last_name || ''}` : ''
    await openRazorpay(payment, memberName, () => loadHistory(selectedMember))
  }

  const refund = async (id: string) => {
    if (!confirm('Refund this payment?')) return
    try { await apiClient.refundPayment(id); toast.success('Refunded'); loadHistory(selectedMember) }
    catch (e: any) { toast.error(e.response?.data?.detail || 'Refund failed') }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Payments</h1>
          <p className="text-ink-500 text-sm">Record and track member payments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center justify-center gap-2">
          <Plus size={18} /> Record Payment
        </button>
      </div>

      <div className="card p-4 mb-5">
        <label className="block text-sm font-medium text-ink-700 mb-2">View history for member</label>
        <select className="input" value={selectedMember} onChange={(e) => loadHistory(e.target.value)} disabled={loading}>
          <option value="">Select a member...</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {!selectedMember ? (
          <div className="p-12 text-center"><CreditCard size={40} className="text-ink-300 mx-auto mb-3" /><p className="text-ink-500">Select a member to view their payment history.</p></div>
        ) : history.length === 0 ? (
          <p className="text-ink-500 text-center py-10">No payments for this member yet.</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-ink-100 bg-ink-50">
              <th className="text-left py-3 px-5 font-semibold text-ink-600 text-sm">Amount</th>
              <th className="text-left py-3 px-5 font-semibold text-ink-600 text-sm">Method</th>
              <th className="text-left py-3 px-5 font-semibold text-ink-600 text-sm hidden sm:table-cell">Purpose</th>
              <th className="text-left py-3 px-5 font-semibold text-ink-600 text-sm">Status</th>
              <th className="text-left py-3 px-5 font-semibold text-ink-600 text-sm">Action</th>
            </tr></thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-b border-ink-50 hover:bg-ink-50">
                  <td className="py-3 px-5 font-bold text-ink-900">₹{p.amount.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-5 capitalize text-ink-700">{p.payment_method}</td>
                  <td className="py-3 px-5 text-ink-700 hidden sm:table-cell">{p.purpose?.replace('_', ' ')}</td>
                  <td className="py-3 px-5"><span className={`badge ${badge(p.status)} capitalize`}>{p.status}</span></td>
                  <td className="py-3 px-5 flex gap-2">
                    {p.status === 'completed' && (
                      <>
                        <button onClick={() => { const m = members.find(x => x.id === selectedMember); printInvoice(p, m ? `${m.first_name} ${m.last_name || ''}` : 'Member') }}
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium text-sm" title="Download Invoice">
                          <FileText size={12} /> Invoice
                        </button>
                        <button onClick={() => refund(p.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">Refund</button>
                      </>
                    )}
                    {p.status === 'pending' && p.razorpay_order_id && (
                      <button onClick={() => retryRazorpay(p)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm">
                        <Zap size={12} /> Pay Now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-ink-900">Record Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-ink-400 hover:text-ink-700"><X size={22} /></button>
            </div>
            <div className="space-y-3">
              <select className="input" value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })}>
                <option value="">Select member...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
              <input type="number" className="input" placeholder="Amount ₹ *" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <option value="razorpay">Razorpay (Card / UPI / NetBanking)</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI (Manual)</option>
              </select>
              <select className="input" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                <option value="new_membership">New Membership</option>
                <option value="membership_renewal">Renewal</option>
                <option value="personal_training">Personal Training</option>
                <option value="other">Other</option>
              </select>
              {form.payment_method === 'razorpay' && (
                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  <Zap size={13} /> Razorpay checkout will open after clicking proceed
                </div>
              )}
            </div>
            <button onClick={record} disabled={saving} className="btn-primary w-full mt-5 disabled:opacity-50">
              {saving ? 'Processing...' : form.payment_method === 'razorpay' ? 'Proceed to Pay' : 'Record Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Payments
