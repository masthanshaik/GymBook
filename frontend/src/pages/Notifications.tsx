import { useEffect, useState } from 'react'
import { Bell, MessageSquare, Gift, Send, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Log { type: string; id: string; phone: string; message: string; status: string; sent_at: string }
interface Member { id: string; first_name: string; last_name: string }

const CHANNELS = [{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'sms', label: 'SMS' }, { value: 'both', label: 'Both' }]

export default function Notifications() {
  const [logs, setLogs] = useState<Log[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [renewalDays, setRenewalDays] = useState('7')
  const [renewalChannel, setRenewalChannel] = useState('whatsapp')
  const [customMsg, setCustomMsg] = useState('')
  const [customChannel, setCustomChannel] = useState('whatsapp')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [broadcastAll, setBroadcastAll] = useState(true)
  const [birthdayChannel, setBirthdayChannel] = useState('whatsapp')

  const load = () => {
    setLoading(true)
    Promise.all([apiClient.getNotificationLogs(), apiClient.getMembers(1, 200)])
      .then(([l, m]) => { setLogs(l.data); setMembers(m.data.items || []) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const sendRenewal = async () => {
    setSending('renewal')
    try {
      const r = await apiClient.sendRenewalReminders({ days_before: Number(renewalDays), channel: renewalChannel })
      toast.success(`Sent ${r.data.sent} renewal reminders`)
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSending(null) }
  }

  const sendBirthday = async () => {
    setSending('birthday')
    try {
      const r = await apiClient.sendBirthdayWishes({ channel: birthdayChannel })
      toast.success(r.data.sent > 0 ? `Sent ${r.data.sent} birthday wishes!` : 'No birthdays today')
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSending(null) }
  }

  const sendCustom = async () => {
    if (!customMsg.trim()) { toast.error('Enter a message'); return }
    setSending('custom')
    try {
      const payload: any = { message: customMsg, channel: customChannel }
      if (!broadcastAll && selectedMembers.length > 0) payload.member_ids = selectedMembers
      const r = await apiClient.sendCustomNotification(payload)
      toast.success(`Sent to ${r.data.sent} members`)
      setCustomMsg('')
      load()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed') } finally { setSending(null) }
  }

  const toggleMember = (id: string) =>
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Send WhatsApp & SMS messages to members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Renewal Reminders */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center"><Bell size={16} className="text-orange-600" /></div>
            <div><p className="font-semibold text-gray-800 text-sm">Renewal Reminders</p><p className="text-xs text-gray-500">Members expiring soon</p></div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Expiring within</label>
            <div className="flex gap-2 mt-1">
              <select value={renewalDays} onChange={e => setRenewalDays(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
                <option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option>
              </select>
              <select value={renewalChannel} onChange={e => setRenewalChannel(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
                {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={sendRenewal} disabled={sending === 'renewal'}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-lg py-2.5 text-sm hover:bg-orange-600 disabled:opacity-50">
            <Send size={14} />{sending === 'renewal' ? 'Sending...' : 'Send Reminders'}
          </button>
        </div>

        {/* Birthday Wishes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center"><Gift size={16} className="text-pink-600" /></div>
            <div><p className="font-semibold text-gray-800 text-sm">Birthday Wishes</p><p className="text-xs text-gray-500">Members with birthday today</p></div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Channel</label>
            <select value={birthdayChannel} onChange={e => setBirthdayChannel(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <button onClick={sendBirthday} disabled={sending === 'birthday'}
            className="w-full flex items-center justify-center gap-2 bg-pink-500 text-white rounded-lg py-2.5 text-sm hover:bg-pink-600 disabled:opacity-50">
            <Send size={14} />{sending === 'birthday' ? 'Sending...' : 'Send Birthday Wishes'}
          </button>
        </div>

        {/* Custom Message */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center"><MessageSquare size={16} className="text-blue-600" /></div>
            <div><p className="font-semibold text-gray-800 text-sm">Custom Message</p><p className="text-xs text-gray-500">Broadcast or targeted</p></div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Channel</label>
            <select value={customChannel} onChange={e => setCustomChannel(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Recipients</label>
              <button onClick={() => setBroadcastAll(!broadcastAll)} className={`text-xs px-2 py-0.5 rounded-full border ${broadcastAll ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-500 border-gray-200'}`}>
                {broadcastAll ? 'All Members' : `${selectedMembers.length} selected`}
              </button>
            </div>
            {!broadcastAll && (
              <div className="max-h-28 overflow-y-auto border rounded-lg p-2 space-y-1">
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={() => toggleMember(m.id)} className="rounded" />
                    {m.first_name} {m.last_name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={3}
            placeholder="Type your message here..." className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          <button onClick={sendCustom} disabled={sending === 'custom'}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm hover:bg-blue-700 disabled:opacity-50">
            <Send size={14} />{sending === 'custom' ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>

      {/* Notification Logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent Notifications</h2>
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg">Refresh</button>
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bell size={32} className="mx-auto mb-2 text-gray-300" />
            <p>No notifications sent yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${log.type === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'}`}>
                  <MessageSquare size={12} className={log.type === 'whatsapp' ? 'text-green-600' : 'text-blue-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">{log.type}</span>
                    <span className="text-xs text-gray-400">{log.phone}</span>
                    {log.status === 'sent'
                      ? <CheckCircle size={12} className="text-green-500" />
                      : log.status === 'failed'
                      ? <XCircle size={12} className="text-red-400" />
                      : <Clock size={12} className="text-gray-400" />}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 truncate">{log.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
