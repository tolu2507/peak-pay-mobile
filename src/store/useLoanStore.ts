import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import LoanService, {
  AddressVerification,
  LoanApplication,
  LoanEligibility,
  LoanQuote,
  LoanReason,
  LoanRequest,
  LoanTenor,
  UploadFile,
  UtilityBillType,
} from '../api/services/loan.service';

export type LoanStep = 'request' | 'summary' | 'address' | 'statement';
type DashboardLoanStatus = 'idle' | 'applied' | 'approved' | 'rejected';

interface AddressForm {
  houseNumber: string;
  houseAddress: string;
  landmark: string;
  state: string;
  lga: string;
  city: string;
  billType: UtilityBillType | '';
}

interface LoanState {
  // Whose draft this is; a different user starts with an empty one.
  ownerId: string | null;
  prepareDraft: (ownerId: string | null) => void;
  step: LoanStep;
  loanDetails: {
    // The id of the chosen LoanReason.
    purpose: string;
    // Whole naira, digits only.
    amount: string;
    // Months, as a string for the select.
    duration: string;
  };
  address: AddressForm;
  reasons: LoanReason[];
  tenors: LoanTenor[];
  quote: LoanQuote | null;
  currentAddress: AddressVerification | null;
  application: LoanApplication | null;
  eligibility: LoanEligibility | null;
  isApplied: boolean;
  status: DashboardLoanStatus;
  appliedAmount: string;
  isLoading: boolean;
  isQuoting: boolean;
  error: string | null;
  // Backend field name -> message, shown under the matching input.
  fieldErrors: Record<string, string>;
  setStep: (step: LoanStep) => void;
  setLoanField: (field: keyof LoanState['loanDetails'], value: string) => void;
  setAddressField: (field: keyof AddressForm, value: string) => void;
  setApplied: (amount: string) => void;
  setStatus: (status: DashboardLoanStatus) => void;
  resetLoan: () => void;
  loadOptions: () => Promise<void>;
  getQuote: () => Promise<LoanQuote>;
  getEligibility: () => Promise<LoanEligibility>;
  loadCurrentAddress: () => Promise<AddressVerification | null>;
  submitAddress: (utilityBill: UploadFile) => Promise<void>;
  submitEligibilityAssessment: () => Promise<void>;
  applyLoan: () => Promise<void>;
  fetchLatestApplication: () => Promise<void>;
}

const emptyLoanDetails = { purpose: '', amount: '', duration: '' };
const emptyAddress: AddressForm = {
  houseNumber: '',
  houseAddress: '',
  landmark: '',
  state: '',
  lga: '',
  city: '',
  billType: '',
};

const DASHBOARD_STATUS: Record<LoanApplication['status'], DashboardLoanStatus> = {
  pending: 'applied',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'idle',
};

const GENERIC_ERROR = 'Something went wrong. Please try again.';

type ApiErrorItem = { attr?: string | null; detail?: string; message?: string };
type ApiErrorBody = { errors?: ApiErrorItem[]; detail?: string; message?: string };

export function parseLoanError(error: unknown): { message: string | null; fields: Record<string, string> } {
  const failure = error as { message?: string; response?: { data?: ApiErrorBody } } | null;
  const data = failure?.response?.data;
  const fields: Record<string, string> = {};
  const general: string[] = [];
  if (Array.isArray(data?.errors)) {
    for (const item of data.errors) {
      const detail = item.detail || item.message;
      if (!detail) continue;
      if (item.attr && item.attr !== 'non_field_errors') {
        fields[item.attr] = fields[item.attr] || detail;
      } else {
        general.push(detail);
      }
    }
  } else if (data?.detail || data?.message) {
    general.push((data.detail || data.message) as string);
  }
  const message = general.join(' ') || (Object.keys(fields).length ? null : failure?.message || GENERIC_ERROR);
  return { message, fields };
}

const toRequest = (details: LoanState['loanDetails']): LoanRequest => ({
  amount: details.amount,
  loan_reason: details.purpose,
  duration_in_months: Number(details.duration),
});

