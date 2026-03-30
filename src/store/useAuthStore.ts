import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../api/services/auth.service';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: any | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: any, refreshToken?: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user, refreshToken) => set({ 
        token, 
        user, 
        isAuthenticated: true,
        ...(refreshToken ? { refreshToken } : {}),
      }),
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
