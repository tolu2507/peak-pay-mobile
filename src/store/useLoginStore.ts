import { create } from 'zustand';
import AuthService from '../api/services/auth.service';
import { useAuthStore } from './useAuthStore';

interface LoginState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  resetForm: () => void;
  login: () => Promise<void>;
}

export const useLoginStore = create<LoginState>((set, get) => ({
  email: '',
  password: '',
  isLoading: false,
  error: null,
  setEmail: (value) => set({ email: value }),
  setPassword: (value) => set({ password: value }),
  resetForm: () => set({ email: '', password: '', isLoading: false, error: null }),
  login: async () => {
    const { email, password } = get();
    console.log({ email, password })
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
      const loanAmount = response.loan_amount;
      const user = response.user || { email };

      if (token) {
        useAuthStore.getState().setAuth(token, user, refreshToken, loanAmount);
      } else {
        throw new Error('No token received');
      }
    } catch (error: any) {
      console.log(error.response.data.errors[0].detail)
      set({ error: error.response?.data?.errors[0].detail || 'Login failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
