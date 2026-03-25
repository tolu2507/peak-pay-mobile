import { create } from 'zustand';
import AuthService from '../api/services/auth.service';

interface SignupState {
  form: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
    securityQuestion1: string;
    securityAnswer1: string;
    securityQuestion2: string;
    securityAnswer2: string;
  };
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  isLoading: boolean;
  error: string | null;
  setFormField: (field: keyof SignupState['form'], value: string) => void;
  setAgreedTerms: (value: boolean) => void;
  setAgreedPrivacy: (value: boolean) => void;
  resetForm: () => void;
  register: () => Promise<void>;
}

export const useSignupStore = create<SignupState>((set, get) => ({
  form: {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    securityQuestion1: '',
    securityAnswer1: '',
    securityQuestion2: '',
    securityAnswer2: '',
  },
  agreedTerms: false,
  agreedPrivacy: false,
  isLoading: false,
  error: null,
  setFormField: (field, value) => 
    set((state) => ({ 
      form: { ...state.form, [field]: value } 
    })),
  setAgreedTerms: (value) => set({ agreedTerms: value }),
  setAgreedPrivacy: (value) => set({ agreedPrivacy: value }),
  resetForm: () => set({
    form: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      securityQuestion1: '',
      securityAnswer1: '',
      securityQuestion2: '',
      securityAnswer2: '',
    },
    agreedTerms: false,
    agreedPrivacy: false,
    isLoading: false,
    error: null,
  }),
  register: async () => {
    const { form, agreedTerms } = get();
    set({ isLoading: true, error: null });
    try {
      await AuthService.register({
        email: form.email,
        first_name: form.firstName,
        last_name: form.lastName,
        password: form.password,
        phone_number: form.phone,
        terms: agreedTerms,
        security_question_1: form.securityQuestion1,
        security_answer_1: form.securityAnswer1,
        security_question_2: form.securityQuestion2,
        security_answer_2: form.securityAnswer2,
      });
      // Handle success (e.g., navigate or show success message)
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Registration failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
