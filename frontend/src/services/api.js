import axios from 'axios';

// Helper function to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Create an Axios instance with base configuration
const api = axios.create({
  // Use relative path in production, but keep full URL for development
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/' : 'http://127.0.0.1:8000/api/'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // Add auth token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    // Add CSRF token for non-GET requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Token is invalid or expired, redirect to login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('authToken');
        // Using window.location instead of navigate() because this interceptor
        // runs outside React Router context and needs to work globally
        window.location.href = '/login';
      }
    }
    // Handle errors globally
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Date price overrides API
export const datePriceOverrides = {
  list: (params) => api.get('/date-price-overrides/', { params }),
  create: (data) => api.post('/date-price-overrides/', data),
  bulkCreate: (data) => api.post('/date-price-overrides/bulk_create/', data),
  bulkDelete: (data) => api.post('/date-price-overrides/bulk_delete/', data),
  update: (id, data) => api.put(`/date-price-overrides/${id}/`, data),
  delete: (id) => api.delete(`/date-price-overrides/${id}/`),
};

// Date packages API
export const datePackages = {
  list: (params) => api.get('/date-packages/', { params }),
  create: (data) => api.post('/date-packages/', data),
  bulkCreate: (data) => api.post('/date-packages/bulk_create/', data),
  bulkDelete: (data) => api.post('/date-packages/bulk_delete/', data),
  update: (id, data) => api.put(`/date-packages/${id}/`, data),
  delete: (id) => api.delete(`/date-packages/${id}/`),
};

export default api;
