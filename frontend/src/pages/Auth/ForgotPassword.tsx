import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return toast.error('Enter your email')
    setLoading(true)
    try {
      const r = await apiClient.forgotPassword(email)
      setSent(true)
      if (r.data.reset_token) {
        setToken(r.data.reset_token)
      }
      toast.success('Reset token generated!')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-energy-500 flex items-center justify-center">
            <Dumbbell size={22} className="text-ink-950" />
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight">GymBook</span>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <Link to="/login" className="flex items-center gap-1.5 text-ink-500 hover:text-ink-700 text-sm mb-6 transition">
            <ArrowLeft size={15} /> Back to login
          </Link>

          <h1 className="text-2xl font-extrabold text-ink-900 mb-1">Reset Password</h1>
          <p className="text-ink-500 text-sm mb-6">Enter your email and we'll generate a reset token.</p>

          {!sent ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="input w-full"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending...' : 'Get Reset Token'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-energy-50 rounded-xl p-4 border border-energy-200">
                <p className="text-sm font-medium text-energy-800 mb-2">Reset token generated!</p>
                <p className="text-xs text-ink-500 mb-3">In production, this would be emailed. For now, copy this token to reset your password:</p>
                {token && (
                  <div className="bg-white rounded-lg p-3 border border-energy-200">
                    <code className="text-xs text-ink-800 break-all">{token}</code>
                  </div>
                )}
              </div>
              <Link to="/reset-password" className="btn-primary w-full block text-center">
                Use This Token to Reset Password →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
