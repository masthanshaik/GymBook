import { Menu, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/auth'

interface Props {
  onMenuClick: () => void
}

const Header = ({ onMenuClick }: Props) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const doLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U'

  return (
    <header className="h-16 bg-white border-b border-ink-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <button onClick={onMenuClick} className="lg:hidden text-ink-600 hover:text-ink-900">
        <Menu size={24} />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-ink-900">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-xs text-ink-500 capitalize">{user?.role?.replace('_', ' ') || 'Owner'}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-ink-900 text-energy-400 flex items-center justify-center font-bold text-sm">
          {initials}
        </div>
        <button
          onClick={doLogout}
          className="text-ink-400 hover:text-flame-600 transition p-2"
          title="Log out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  )
}

export default Header
