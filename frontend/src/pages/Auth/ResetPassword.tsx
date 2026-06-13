import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return toast.error('Enter the reset token')
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await apiClient.resetPassword(token, password)
      toast.success('Password reset successfully!')
      setTimeout(() => navigate('/login'), 1500)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Reset failed. Token may be invalid or expired.')
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
          <Link to="/forgot-password" className="flex items-center gap-1.5 text-ink-500 hover:text-ink-700 text-sm mb-6 transition">
            <ArrowLeft size={15} /> Back
          </Link>

          <h1 className="text-2xl font-extrabold text-ink-900 mb-1">Set New Password</h1>
          <p className="text-ink-500 text-sm mb-6">Enter your reset token and choose a new password.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Reset Token</label>
              <input
                type="text"
                required
                className="input w-full font-mono text-sm"
                placeholder="Paste your reset token here"
                value={token}
                onChange={e => setToken(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  className="input w-full pr-10"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                required
                className="input w-full"
                placeholder="Repeat new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-4">
            Remember your password?{' '}
            <Link to="/login" className="text-energy-600 font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
