import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../api/services/auth.service';
import type { SecurityQuestion } from '../api/services/kyc.service';
import KycService from '../api/services/kyc.service';
import OtpService from '../api/services/otp.service';

interface SignupState {
  form: {
    firstName: string;
    middleName: string;
    lastName: string;
    // Collected at signup on mobile; verified later in the KYC phone step.
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
    referralCode: string;
    howDidYouHear: string;
    securityQuestion1: string;
    securityAnswer1: string;
    securityQuestion2: string;
    securityAnswer2: string;
    // Store the question ID separately for API submission
    securityQuestion1Id: string;
    securityQuestion2Id: string;
  };
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  isLoading: boolean;
  error: string | null;
  securityQuestionsList: SecurityQuestion[];
  setFormField: (field: keyof SignupState['form'], value: string) => void;
  setAgreedTerms: (value: boolean) => void;
  setAgreedPrivacy: (value: boolean) => void;
  resetForm: () => void;
  sendOtp: () => Promise<any>;
  verifyOtp: (otpCode: string) => Promise<any>;
  register: () => Promise<any>;
  fetchSecurityQuestions: () => Promise<void>;
  answerSecurityQuestions: () => Promise<any>;
}

const initialForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  referralCode: '',
  howDidYouHear: '',
  securityQuestion1: '',
  securityAnswer1: '',
  securityQuestion2: '',
  securityAnswer2: '',
  securityQuestion1Id: '',
  securityQuestion2Id: '',
};

export const useSignupStore = create<SignupState>()(
  persist(
  (set, get) => ({
  form: { ...initialForm },
  agreedTerms: false,
  agreedPrivacy: false,
  isLoading: false,
  error: null,
  securityQuestionsList: [],
  setFormField: (field, value) =>
    set((state) => ({
      form: { ...state.form, [field]: value }
    })),
  setAgreedTerms: (value) => set({ agreedTerms: value }),
  setAgreedPrivacy: (value) => set({ agreedPrivacy: value }),
  resetForm: () => set({
    form: { ...initialForm },
    agreedTerms: false,
    agreedPrivacy: false,
    isLoading: false,
    error: null,
    securityQuestionsList: [],
  }),

  // Step 1: Send OTP to user's email after filling signup form
  sendOtp: async () => {
    const { form } = get();
    set({ isLoading: true, error: null });
    try {
      const response = await OtpService.sendOtp({
        otp_type: 'email',
        otp_action_type: 'registration',
        identifier: form.email,
      });
      console.log(response)
      return response;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to send OTP' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Step 2: Verify OTP code
  verifyOtp: async (otpCode: string) => {
    const { form } = get();
    set({ isLoading: true, error: null });
    try {
      const response = await OtpService.verifyOtp({
        identifier: form.email,
        otp_code: otpCode,
        // Lets a retried signup of an unverified account use the new password.
        ...(form.password ? { password: form.password } : {}),
      });
      return response;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'OTP verification failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Step 3: Register user (called after password creation)
  register: async () => {
    const { form, agreedTerms, agreedPrivacy } = get();
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.register({
        first_name: form.firstName,
        middle_name: form.middleName.trim() || null,
        last_name: form.lastName,
        email: form.email,
        password: form.password,
        terms: agreedTerms,
        privacy: agreedPrivacy,
        how_did_you_hear: form.howDidYouHear,
        ...(form.referralCode ? { referral_code: form.referralCode } : {}),
      });
      return response;
    } catch (error: any) {
      let parsedMessage = '';
      if (Array.isArray(error.response?.data?.errors)) {
        parsedMessage = error.response.data.errors.map((e: any) => `${e.attr ? e.attr + ': ' : ''}${e.detail || e.message}`).join(' | ');
      } else if (error.response?.data?.detail) {
        parsedMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        parsedMessage = error.response.data.message;
      } else if (typeof error.response?.data === 'string') {
        parsedMessage = error.response.data;
      }
      
      const errorMessage = parsedMessage || 'Registration failed';
      set({ error: errorMessage });

      if (
        error.response?.status === 400 && 
        error.response?.data?.type === 'validation_error' && 
        errorMessage.toLowerCase().includes('already exists')
      ) {
        // Existing account: unverified users get a fresh code and go to the
        // verify screen; verified users are sent to log in instead.
        try {
          const { default: apiClient } = await import('../api/client');
          await apiClient.post('/otp/send-otp/', {
            otp_type: 'email',
            otp_action_type: 'registration',
            identifier: form.email
          });
          set({ error: null });
          return { requiresOtpVerification: true };
        } catch (otpErr: any) {
          const alreadyVerified = otpErr.response?.data?.errors?.some(
            (e: any) => e.code === 'user_already_verified',
          );
          if (alreadyVerified) {
            set({ error: null });
            return { alreadyVerified: true };
          }
          console.error("Failed to send OTP to existing user", otpErr);
        }
      }
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Step 4a: Fetch security questions list
  fetchSecurityQuestions: async () => {
    set({ isLoading: true, error: null });
    try {
      const questions = await KycService.getSecurityQuestions();
      set({ securityQuestionsList: Array.isArray(questions) && questions.length > 0 ? questions : [] });
    } catch (error: any) {
      // If fetch fails, we'll fallback to hardcoded questions in the UI
      set({ securityQuestionsList: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  // Step 4b: Submit security question answers
  answerSecurityQuestions: async () => {
    const { form } = get();
    set({ isLoading: true, error: null });
    try {
      const response = await KycService.answerSecurityQuestions({
        security_question_1: form.securityQuestion1Id || form.securityQuestion1,
        security_answer_1: form.securityAnswer1,
        security_question_2: form.securityQuestion2Id || form.securityQuestion2,
        security_answer_2: form.securityAnswer2,
      });
      return response;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to submit security questions' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}),
  {
    // Survive the app closing between signup steps (e.g. while fetching the OTP).
    // Only non-secret identity fields are stored; passwords stay in memory.
    name: 'signup-storage',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      form: {
        firstName: state.form.firstName,
        middleName: state.form.middleName,
        lastName: state.form.lastName,
        phone: state.form.phone,
        email: state.form.email,
        referralCode: state.form.referralCode,
      },
    }),
    merge: (persisted, current) => ({
      ...current,
      form: { ...current.form, ...(persisted as Partial<SignupState>)?.form },
    }),
  },
  ),
);
