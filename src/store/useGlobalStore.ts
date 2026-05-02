import { create } from 'zustand';
import { Toast } from '@/shared/ui/molecules/Toast';

interface GlobalState {
  isErrorModalVisible: boolean;
  errorMessage: string;
  isSuccessModalVisible: boolean;
  successMessage: string;
  isConnected: boolean;
  errorAction?: () => void;
  showError: (message: string, action?: () => void) => void;
  hideError: () => void;
  showSuccess: (message: string) => void;
  hideSuccess: () => void;
  setConnected: (connected: boolean) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  isErrorModalVisible: false,
  errorMessage: '',
  errorAction: undefined,
  isSuccessModalVisible: false,
  successMessage: '',
  isConnected: true,
  showError: (message, action) => {
    set({ isErrorModalVisible: true, errorMessage: message, errorAction: action });
    Toast.show(message, { type: 'error', position: "top", backgroundColor: "#FF3B30" });
  },
  hideError: () => set({ isErrorModalVisible: false, errorMessage: '', errorAction: undefined }),
  showSuccess: (message) => {
    set({ isSuccessModalVisible: true, successMessage: message });
    Toast.show(message, { type: 'success', position: "top", backgroundColor: "#1E9F85" });
  },
  hideSuccess: () => set({ isSuccessModalVisible: false, successMessage: '' }),
  setConnected: (connected) => set({ isConnected: connected }),
}));
