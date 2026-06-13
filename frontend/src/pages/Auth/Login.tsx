import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Dumbbell } from 'lucide-react'
import { useAuthStore } from '@store/auth'
import { apiClient } from '@services/api'

interface LoginForm {
  email: string
  password: string
}

const Login = () => {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const response = await apiClient.login(data.email, data.password)
      const { access_token, refresh_token } = response.data

      setTokens(access_token, refresh_token)

      const userResponse = await apiClient.getCurrentUser()
      setUser(userResponse.data)

      toast.success('Logged in successfully')
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-energy-500 flex items-center justify-center">
            <Dumbbell size={26} className="text-ink-950" />
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight">GymBook</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-extrabold text-center text-ink-900 mb-1">Welcome back</h2>
          <p className="text-center text-ink-500 text-sm mb-7">Sign in to manage your gym</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Email Address</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-flame-600 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Password</label>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                className="input"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-flame-600 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center justify-between mt-6 text-sm">
            <Link to="/forgot-password" className="text-ink-400 hover:text-ink-600 transition">Forgot password?</Link>
            <span className="text-ink-400">
              No account?{' '}
              <Link to="/signup" className="text-energy-700 hover:text-energy-800 font-semibold">Sign Up</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
