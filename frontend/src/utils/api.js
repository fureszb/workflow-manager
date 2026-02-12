import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors (no response from server)
    if (!error.response) {
      toast.error('Hálózati hiba - a szerver nem elérhető');
      return Promise.reject(error);
    }

    // Handle specific HTTP status codes
    const status = error.response.status;

    if (status === 401) {
      // Unauthorized - could redirect to login
      console.error('Unauthorized access');
    } else if (status === 403) {
      toast.error('Hozzáférés megtagadva');
    } else if (status === 500) {
      toast.error('Szerverhiba történt');
    } else if (status === 502 || status === 503 || status === 504) {
      toast.error('A szerver jelenleg nem elérhető');
    }

    return Promise.reject(error);
  }
);

export default api;