export const useLoanStore = create<LoanState>()(persist((set, get) => {
  // Runs an API action with the shared loading and error state.
  const run = async <T>(action: () => Promise<T>): Promise<T> => {
    set({ isLoading: true, error: null, fieldErrors: {} });
    try {
      return await action();
    } catch (error) {
      const { message, fields } = parseLoanError(error);
      set({ error: message, fieldErrors: fields });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  };

  return {
    ownerId: null,
    prepareDraft: (ownerId) => {
      if (get().ownerId !== ownerId) {
        get().resetLoan();
        set({ ownerId, currentAddress: null, application: null, eligibility: null, isApplied: false, status: 'idle', appliedAmount: '' });
      }
    },
    step: 'request',
    loanDetails: { ...emptyLoanDetails },
    address: { ...emptyAddress },
    reasons: [],
    tenors: [],
    quote: null,
    currentAddress: null,
    application: null,
    eligibility: null,
    isApplied: false,
    status: 'idle',
    appliedAmount: '',
    isLoading: false,
    isQuoting: false,
    error: null,
    fieldErrors: {},
    setStep: (step) => set({ step, error: null, fieldErrors: {} }),
    setLoanField: (field, value) =>
      set((state) => ({
        loanDetails: { ...state.loanDetails, [field]: value },
        quote: null,
        error: null,
        fieldErrors: { ...state.fieldErrors, [field]: '' },
      })),
    setAddressField: (field, value) =>
      set((state) => ({
        address: { ...state.address, [field]: value },
      })),
    setApplied: (amount) => set({ isApplied: true, status: 'applied', appliedAmount: amount }),
    setStatus: (status) => set({ status }),
    resetLoan: () => set({
      step: 'request',
      loanDetails: { ...emptyLoanDetails },
      address: { ...emptyAddress },
      quote: null,
      isLoading: false,
      error: null,
      fieldErrors: {},
    }),
    loadOptions: async () => {
      const [reasons, tenors] = await Promise.all([
        LoanService.getReasons(),
        LoanService.getTenors(),
      ]);
      set({ reasons, tenors });
    },
    // Prices the current request for the breakdown under the form. A reply
    // for values the customer has since changed is ignored.
    getQuote: async () => {
      const details = get().loanDetails;
      set({ isQuoting: true, error: null, fieldErrors: {} });
      try {
        const quote = await LoanService.getQuote(toRequest(details));
        if (get().loanDetails === details) set({ quote });
        return quote;
      } catch (error) {
        if (get().loanDetails === details) {
          const { message, fields } = parseLoanError(error);
          set({ error: message, fieldErrors: fields });
        }
        throw error;
      } finally {
        set({ isQuoting: false });
      }
    },
    getEligibility: async () => {
      const eligibility = await LoanService.getEligibility();
      set({ eligibility });
      return eligibility;
    },
    loadCurrentAddress: async () => {
      const currentAddress = await LoanService.getCurrentAddress();
      set((state) => ({
        currentAddress,
        address: currentAddress && !state.address.houseNumber
          ? {
            houseNumber: currentAddress.house_number,
            houseAddress: currentAddress.street,
            landmark: currentAddress.closest_landmark,
            state: currentAddress.state,
            lga: currentAddress.lga,
            city: currentAddress.city,
            billType: (currentAddress.utility_bill_type as UtilityBillType) || '',
          }
          : state.address,
      }));
      return currentAddress;
    },
    submitAddress: async (utilityBill) => {
      const { address } = get();
      const currentAddress = await run(() => LoanService.submitAddress({
        house_number: address.houseNumber.trim(),
        street: address.houseAddress.trim(),
        closest_landmark: address.landmark.trim(),
        state: address.state,
        lga: address.lga.trim(),
        city: address.city.trim(),
        ...(address.billType ? { utility_bill_type: address.billType } : {}),
      }, utilityBill));
      set({ currentAddress });
    },
    submitEligibilityAssessment: async () => {
      await run(() => LoanService.submitEligibilityAssessment());
    },
    applyLoan: async () => {
      const { loanDetails } = get();
      const application = await run(() => LoanService.applyForLoan(toRequest(loanDetails)));
      set({
        application,
        isApplied: true,
        status: 'applied',
        appliedAmount: loanDetails.amount,
      });
    },
    fetchLatestApplication: async () => {
      const [latest] = await LoanService.getLoans(1);
      if (!latest) return;
      const status = latest.disbursement_status === 'disbursed' ? 'approved' : DASHBOARD_STATUS[latest.status];
      set({
        application: latest,
        status,
        isApplied: status === 'applied' || status === 'approved',
        appliedAmount: String(Math.round(Number(latest.amount))),
      });
    },
  };
}, {
  // Kept on the phone so a half-filled application survives leaving the app.
  name: 'peakpay-loan-draft',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    ownerId: state.ownerId,
    step: state.step,
    loanDetails: state.loanDetails,
    address: state.address,
  }),
}));
