import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@store/auth'

// Layout
import DashboardLayout from '@components/layout/DashboardLayout'
import LandingLayout from '@components/layout/LandingLayout'

// Pages
import LandingPage from '@pages/Landing'
import LoginPage from '@pages/Auth/Login'
import SignupPage from '@pages/Auth/Signup'
import DashboardPage from '@pages/Dashboard'
import MembersPage from '@pages/Members'
import MembershipsPage from '@pages/Memberships'
import RenewalsPage from '@pages/Renewals'
import PaymentsPage from '@pages/Payments'
import ClassesPage from '@pages/Classes'
import AttendancePage from '@pages/Attendance'
import ReportsPage from '@pages/Reports'
import SettingsPage from '@pages/Settings'
import NotFoundPage from '@pages/NotFound'

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Router>
      <Toaster />
      <Routes>
        {/* Public Routes */}
        <Route element={<LandingLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route path="/renewals" element={<RenewalsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}

export default App
