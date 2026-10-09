import { create } from 'zustand';
import LoanService, {
  AddressVerification,
  LoanApplication,
  LoanQuote,
  LoanReason,
  LoanRequest,
  LoanTenor,
  UploadFile,
} from '../api/services/loan.service';

export type LoanStep = 'request' | 'summary' | 'address';
type DashboardLoanStatus = 'idle' | 'applied' | 'approved' | 'rejected';

interface AddressForm {
  houseNumber: string;
  houseAddress: string;
  landmark: string;
  state: string;
  lga: string;
  city: string;
}

interface LoanState {
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
  isApplied: boolean;
  status: DashboardLoanStatus;
  appliedAmount: string;
  isLoading: boolean;
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
  getQuote: () => Promise<void>;
  loadCurrentAddress: () => Promise<AddressVerification | null>;
  submitAddress: (utilityBill: UploadFile) => Promise<void>;
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
};

const DASHBOARD_STATUS: Record<LoanApplication['status'], DashboardLoanStatus> = {
  pending: 'applied',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'idle',
};

const GENERIC_ERROR = 'Something went wrong. Please try again.';

// Splits a drf-standardized-errors response into per-field messages and a
// general message for errors that don't belong to one field.
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

export const useLoanStore = create<LoanState>((set, get) => {
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
    step: 'request',
    loanDetails: { ...emptyLoanDetails },
    address: { ...emptyAddress },
    reasons: [],
    tenors: [],
    quote: null,
    currentAddress: null,
    application: null,
    isApplied: false,
    status: 'idle',
    appliedAmount: '',
    isLoading: false,
    error: null,
    fieldErrors: {},
    setStep: (step) => set({ step, error: null, fieldErrors: {} }),
    setLoanField: (field, value) =>
      set((state) => ({
        loanDetails: { ...state.loanDetails, [field]: value },
        // Any change invalidates the breakdown shown for the old values.
        quote: null,
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
    getQuote: async () => {
      const quote = await run(() => LoanService.getQuote(toRequest(get().loanDetails)));
      set({ quote, step: 'summary' });
    },
    loadCurrentAddress: async () => {
      const currentAddress = await LoanService.getCurrentAddress();
      set((state) => ({
        currentAddress,
        // Start a resubmission from the last address the user gave.
        address: currentAddress && !state.address.houseNumber
          ? {
            houseNumber: currentAddress.house_number,
            houseAddress: currentAddress.street,
            landmark: currentAddress.closest_landmark,
            state: currentAddress.state,
            lga: currentAddress.lga,
            city: currentAddress.city,
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
      }, utilityBill));
      set({ currentAddress });
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
      const [latest] = await LoanService.getLoans();
      if (!latest) return;
      const status = DASHBOARD_STATUS[latest.status];
      set({
        application: latest,
        status,
        isApplied: status === 'applied' || status === 'approved',
        appliedAmount: String(Math.round(Number(latest.amount))),
      });
    },
  };
});
