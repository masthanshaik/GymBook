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
}

export const apiClient = new APIClient()
