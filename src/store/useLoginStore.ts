import { create } from 'zustand';
import AuthService from '../api/services/auth.service';
import { useAuthStore } from './useAuthStore';

interface LoginState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  // Informational message shown above the form (e.g. redirected from signup).
  notice: string | null;
  setNotice: (value: string | null) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  resetForm: () => void;
  login: () => Promise<void>;
}

// The API answers a wrong email/password with a 400 validation_error whose
// errors[] carries code "invalid_credentials"; other failures use their detail.
function loginErrorMessage(error: any): string {
  const data = error?.response?.data;
  const errors: { code?: string; detail?: string }[] = Array.isArray(data?.errors) ? data.errors : [];
  if (errors.some((e) => e.code === 'invalid_credentials')) return 'Invalid credentials';
  if (error?.request && !error.response) return 'Connection failed. Please check your internet connection.';
  return errors.find((e) => e.detail)?.detail || data?.detail || data?.message || 'Login failed. Please try again.';
}

export const useLoginStore = create<LoginState>((set, get) => ({
  email: '',
  password: '',
  isLoading: false,
  error: null,
  notice: null,
  setNotice: (value) => set({ notice: value }),
  setEmail: (value) => set({ email: value }),
  setPassword: (value) => set({ password: value }),
  resetForm: () => set({ email: '', password: '', isLoading: false, error: null, notice: null }),
  login: async () => {
    const { email, password } = get();
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.login({
        email_phonenumber: email,
        password,
        email,
      });
      console.log({response})
      const token = response.access || response.token;
      const refreshToken = response.refresh;
      const user = response.user || { email };

      if (token) {
        useAuthStore.getState().setAuth(token, user, refreshToken, response.loan_amount);
      } else {
        throw new Error('No token received');
      }
    } catch (error: any) {
      set({ error: loginErrorMessage(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
