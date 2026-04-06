import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../api/services/auth.service';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: any | null;
  loanAmount: number;
  isAuthenticated: boolean;
  setAuth: (token: string, user: any, refreshToken?: string, loanAmount?: number) => void;
  setLoanAmount: (amount: number) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      loanAmount: 0,
      isAuthenticated: false,
      setAuth: (token, user, refreshToken, loanAmount) => set({ 
        token, 
        user, 
        isAuthenticated: true,
        ...(refreshToken ? { refreshToken } : {}),
        ...(loanAmount !== undefined ? { loanAmount } : {}),
      }),
      setLoanAmount: (amount) => set({ loanAmount: amount }),
      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await AuthService.logout({ refresh: refreshToken });
          }
        } catch (error) {
          // Still clear local state even if API call fails
        } finally {
          set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
