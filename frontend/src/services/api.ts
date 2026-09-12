import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://nexa-health-ai-1-ls8m.onrender.com/api',
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

    return response;
  },
  (error) => {
    // If an error is caught but the frontend component expects an array, returning a rejected promise
    // might still crash if not caught locally. However, standard Axios behavior is to reject.
    return Promise.reject(error);
  }
);

export default api;
