import { create } from 'zustand';
import { Toast } from '@/shared/ui/molecules/Toast';

interface GlobalState {
  isErrorModalVisible: boolean;
  errorMessage: string;
  isSuccessModalVisible: boolean;
  successMessage: string;
  isConnected: boolean;
  showError: (message: string) => void;
  hideError: () => void;
  showSuccess: (message: string) => void;
  hideSuccess: () => void;
  setConnected: (connected: boolean) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  isErrorModalVisible: false,
  errorMessage: '',
  isSuccessModalVisible: false,
  successMessage: '',
  isConnected: true,
  showError: (message) => {
    set({ isErrorModalVisible: true, errorMessage: message });
    Toast.show(message, { type: 'error', position: "top", backgroundColor: "#FF3B30" });
  },
  hideError: () => set({ isErrorModalVisible: false, errorMessage: '' }),
  showSuccess: (message) => {
    set({ isSuccessModalVisible: true, successMessage: message });
    Toast.show(message, { type: 'success', position: "top", backgroundColor: "#1E9F85" });
  },
  hideSuccess: () => set({ isSuccessModalVisible: false, successMessage: '' }),
  setConnected: (connected) => set({ isConnected: connected }),
}));
