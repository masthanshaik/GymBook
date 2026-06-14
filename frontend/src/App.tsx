import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@store/auth'

// Layout
import DashboardLayout from '@components/layout/DashboardLayout'
import LandingLayout from '@components/layout/LandingLayout'

// Public pages
import LandingPage from '@pages/Landing'
import LoginPage from '@pages/Auth/Login'
import SignupPage from '@pages/Auth/Signup'
import ForgotPasswordPage from '@pages/Auth/ForgotPassword'
import ResetPasswordPage from '@pages/Auth/ResetPassword'

// Dashboard pages
import DashboardPage from '@pages/Dashboard'
import MembersPage from '@pages/Members'
import MembershipsPage from '@pages/Memberships'
import RenewalsPage from '@pages/Renewals'
import PaymentsPage from '@pages/Payments'
import ClassesPage from '@pages/Classes'
import AttendancePage from '@pages/Attendance'
import ReportsPage from '@pages/Reports'
import SettingsPage from '@pages/Settings'
import StaffPage from '@pages/Staff'
import MeasurementsPage from '@pages/Measurements'
import LeadsPage from '@pages/Leads'
import ExpensesPage from '@pages/Expenses'
import LockersPage from '@pages/Lockers'
import CouponsPage from '@pages/Coupons'
import GoalsPage from '@pages/Goals'
import WorkoutPlansPage from '@pages/WorkoutPlans'
import DietPlansPage from '@pages/DietPlans'
import TrainerAssignmentsPage from '@pages/TrainerAssignments'
import NotificationsPage from '@pages/Notifications'
import QRCheckinPage from '@pages/QRCheckin'
import MemberPortalPage from '@pages/MemberPortal'
import NotFoundPage from '@pages/NotFound'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <Router>
      <Toaster />
      <Routes>
        {/* Public */}
        <Route element={<LandingLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Dashboard */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route path="/renewals" element={<RenewalsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* New features */}
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/measurements" element={<MeasurementsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/lockers" element={<LockersPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/workout-plans" element={<WorkoutPlansPage />} />
          <Route path="/diet-plans" element={<DietPlansPage />} />
          <Route path="/trainer-assignments" element={<TrainerAssignmentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/qr-checkin" element={<QRCheckinPage />} />
        </Route>

        {/* Member Portal - standalone, no dashboard layout */}
        <Route path="/member-portal" element={<MemberPortalPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}

export default App
