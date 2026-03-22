import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// ===== Student Auth API (M1 — Live) =====
export const studentAuthAPI = {
  requestSignup: (data) => api.post('/student/auth/request-signup', data),
  verifyOTP: (data) => api.post('/student/auth/verify-otp', data),
  completeSignup: (data) => api.post('/student/auth/complete-signup', data),
  login: (data) => api.post('/student/auth/login', data),
  logout: () => api.post('/student/auth/logout'),
  getProfile: () => api.get('/student/auth/profile'),
  changePassword: (data) => api.post('/student/auth/change-password', data),
  requestPasswordReset: (data) => api.post('/student/auth/request-password-reset', data),
  verifyPasswordResetOTP: (data) => api.post('/student/auth/verify-password-reset-otp', data),
  resetPassword: (data) => api.post('/student/auth/reset-password', data),
}

// ===== Educator Auth API (M1 — Live) =====
export const educatorAuthAPI = {
  requestSignup: (data) => api.post('/educator/auth/request-signup', data),
  verifyOTP: (data) => api.post('/educator/auth/verify-otp', data),
  completeSignup: (data) => api.post('/educator/auth/complete-signup', data),
  login: (data) => api.post('/educator/auth/login', data),
  logout: () => api.post('/educator/auth/logout'),
  getProfile: () => api.get('/educator/auth/profile'),
  changePassword: (data) => api.post('/educator/auth/change-password', data),
  requestPasswordReset: (data) => api.post('/educator/auth/request-password-reset', data),
  verifyPasswordResetOTP: (data) => api.post('/educator/auth/verify-password-reset-otp', data),
  resetPassword: (data) => api.post('/educator/auth/reset-password', data),
}

// ===== Admin Auth API (M1 — Live) =====
export const adminAuthAPI = {
  login: (data) => api.post('/admin/auth/login', data),
  logout: () => api.post('/admin/auth/logout'),
}

// ===== Study Planner API (M3 — Live) =====
export const studyPlanAPI = {
  generate: (data) => api.post('/study-plans/generate', data),
  getAll: (params) => api.get('/study-plans', { params }),
  getOne: (id) => api.get(`/study-plans/${id}`),
  create: (data) => api.post('/study-plans', data),
  update: (id, data) => api.put(`/study-plans/${id}`, data),
  delete: (id) => api.delete(`/study-plans/${id}`),
  getProgress: (id) => api.get(`/study-plans/${id}/progress`),
  getSessions: (id, params) => api.get(`/study-plans/${id}/sessions`, { params }),
  addSession: (id, data) => api.post(`/study-plans/${id}/sessions`, data),
}

export const studySessionAPI = {
  complete: (id, data) => api.patch(`/study-sessions/${id}/complete`, data),
  reschedule: (id, data) => api.patch(`/study-sessions/${id}/reschedule`, data),
  autoReschedule: (data) => api.post('/study-sessions/auto-reschedule', data),
  delete: (id) => api.delete(`/study-sessions/${id}`),
}

export const personalizationAPI = {
  getProfile: () => api.get('/personalization/profile'),
  assess: (data) => api.post('/personalization/assess', data),
}

export const recommendationAPI = {
  getAll: (params) => api.get('/recommendations', { params }),
  accept: (id) => api.patch(`/recommendations/${id}/accept`),
  dismiss: (id) => api.patch(`/recommendations/${id}/dismiss`),
}

// ===== Content API (M2 — Live) =====
export const contentAPI = {
  getAll: (params) => api.get('/content', { params }),
  getRecommended: () => api.get('/content/recommended'),
  getBookmarks: () => api.get('/content/bookmarks'),
  getOne: (id) => api.get(`/content/${id}`),
  create: (data) => api.post('/content', data),
  update: (id, data) => api.put(`/content/${id}`, data),
  delete: (id) => api.delete(`/content/${id}`),
  updateProgress: (id, data) => api.put(`/content/${id}/progress`, data),
  bookmark: (id) => api.post(`/content/${id}/bookmark`),
  unbookmark: (id) => api.delete(`/content/${id}/bookmark`),
}

// ===== Career Paths API (M2 — Live) =====
export const careerAPI = {
  getCategories: () => api.get('/categories'),
  getAll: (params) => api.get('/career-paths', { params }),
  getOne: (id) => api.get(`/career-paths/${id}`),
  create: (data) => api.post('/career-paths', data),
  update: (id, data) => api.put(`/career-paths/${id}`, data),
  delete: (id) => api.delete(`/career-paths/${id}`),
  linkContent: (id, data) => api.post(`/career-paths/${id}/content`, data),
  unlinkContent: (id, contentId) => api.delete(`/career-paths/${id}/content/${contentId}`),
}

// ===== Webinar API (M2 — Live) =====
export const webinarAPI = {
  getAll: () => api.get('/webinars'),
  getOne: (id) => api.get(`/webinars/${id}`),
  getMyRegistrations: () => api.get('/webinars/my-registrations'),
  create: (data) => api.post('/webinars', data),
  update: (id, data) => api.put(`/webinars/${id}`, data),
  delete: (id) => api.delete(`/webinars/${id}`),
  register: (id) => api.post(`/webinars/${id}/register`),
  cancelRegistration: (id) => api.delete(`/webinars/${id}/register`),
}

export default api
