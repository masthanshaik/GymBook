import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell, LayoutDashboard, Users, BookOpen, Bell, CalendarDays,
  ClipboardCheck, CreditCard, BarChart3, Settings, X, Shield,
  Activity, UserPlus, TrendingDown, Lock, Tag, Target,
  Apple, UserCheck, MessageSquare, QrCode, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@store/auth'

interface Props {
  mobileOpen: boolean
  onClose: () => void
}

const sections = [
  {
    title: 'Core',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Members', icon: Users, path: '/members' },
      { label: 'Memberships', icon: BookOpen, path: '/memberships' },
      { label: 'Renewals', icon: Bell, path: '/renewals' },
      { label: 'Classes', icon: CalendarDays, path: '/classes' },
      { label: 'Attendance', icon: ClipboardCheck, path: '/attendance' },
      { label: 'Payments', icon: CreditCard, path: '/payments' },
      { label: 'QR Check-in', icon: QrCode, path: '/qr-checkin' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'Leads / CRM', icon: UserPlus, path: '/leads' },
      { label: 'Body Metrics', icon: Activity, path: '/measurements' },
      { label: 'Expenses', icon: TrendingDown, path: '/expenses' },
      { label: 'Lockers', icon: Lock, path: '/lockers' },
      { label: 'Coupons', icon: Tag, path: '/coupons' },
      { label: 'Goals', icon: Target, path: '/goals' },
      { label: 'Workout Plans', icon: Dumbbell, path: '/workout-plans' },
      { label: 'Diet Plans', icon: Apple, path: '/diet-plans' },
      { label: 'Trainers', icon: UserCheck, path: '/trainer-assignments' },
      { label: 'Notifications', icon: MessageSquare, path: '/notifications' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Staff', icon: Shield, path: '/staff' },
      { label: 'Reports', icon: BarChart3, path: '/reports' },
      { label: 'Settings', icon: Settings, path: '/settings' },
    ],
  },
]

const NavContent = ({ pathname, onClose, user }: { pathname: string; onClose: () => void; user: any }) => {
  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U'

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow">
            <Dumbbell size={16} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight">GymBook</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition"
        >
          <X size={17} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={15} className={active ? 'text-white' : 'text-slate-500'} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && <ChevronRight size={12} className="opacity-50 shrink-0" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[10px] text-slate-500 capitalize truncate">
              {user?.role?.replace('_', ' ') || 'Owner'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const Sidebar = ({ mobileOpen, onClose }: Props) => {
  const { pathname } = useLocation()
  const { user } = useAuthStore()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0">
        <div className="h-screen flex flex-col sticky top-0">
          <NavContent pathname={pathname} onClose={onClose} user={user} />
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              key="sidebar"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-60 lg:hidden"
            >
              <NavContent pathname={pathname} onClose={onClose} user={user} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar
