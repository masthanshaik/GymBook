import { Link, useLocation } from 'react-router-dom'
import { Dumbbell, LayoutDashboard, Users, BookOpen, Bell, CalendarDays, ClipboardCheck, CreditCard, BarChart3, Settings, X } from 'lucide-react'

interface Props {
  mobileOpen: boolean
  onClose: () => void
}

const Sidebar = ({ mobileOpen, onClose }: Props) => {
  const location = useLocation()

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Members', icon: Users, path: '/members' },
    { label: 'Memberships', icon: BookOpen, path: '/memberships' },
    { label: 'Renewals', icon: Bell, path: '/renewals' },
    { label: 'Classes', icon: CalendarDays, path: '/classes' },
    { label: 'Attendance', icon: ClipboardCheck, path: '/attendance' },
    { label: 'Payments', icon: CreditCard, path: '/payments' },
    { label: 'Reports', icon: BarChart3, path: '/reports' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-ink-900 text-white flex flex-col transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-ink-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-energy-500 flex items-center justify-center">
            <Dumbbell size={20} className="text-ink-950" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">GymBook</span>
        </div>
        <button onClick={onClose} className="lg:hidden text-ink-400 hover:text-white">
          <X size={22} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                active
                  ? 'bg-energy-500 text-ink-950 shadow-glow'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-white'
              }`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t border-ink-800">
        <p className="text-xs text-ink-500">GymBook v1.0</p>
      </div>
    </aside>
  )
}

export default Sidebar
