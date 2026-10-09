import axios, { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useGlobalStore } from '../store/useGlobalStore';

declare module 'axios' {
  interface AxiosRequestConfig {
    // Set when the caller shows the error itself, e.g. inline under a field.
    skipErrorToast?: boolean;
  }
}

// The web app reaches the backend through a Next.js proxy at /api; the app
// calls it directly. Set EXPO_PUBLIC_API_URL to point at another backend.
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://peakpay-backend-dev.up.railway.app/api').replace(/\/+$/, '');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 35000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

let refreshRequest: Promise<string> | null = null;
type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

async function refreshAccessToken() {
  const session = useAuthStore.getState();
  if (!session.refreshToken) throw new Error('Session expired. Please log in again.');
  if (!refreshRequest) {
    refreshRequest = axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: session.refreshToken }, { timeout: 15000 })
      .then(({ data }) => {
        if (!data.access || typeof data.access !== 'string') throw new Error('Invalid refresh response');
        if (useAuthStore.getState().refreshToken !== session.refreshToken) throw new Error('Session changed');
        useAuthStore.getState().setAuth(data.access, session.user, data.refresh || session.refreshToken);
        return data.access as string;
      }).finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}

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
  async (error) => {
    // A request the caller cancelled (e.g. a superseded lookup) isn't an error.
    if (axios.isCancel(error)) return Promise.reject(error);
    const { showError } = useGlobalStore.getState();
    const config = error.config as RetryConfig | undefined;
    const isAuthEndpoint = config?.url?.startsWith('/auth/') && !config.url.includes('/profile/');
    if (error.response?.status === 401 && config && !isAuthEndpoint && !config._retried) {
      config._retried = true;
      try {
        const current = useAuthStore.getState().token;
        const token = current && config.headers.Authorization !== `Bearer ${current}`
          ? current : await refreshAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return apiClient(config);
      } catch (refreshError) {
        // A connection failure must not destroy a valid refresh token. Any server
        // rejection of the refresh falls through and ends the session below.
        if (axios.isAxiosError(refreshError) && !refreshError.response) {
          error.message = 'Unable to restore your session. Please try again.';
          showError(error.message);
          return Promise.reject(error);
        }
      }
    }

    let message = 'An unexpected error occurred. Please try again.';
    let action: (() => void) | undefined;

    if (error.response) {
      // Server responded with a status code outside the 2xx range
      
      let parsedMessage = '';
      if (Array.isArray(error.response?.data?.errors)) {
        parsedMessage = error.response.data.errors.map((e: any) => `${e.attr ? e.attr + ': ' : ''}${e.detail || e.message}`).join(' | ');
      } else if (error.response?.data?.detail) {
        parsedMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        parsedMessage = error.response.data.message;
      } else if (typeof error.response?.data === 'string' && !/^\s*(?:<!doctype\s+html|<html\b)/i.test(error.response.data)) {
        parsedMessage = error.response.data;
      }

      message = parsedMessage || 'An unexpected error occurred. Please try again.';

      if (error.response.status === 400) {
        if (error.response?.data?.type === 'validation_error') {
          console.log(error.response.status, error.response.data.type)
          //pass action to the dissmiss button, so if user click the dissmissmiss button it send them otp code and the user see the verify.tsx page so he or she can verify.
          let email = '';
          try {
            if (error.config?.data) {
              const reqData = JSON.parse(error.config.data);
              email = reqData.email || reqData.email_phonenumber || '';
              console.log('Extracted email:', email);
            }
          } catch (e) {
            console.log('Failed to parse config data:', e);
          }

          if (email) {
            console.log('Assigning errorAction for validation_error with email:', email);
            action = () => {
              console.log('Dismiss action triggered! Sending OTP for:', email);
              const { useSignupStore } = require('../store/useSignupStore');
              useSignupStore.getState().setFormField('email', email);

              apiClient.post('/otp/send-otp/', {
                otp_type: 'email',
                otp_action_type: 'registration',
                identifier: email
              }).then((res) => {
                console.log('OTP sent successfully on dismiss:', res.data);
                const { router } = require('expo-router');
                router.push('/(auth)/verify');
              }).catch(err => {
                console.log('Failed to send OTP on dismiss:', err.response?.data || err.message);
              });
            };
          } else {
            console.log('No email found to assign errorAction');
          }
        }
      }

      if (error.response.status === 401 && !isAuthEndpoint) {
        useAuthStore.getState().clearSession();
        message = 'Session expired. Please log in again.';
      }
    } else if (error.request) {
      // Request was made but no response was received
      message = 'Connection timed out. Please check your internet connection.';
    } else {
      // Something happened in setting up the request
      message = error.message;
    }
    console.log({ message })
    if (!config?.skipErrorToast) showError(message, action);
    error.message = message;
    return Promise.reject(error);
  }
);

export default apiClient;
