import { Menu, LogOut, Bell, Search } from 'lucide-react'
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
    <header className="h-16 bg-white border-b border-slate-200/70 flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 bg-slate-100 rounded-xl px-3.5 py-2 w-56 xl:w-72">
          <Search size={15} className="text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400 select-none">Search...</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 ml-1 pl-3 border-l border-slate-200">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[10px] text-slate-500 capitalize leading-tight">
              {user?.role?.replace('_', ' ') || 'Owner'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            {initials}
          </div>
        </div>

        <button
          onClick={doLogout}
          className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition ml-1"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

export default Header
