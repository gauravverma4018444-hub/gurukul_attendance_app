import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// REQUEST INTERCEPTOR — attach JWT
// ============================================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// 🆕 PUBLIC AUTH ROUTES — these handle their own 401s
// (Do NOT force-logout / redirect on these)
// ============================================================
const PUBLIC_AUTH_ROUTES = [
  '/auth/login',
  '/auth/verify-2fa',
  '/auth/forgot-password/verify',
  '/auth/forgot-password/reset',
];

const isPublicAuthRoute = (url = '') =>
  PUBLIC_AUTH_ROUTES.some((route) => url.includes(route));

// ============================================================
// RESPONSE INTERCEPTOR — auto logout on expired session
// ============================================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';

    // 🆕 Let login / 2FA / forgot-password handle their own errors
    if (isPublicAuthRoute(requestUrl)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivityAt');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// AUTH API
// ============================================================
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  verify2FA: (data) => api.post('/auth/verify-2fa', data),
  registerUser: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  resetUserPassword: (id, data) => api.put(`/auth/users/${id}/reset-password`, data),

  // ── 🆕 FORGOT PASSWORD via Google Authenticator (no email needed) ──
  // Step 1: identifier + live 6-digit TOTP  →  { resetToken }
  forgotPasswordVerify: (data) => api.post('/auth/forgot-password/verify', data),

  // Step 2: resetToken + newPassword  →  { success }
  forgotPasswordReset: (data) => api.post('/auth/forgot-password/reset', data),
};

// ============================================================
// STUDENT API
// ============================================================
export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  getClasses: () => api.get('/students/classes'),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  remove: (id) => api.delete(`/students/${id}`),
  permanentDelete: (id) => api.delete(`/students/${id}/permanent`),
};

// ============================================================
// ATTENDANCE API
// ============================================================
export const attendanceAPI = {
  mark: (data) => api.post('/attendance/mark', data),
  getByClass: (params) => api.get('/attendance/class', { params }),
  getByStudent: (studentId, params) => api.get(`/attendance/student/${studentId}`, { params }),
  getMonthlyGrid: (params) => api.get('/attendance/monthly-grid', { params }),
  getUnmarkedToday: () => api.get('/attendance/unmarked-today'),
  getTodayAbsentees: () => api.get('/attendance/today-absentees'),
  getAbsentTrend: (params) => api.get('/attendance/absent-trend', { params }),
  getSummary: (params) => api.get('/reports/summary', { params }),
};

// ============================================================
// REPORT API
// ============================================================
export const reportAPI = {
  getNotifications: (params) => api.get('/reports/notifications', { params }),
  getDashboard: () => api.get('/reports/dashboard'),
  getSummary: (params) => api.get('/reports/summary', { params }),
  exportExcel: (params) => api.get('/reports/export', { params, responseType: 'blob' }),
};

// ============================================================
// PAYMENT EXPORT API
// ============================================================
export const paymentExportAPI = {
  getExportData: (academicYear) =>
    api.get(`/payments/export-data/${academicYear}`).then((res) => res.data),
};

export default api;