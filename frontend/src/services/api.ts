import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach the current simulated role/user from localStorage
api.interceptors.request.use((config) => {
  const activeRole = localStorage.getItem('nexa_active_role');
  const activeUserId = localStorage.getItem('nexa_active_user_id');

  if (activeRole) {
    config.headers['x-user-role'] = activeRole;
  }
  if (activeUserId) {
    config.headers['x-user-id'] = activeUserId;
  }

  return config;
});

export default api;
