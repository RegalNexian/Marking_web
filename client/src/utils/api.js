import axios from 'axios';

const resolveBaseUrl = () => {
  const configured = import.meta.env.VITE_SERVER_URL?.trim();
  if (configured) return configured;

  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
};

const API_BASE_URL = resolveBaseUrl();


// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // if backend uses credentials
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data?.message || error.message);
    return Promise.reject(error);
  }
);

// API functions

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

// Tracks
export const tracksAPI = {
  getAll: (options = {}) => api.get(`/api/tracks${buildQuery(options)}`),
  create: (data) => api.post('/api/tracks', data),
  update: (id, data) => api.put(`/api/tracks/${id}`, data),
  delete: (id) => api.delete(`/api/tracks/${id}`),
  getById: (id) => api.get(`/api/tracks/${id}`),
  verifyPassword: (id, password) => api.post(`/api/tracks/${id}/verify`, { password })
};

// Juries
export const juriesAPI = {
  getAll: (params = {}) => api.get(`/api/juries${buildQuery(params)}`),
  create: (data) => api.post('/api/juries', data),
  getByName: (name, params = {}) => api.get(`/api/juries/${encodeURIComponent(name)}${buildQuery(params)}`),
  updateStatus: (name, data) => api.put(`/api/juries/${encodeURIComponent(name)}`, data),
  updateAssignments: (id, data) => api.put(`/api/juries/${id}/assignments`, data),
  delete: (name) => api.delete(`/api/juries/${encodeURIComponent(name)}`),
};

// Teams
export const teamsAPI = {
  getAll: (params = {}) => api.get(`/api/teams${buildQuery(params)}`),
  create: (data) => api.post('/api/teams', data),
  update: (id, data) => api.put(`/api/teams/${id}`, data),
  delete: (id) => api.delete(`/api/teams/${id}`),
  getByName: (name, params = {}) => api.get(`/api/teams/name/${encodeURIComponent(name)}${buildQuery(params)}`),
};

// Marks
export const marksAPI = {
  save: (trackId, juryName, data) => api.post(`/api/marks/track/${trackId}/jury/${encodeURIComponent(juryName)}`, data),
  getByJury: (trackId, juryName) => api.get(`/api/marks/track/${trackId}/jury/${encodeURIComponent(juryName)}`),
  getAll: (params = {}) => api.get(`/api/marks/all${buildQuery(params)}`),
  getLeaderboard: (params = {}) => api.get(`/api/marks/leaderboard${buildQuery(params)}`),
  getStatus: (params = {}) => api.get(`/api/marks/status${buildQuery(params)}`),
};

// Export
export const exportAPI = {
  juryExcel: (trackId, juryName) => {
    const query = buildQuery({ trackId });
    window.open(`${API_BASE_URL}/api/export/jury/${encodeURIComponent(juryName)}${query}`, '_blank');
  },
  leaderboardExcel: (trackId) => {
    const query = buildQuery({ trackId });
    window.open(`${API_BASE_URL}/api/export/leaderboard${query}`, '_blank');
  },
};

// Config
export const configAPI = {
  get: () => api.get('/api/config'),
  update: (data) => api.post('/api/config', data),
  reset: () => api.post('/api/config/reset'),
};

const API_BASE = '/api/config';

// After
export const getCriteria = () => api.get('/api/config/criteria');
export const addCriteria = (criterion) => api.post('/api/config/criteria', { criterion });
export const removeCriteria = (index) => api.delete('/api/config/criteria', { data: { index } });


export default api;
