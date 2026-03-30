import { create } from 'zustand';
import KycService from '../api/services/kyc.service';
import type { SmileIdConfig } from '../api/services/kyc.service';

interface KYCState {
  currentStep: number;
  bvn: string;
  isBvnVerified: boolean;
  nextOfKin: {
    firstName: string;
    lastName: string;
    phone: string;
    relation: string;
  };
  employment: {
    status: string;
    workPlace: string;
    sector: string;
    industry: string;
    monthlyIncome: string;
    payDay: string;
    state: string;
    sourceOfIncome: string;
    workEmail: string;
    paidByCompany: boolean | null;
  };
  pep: {
    isPep: string;
  };
  bank: {
    bankName: string;
    accountNumber: string;
    phone: string;
    bankCode: string;
  };
  pin: string;
  confirmPin: string;
  isKYCComplete: boolean;
  smileIdConfig: SmileIdConfig | null;
  isLoading: boolean;
  error: string | null;
  setBvn: (value: string) => void;
  setNextOfKinField: (field: keyof KYCState['nextOfKin'], value: string) => void;
  setEmploymentField: (field: keyof KYCState['employment'], value: any) => void;
  setPepField: (field: keyof KYCState['pep'], value: string) => void;
  setBankField: (field: keyof KYCState['bank'], value: string) => void;
  setPin: (value: string) => void;
  setConfirmPin: (value: string) => void;
  setKYCComplete: (value: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetKYC: () => void;
  verifyBvn: () => Promise<any>;
  submitKyc: () => Promise<void>;
  createTransactionPin: () => Promise<void>;
}

export const useKYCStore = create<KYCState>((set, get) => ({
  currentStep: 1,
  bvn: '',
  isBvnVerified: false,
  nextOfKin: {
    firstName: '',
    lastName: '',
    phone: '',
    relation: '',
  },
  employment: {
    status: '',
    workPlace: '',
    sector: '',
    industry: '',
    monthlyIncome: '',
    payDay: '',
    state: '',
    sourceOfIncome: '',
    workEmail: '',
    paidByCompany: null,
  },
  pep: {
    isPep: '',
  },
  bank: {
    bankName: '',
    accountNumber: '',
    phone: '',
    bankCode: '',
  },
  pin: '',
  confirmPin: '',
  isKYCComplete: false,
  smileIdConfig: null,
  isLoading: false,
  error: null,
  setBvn: (value) => set({ bvn: value }),
  setNextOfKinField: (field, value) => 
    set((state) => ({ 
      nextOfKin: { ...state.nextOfKin, [field]: value } 
    })),
  setEmploymentField: (field, value) =>
    set((state) => ({
      employment: { ...state.employment, [field]: value }
    })),
  setPepField: (field, value) =>
    set((state) => ({
      pep: { ...state.pep, [field]: value }
    })),
  setBankField: (field, value) =>
    set((state) => ({
      bank: { ...state.bank, [field]: value }
    })),
  setPin: (value) => set({ pin: value }),
  setConfirmPin: (value) => set({ confirmPin: value }),
  setKYCComplete: (value) => set({ isKYCComplete: value }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 7) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  resetKYC: () => set({ 
    currentStep: 1, 
    bvn: '', 
    isBvnVerified: false,
    nextOfKin: {
      firstName: '',
      lastName: '',
      phone: '',
      relation: '',
    },
    employment: {
      status: '',
      workPlace: '',
      sector: '',
      industry: '',
      monthlyIncome: '',
      payDay: '',
      state: '',
      sourceOfIncome: '',
      workEmail: '',
      paidByCompany: null,
    },
    pep: {
      isPep: '',
    },
    bank: {
      bankName: '',
      accountNumber: '',
      phone: '',
      bankCode: '',
    },
    pin: '',
    confirmPin: '',
    isKYCComplete: false,
    isLoading: false,
    error: null,
  }),
  verifyBvn: async () => {
    const { bvn } = get();
    set({ isLoading: true, error: null });
    try {
      const config = await KycService.verifySmileId({
        verification_type: 'BVN',
        type_value: bvn,
      });
      set({ isBvnVerified: true, smileIdConfig: config });
      return config;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'BVN verification failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  submitKyc: async () => {
    const { nextOfKin, employment, pep, bank } = get();
    set({ isLoading: true, error: null });
    try {
      // Assuming a unified submission or sequential calls
      // TODO: Replace with actual KYC submission endpoint when available
      console.log('KYC data to submit:', { nextOfKin, employment, pep, bank });
      // Further logic if needed
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'KYC submission failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  createTransactionPin: async () => {
    const { pin } = get();
    set({ isLoading: true, error: null });
    try {
      await KycService.createTransactionPin(pin);
      set({ isKYCComplete: true });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'PIN creation failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
