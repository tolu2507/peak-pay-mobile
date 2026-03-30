import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useGlobalStore } from '../store/useGlobalStore';

const apiClient = axios.create({
  baseURL: 'https://peakpay-backend-dev.up.railway.app/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { showError } = useGlobalStore.getState();
    const { logout } = useAuthStore.getState();

    let message = 'An unexpected error occurred. Please try again.';

    if (error.response) {
      // Server responded with a status code outside the 2xx range
      const data = error.response.data;
      message = data?.message || data?.error || `Error: ${error.response.status}`;
      
      if (error.response.status === 401) {
        logout();
        message = 'Session expired. Please log in again.';
      }
    } else if (error.request) {
      // Request was made but no response was received
      message = 'Connection timed out. Please check your internet connection.';
    } else {
      // Something happened in setting up the request
      message = error.message;
    }

    showError(message);
    return Promise.reject(error);
  }
);

export default apiClient;
