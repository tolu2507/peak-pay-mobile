import { create } from 'zustand';
import LoanService from '../api/services/loan.service';

interface LoanState {
  currentStep: number;
  loanDetails: {
    purpose: string;
    amount: string;
    duration: string;
  };
  address: {
    houseNumber: string;
    houseAddress: string;
    landmark: string;
    state: string;
    lga: string;
    city: string;
    maritalStatus: string;
  };
  isApplied: boolean;
  status: 'idle' | 'applied' | 'approved' | 'rejected';
  appliedAmount: string;
  isLoading: boolean;
  error: string | null;
  setLoanField: (field: keyof LoanState['loanDetails'], value: string) => void;
  setAddressField: (field: keyof LoanState['address'], value: string) => void;
  setApplied: (amount: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetLoan: () => void;
  applyLoan: () => Promise<void>;
}

export const useLoanStore = create<LoanState>((set, get) => ({
  currentStep: 1,
  loanDetails: {
    purpose: '',
    amount: '',
    duration: '',
  },
  address: {
    houseNumber: '',
    houseAddress: '',
    landmark: '',
    state: '',
    lga: '',
    city: '',
    maritalStatus: '',
  },
  isApplied: false,
  status: 'idle',
  appliedAmount: '',
  isLoading: false,
  error: null,
  setLoanField: (field, value) =>
    set((state) => ({
      loanDetails: { ...state.loanDetails, [field]: value }
    })),
  setAddressField: (field, value) =>
    set((state) => ({
      address: { ...state.address, [field]: value }
    })),
  setApplied: (amount) => set({ isApplied: true, status: 'applied', appliedAmount: amount }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 7) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  resetLoan: () => set({
    currentStep: 1,
    loanDetails: {
      purpose: '',
      amount: '',
      duration: '',
    },
    address: {
      houseNumber: '',
      houseAddress: '',
      landmark: '',
      state: '',
      lga: '',
      city: '',
      maritalStatus: '',
    },
    isApplied: false,
    status: 'idle',
    appliedAmount: '',
    isLoading: false,
    error: null,
  }),
  applyLoan: async () => {
    const { loanDetails, address } = get();
    set({ isLoading: true, error: null });
    try {
      await LoanService.apply({
        amount: Number(loanDetails.amount),
        duration: Number(loanDetails.duration),
        purpose: loanDetails.purpose,
        address: {
          houseNumber: address.houseNumber,
          street: address.houseAddress,
          landmark: address.landmark,
          city: address.city,
          state: address.state,
          lga: address.lga,
        },
      });
      set({ isApplied: true, status: 'applied', appliedAmount: loanDetails.amount });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Loan application failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
