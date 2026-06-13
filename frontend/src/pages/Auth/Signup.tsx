import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuthStore } from '@store/auth'
import { apiClient } from '@services/api'

interface SignupForm {
  vendor_name: string
  subdomain: string
  email: string
  phone: string
  owner_name: string
  owner_email: string
  owner_password: string
  city?: string
}

const Signup = () => {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const { register, handleSubmit } = useForm<SignupForm>()
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data: SignupForm) => {
    setLoading(true)
    try {
      await apiClient.signupVendor(data)

      // Auto-login after signup
      const loginResponse = await apiClient.login(data.owner_email, data.owner_password)
      const { access_token, refresh_token } = loginResponse.data

      setTokens(access_token, refresh_token)

      const userResponse = await apiClient.getCurrentUser()
      setUser(userResponse.data)

      toast.success('Vendor registered successfully')
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-8">Register Your Gym</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gym Name
              </label>
              <input
                {...register('vendor_name', { required: 'Gym name is required' })}
                className="input-field"
                placeholder="My Gym"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain
              </label>
              <input
                {...register('subdomain', { required: 'Subdomain is required' })}
                className="input-field"
                placeholder="mygym"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gym Email
            </label>
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="input-field"
              placeholder="gym@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              {...register('phone', { required: 'Phone is required' })}
              className="input-field"
              placeholder="9876543210"
            />
          </div>

          <hr />

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Owner Information</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              {...register('owner_name', { required: 'Name is required' })}
              className="input-field"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              {...register('owner_email', { required: 'Email is required' })}
              className="input-field"
              placeholder="owner@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              {...register('owner_password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
