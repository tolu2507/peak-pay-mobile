import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useGlobalStore } from '../store/useGlobalStore';

const apiClient = axios.create({
  baseURL: 'https://peakpay-backend-dev.up.railway.app/api',
  timeout: 35000,
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
    let action: (() => void) | undefined;

    if (error.response) {
      // Server responded with a status code outside the 2xx range
      console.log({ error })
      console.log({ errors: error.response?.data })
      const data = error.response?.data?.errors[0].detail;
      message = data;

      if (error.response.status === 400) {
        if (error.response?.data?.type === 'validation_error') {
          console.log(error.response.status, error.response.data.type)
          //pass action to the dissmiss button, so if user click the dissmissmiss button it send them otp code and the user see the verify.tsx page so he or she can verify.
          let email = '';
          try {
            console.log('error.config.data:', error.config?.data);
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

      if (error.response.status === 401) {
        logout();
        message = 'Session expired. Please log in again.';
      }
    } else if (error.request) {
      // Request was made but no response was received
      message = 'Connection timed out. Please check your internet connection.';
    } else {
      // Something happened in setting up the request
      console.log({ errorss: error })
      console.log({ errorss: error.response?.data?.errors[0].detail })
      message = error.message;
    }
    console.log({ message })
    showError(message, action);
    return Promise.reject(error);
  }
);

export default apiClient;
