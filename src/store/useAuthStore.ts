import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../api/services/auth.service';
import { useKYCStore } from './useKYCStore';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: any | null;
  loanAmount: number;
  isAuthenticated: boolean;
  setAuth: (token: string, user: any, refreshToken?: string, loanAmount?: number) => void;
  setLoanAmount: (amount: number) => void;
  logout: () => Promise<void>;
  clearSession: () => void;
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
        refreshToken: refreshToken || null,
        ...(loanAmount !== undefined ? { loanAmount } : {}),
      }),
      setLoanAmount: (amount) => set({ loanAmount: amount }),
      clearSession: () => {
        // The KYC store isn't persisted, but must not leak to the next user.
        useKYCStore.getState().resetKYC();
        set({ token: null, refreshToken: null, user: null, loanAmount: 0, isAuthenticated: false });
      },
      logout: async () => {
        const { refreshToken } = get();
        get().clearSession();
        try {
          if (refreshToken) {
            await AuthService.logout({ refresh: refreshToken });
          }
        } catch (error) {
          // Still clear local state even if API call fails
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
