import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // If it's empty, or a relative path (starts with /), force the absolute production URL
  if (!envUrl || envUrl.trim() === '' || envUrl.startsWith('/')) {
    return 'https://nexa-health-ai-1-ls8m.onrender.com/api';
  }
  return envUrl;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
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

// Global Response Interceptor
api.interceptors.response.use(
  (response) => {
    let data = response.data;

    // 1. Safely handle empty, null, or undefined responses
    if (data === null || data === undefined || data === '') {
      response.data = [];
      return response;
    }

    // 2. Safely handle HTML fallback responses from proxies (like Vercel SPA routing)
    if (typeof data === 'string' && data.trim().toLowerCase().startsWith('<!doctype html>')) {
      return Promise.reject(new Error('API Route not found: Received HTML fallback instead of JSON API response'));
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
