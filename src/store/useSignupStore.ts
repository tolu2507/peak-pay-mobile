import { create } from 'zustand';
import AuthService from '../api/services/auth.service';
import type { SecurityQuestion } from '../api/services/kyc.service';
import KycService from '../api/services/kyc.service';
import OtpService from '../api/services/otp.service';

interface SignupState {
  form: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
    referralCode: string;
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
  lastName: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  referralCode: '',
  securityQuestion1: '',
  securityAnswer1: '',
  securityQuestion2: '',
  securityAnswer2: '',
  securityQuestion1Id: '',
  securityQuestion2Id: '',
};

export const useSignupStore = create<SignupState>((set, get) => ({
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
      console.log('response', response)
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
        last_name: form.lastName,
        email: form.email,
        phone_number: form.phone,
        password: form.password,
        terms: agreedTerms,
        privacy: agreedPrivacy,
        ...(form.referralCode ? { referral_code: form.referralCode } : {}),
      });
      return response;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Registration failed' });
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
}));
