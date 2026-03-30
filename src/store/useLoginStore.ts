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
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.login({
        email_phonenumber: email,
        password,
        email,
      });
      const token = response.access || response.token;
      const refreshToken = response.refresh;
      const user = response.user || { email };
      
      if (token) {
        useAuthStore.getState().setAuth(token, user, refreshToken);
      } else {
        throw new Error('No token received');
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Login failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
