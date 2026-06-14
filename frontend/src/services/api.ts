import axios, { AxiosInstance, AxiosError } from 'axios'
import { useAuthStore } from '@store/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor - add token to headers
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().accessToken
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = useAuthStore.getState().refreshToken
            if (!refreshToken) {
              useAuthStore.getState().logout()
              return Promise.reject(error)
            }

            const response = await this.client.post('/auth/refresh', {
              refresh_token: refreshToken,
            })

            const { access_token, refresh_token } = response.data
            useAuthStore.getState().setTokens(access_token, refresh_token)

            originalRequest.headers.Authorization = `Bearer ${access_token}`
            return this.client(originalRequest)
          } catch (refreshError) {
            useAuthStore.getState().logout()
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  // Auth endpoints
  login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password })
  }

  logout() {
    return this.client.post('/auth/logout')
  }

  getCurrentUser() {
    return this.client.get('/auth/me')
  }

  // Vendor endpoints
  signupVendor(data: any) {
    return this.client.post('/vendors/signup', data)
  }

  getVendor(vendorId: string) {
    return this.client.get(`/vendors/${vendorId}`)
  }

  updateVendor(vendorId: string, data: any) {
    return this.client.put(`/vendors/${vendorId}`, data)
  }

  getVendorSettings(vendorId: string) {
    return this.client.get(`/vendors/${vendorId}/settings`)
  }

  updateVendorSettings(vendorId: string, data: any) {
    return this.client.put(`/vendors/${vendorId}/settings`, data)
  }

  // Member endpoints
  getMembers(page = 1, pageSize = 20) {
    return this.client.get('/members/', { params: { page, page_size: pageSize } })
  }

  getMember(memberId: string) {
    return this.client.get(`/members/${memberId}`)
  }

  createMember(data: any) {
    return this.client.post('/members/', data)
  }

  updateMember(memberId: string, data: any) {
    return this.client.put(`/members/${memberId}`, data)
  }

  deleteMember(memberId: string) {
    return this.client.delete(`/members/${memberId}`)
  }

  // Membership endpoints
  getMembershipPlans() {
    return this.client.get('/memberships/plans')
  }

  createMembershipPlan(data: any) {
    return this.client.post('/memberships/plans', data)
  }

  deactivateMembershipPlan(planId: string) {
    return this.client.delete(`/memberships/plans/${planId}`)
  }

  assignMembership(data: any) {
    return this.client.post('/memberships/', data)
  }

  getRenewals(days = 7) {
    return this.client.get(`/memberships/renewals?days=${days}`)
  }

  renewMembership(membershipId: string) {
    return this.client.post(`/memberships/${membershipId}/renew`)
  }

  getDashboardSummary() {
    return this.client.get('/reports/dashboard')
  }

  getChartsData() {
    return this.client.get('/reports/charts')
  }

  getUpcomingBirthdays(days = 7) {
    return this.client.get(`/reports/birthdays?days=${days}`)
  }

  getMemberDetail(memberId: string) {
    return this.client.get(`/reports/member-detail/${memberId}`)
  }

  getMembership(membershipId: string) {
    return this.client.get(`/memberships/${membershipId}`)
  }

  cancelMembership(membershipId: string) {
    return this.client.post(`/memberships/${membershipId}/cancel`)
  }

  // Payment endpoints
  initiatePayment(data: any) {
    return this.client.post('/payments/initiate', data)
  }

  getPayment(paymentId: string) {
    return this.client.get(`/payments/${paymentId}`)
  }

  refundPayment(paymentId: string) {
    return this.client.post(`/payments/${paymentId}/refund`)
  }

  getPaymentHistory(memberId: string) {
    return this.client.get(`/payments/history/${memberId}`)
  }

  // Class endpoints
  getClasses() {
    return this.client.get('/classes/')
  }

  getClass(classId: string) {
    return this.client.get(`/classes/${classId}`)
  }

  createClass(data: any) {
    return this.client.post('/classes/', data)
  }

  addClassSchedule(classId: string, data: any) {
    return this.client.post(`/classes/${classId}/schedule`, data)
  }

  enrollMember(classId: string, memberId: string) {
    return this.client.post(`/classes/${classId}/enroll?member_id=${memberId}`)
  }

  // Attendance endpoints
  checkIn(data: any) {
    return this.client.post('/attendance/check-in', data)
  }

  checkOut(data: any) {
    return this.client.post('/attendance/check-out', data)
  }

  getAttendanceReport() {
    return this.client.get('/attendance/report')
  }

  // Reports endpoints
  getFinancialReport(params?: any) {
    return this.client.get('/reports/financial', { params })
  }

  getMembersReport(params?: any) {
    return this.client.get('/reports/members', { params })
  }

  getAttendanceReportData(params?: any) {
    return this.client.get('/reports/attendance', { params })
  }

  getClassesReport(params?: any) {
    return this.client.get('/reports/classes', { params })
  }

  exportReportPDF(params?: any) {
    return this.client.get('/reports/export/pdf', { params })
  }

  exportReportExcel(params?: any) {
    return this.client.get('/reports/export/excel', { params })
  }

  getPlanDistribution() {
    return this.client.get('/reports/plan-distribution')
  }

  getFinancialExtended(days = 30) {
    return this.client.get('/reports/financial-extended', { params: { days } })
  }

  getRetentionReport() {
    return this.client.get('/reports/retention')
  }

  getLeadsFunnel() {
    return this.client.get('/reports/leads-funnel')
  }

  // Body Measurements
  getMemberMeasurements(memberId: string) {
    return this.client.get(`/measurements/member/${memberId}`)
  }

  addMeasurement(memberId: string, data: any) {
    return this.client.post(`/measurements/member/${memberId}`, data)
  }

  updateMeasurement(measurementId: string, data: any) {
    return this.client.put(`/measurements/${measurementId}`, data)
  }

  deleteMeasurement(measurementId: string) {
    return this.client.delete(`/measurements/${measurementId}`)
  }

  // CRM Leads
  getLeads(params?: any) {
    return this.client.get('/leads/', { params })
  }

  createLead(data: any) {
    return this.client.post('/leads/', data)
  }

  getLead(leadId: string) {
    return this.client.get(`/leads/${leadId}`)
  }

  updateLead(leadId: string, data: any) {
    return this.client.put(`/leads/${leadId}`, data)
  }

  convertLead(leadId: string) {
    return this.client.post(`/leads/${leadId}/convert`)
  }

  deleteLead(leadId: string) {
    return this.client.delete(`/leads/${leadId}`)
  }

  getLeadStats() {
    return this.client.get('/leads/stats/summary')
  }

  // Expenses
  getExpenses(params?: any) {
    return this.client.get('/expenses/', { params })
  }

  createExpense(data: any) {
    return this.client.post('/expenses/', data)
  }

  updateExpense(expenseId: string, data: any) {
    return this.client.put(`/expenses/${expenseId}`, data)
  }

  deleteExpense(expenseId: string) {
    return this.client.delete(`/expenses/${expenseId}`)
  }

  getExpenseSummary(days = 30) {
    return this.client.get('/expenses/summary', { params: { days } })
  }

  // Lockers
  getLockers(params?: any) {
    return this.client.get('/lockers/', { params })
  }

  createLocker(data: any) {
    return this.client.post('/lockers/', data)
  }

  assignLocker(lockerId: string, data: any) {
    return this.client.post(`/lockers/${lockerId}/assign`, data)
  }

  releaseLocker(lockerId: string) {
    return this.client.post(`/lockers/${lockerId}/release`)
  }

  updateLocker(lockerId: string, data: any) {
    return this.client.put(`/lockers/${lockerId}`, data)
  }

  deleteLocker(lockerId: string) {
    return this.client.delete(`/lockers/${lockerId}`)
  }

  // Staff Management
  getStaff() {
    return this.client.get('/staff/')
  }

  createStaff(data: any) {
    return this.client.post('/staff/', data)
  }

  updateStaff(staffId: string, data: any) {
    return this.client.put(`/staff/${staffId}`, data)
  }

  deleteStaff(staffId: string) {
    return this.client.delete(`/staff/${staffId}`)
  }

  // Membership Freeze
  freezeMembership(membershipId: string, data?: any) {
    return this.client.post(`/memberships/${membershipId}/freeze`, data || {})
  }

  unfreezeMembership(membershipId: string) {
    return this.client.post(`/memberships/${membershipId}/unfreeze`)
  }

  // QR Code
  getMemberQR(memberId: string) {
    return this.client.get(`/members/${memberId}/qr`)
  }

  // Class Waitlist
  getClassWaitlist(classId: string) {
    return this.client.get(`/classes/${classId}/waitlist`)
  }

  removeFromWaitlist(classId: string, memberId: string) {
    return this.client.delete(`/classes/${classId}/waitlist/${memberId}`)
  }

  // Developer Portal
  getApiKeys() {
    return this.client.get('/developers/api-keys')
  }

  createApiKey(data: any) {
    return this.client.post('/developers/api-keys', data)
  }

  deleteApiKey(keyId: string) {
    return this.client.delete(`/developers/api-keys/${keyId}`)
  }

  getWebhooks() {
    return this.client.get('/developers/webhooks')
  }

  createWebhook(data: any) {
    return this.client.post('/developers/webhooks', data)
  }

  updateWebhook(webhookId: string, data: any) {
    return this.client.put(`/developers/webhooks/${webhookId}`, data)
  }

  deleteWebhook(webhookId: string) {
    return this.client.delete(`/developers/webhooks/${webhookId}`)
  }

  getApiUsage() {
    return this.client.get('/developers/usage')
  }

  // Password Reset
  forgotPassword(email: string) {
    return this.client.post('/auth/forgot-password', { email })
  }

  resetPassword(token: string, newPassword: string) {
    return this.client.post('/auth/reset-password', { token, new_password: newPassword })
  }

  // Workout Plans
  getWorkoutPlans() { return this.client.get('/workout-plans') }
  createWorkoutPlan(data: any) { return this.client.post('/workout-plans', data) }
  updateWorkoutPlan(planId: string, data: any) { return this.client.patch(`/workout-plans/${planId}`, data) }
  deleteWorkoutPlan(planId: string) { return this.client.delete(`/workout-plans/${planId}`) }
  addWorkoutExercise(planId: string, data: any) { return this.client.post(`/workout-plans/${planId}/exercises`, data) }
  deleteWorkoutExercise(planId: string, exId: string) { return this.client.delete(`/workout-plans/${planId}/exercises/${exId}`) }
  getWorkoutAssignments() { return this.client.get('/workout-plans/assignments/all') }
  assignWorkoutPlan(data: any) { return this.client.post('/workout-plans/assignments', data) }
  updateWorkoutAssignment(id: string, data: any) { return this.client.patch(`/workout-plans/assignments/${id}`, data) }

  // Diet Plans
  getDietPlans() { return this.client.get('/diet-plans') }
  createDietPlan(data: any) { return this.client.post('/diet-plans', data) }
  updateDietPlan(planId: string, data: any) { return this.client.patch(`/diet-plans/${planId}`, data) }
  deleteDietPlan(planId: string) { return this.client.delete(`/diet-plans/${planId}`) }
  addDietMeal(planId: string, data: any) { return this.client.post(`/diet-plans/${planId}/meals`, data) }
  deleteDietMeal(planId: string, mealId: string) { return this.client.delete(`/diet-plans/${planId}/meals/${mealId}`) }
  getDietAssignments() { return this.client.get('/diet-plans/assignments/all') }
  assignDietPlan(data: any) { return this.client.post('/diet-plans/assignments', data) }
  updateDietAssignment(id: string, data: any) { return this.client.patch(`/diet-plans/assignments/${id}`, data) }

  // Trainer Assignments
  getTrainerAssignments(params?: any) { return this.client.get('/trainer-assignments', { params }) }
  getTrainers() { return this.client.get('/trainer-assignments/trainers') }
  getTrainerSummary() { return this.client.get('/trainer-assignments/trainer-summary') }
  assignTrainer(data: any) { return this.client.post('/trainer-assignments', data) }
  updateTrainerAssignment(id: string, data: any) { return this.client.patch(`/trainer-assignments/${id}`, data) }
  deleteTrainerAssignment(id: string) { return this.client.delete(`/trainer-assignments/${id}`) }

  // Notifications
  sendRenewalReminders(data?: any) { return this.client.post('/notifications/renewal-reminder', data || {}) }
  sendPaymentReceipt(data: any) { return this.client.post('/notifications/payment-receipt', data) }
  sendBirthdayWishes(data?: any) { return this.client.post('/notifications/birthday-wish', data || {}) }
  sendCustomNotification(data: any) { return this.client.post('/notifications/custom', data) }
  getNotificationLogs() { return this.client.get('/notifications/logs') }

  // Razorpay confirm
  confirmPayment(paymentId: string) { return this.client.post(`/payments/${paymentId}/confirm`) }

  // Generic HTTP methods for pages that call apiClient directly
  get(url: string, config?: any) {
    return this.client.get(url, config)
  }

  post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config)
  }

  patch(url: string, data?: any, config?: any) {
    return this.client.patch(url, data, config)
  }

  delete(url: string, config?: any) {
    return this.client.delete(url, config)
  }
}

export const apiClient = new APIClient()
