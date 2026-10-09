import { create } from 'zustand';
import KycService from '../api/services/kyc.service';
import type {
  Bank,
  BankDetailsRecord,
  EmploymentRecord,
  EmploymentStatus,
  EmploymentVerificationRequest,
  NinVerificationStatus,
  PepDetailsRecord,
  ResolvedBankAccount,
  SmileIdConfig,
} from '../api/services/kyc.service';
import OtpService from '../api/services/otp.service';
import UserService from '../api/services/user.service';

interface KYCState {
  currentStep: number;
  phone: string;
  phoneDialCode: string;
  isPhoneVerified: boolean;
  bvn: string;
  isBvnVerified: boolean;
  isLivenessVerified: boolean;
  ninInput: string;
  isNinVerified: boolean;
  ninVerification: NinVerificationStatus | null;
  // Local time (Date.now()) when ninVerification was last received.
  ninCheckedAt: number;
  completedKycSteps: string[];
  pendingVerification: { jobId: string; bvn: string } | null;
  nextOfKin: {
    firstName: string;
    lastName: string;
    phone: string;
    relation: string;
  };
  nextOfKinId: string | null;
  isNextOfKinLoading: boolean;
  isNextOfKinLoaded: boolean;
  employment: EmploymentForm;
  // The saved current version, or null if the user hasn't saved one.
  currentEmployment: EmploymentRecord | null;
  isEmploymentLoaded: boolean;
  // The user's saved PEP answer, or null if none was saved.
  pepRecord: PepDetailsRecord | null;
  isPepLoaded: boolean;
  // Bank list, loaded once per session.
  banks: Bank[];
  // The user's saved bank account, or null if none was saved.
  bankAccount: BankDetailsRecord | null;
  isBankAccountLoaded: boolean;
  // True once the backend has the user's transaction PIN; the PIN itself is
  // never kept in state.
  hasTransactionPin: boolean;
  isKYCComplete: boolean;
  smileIdConfig: SmileIdConfig | null;
  isLoading: boolean;
  error: string | null;
  activeStepId: string;
  bvnInput: string;
  setPhone: (value: string) => void;
  setPhoneDialCode: (value: string) => void;
  setActiveStepId: (value: string) => void;
  setBvnInput: (value: string) => void;
  setBvn: (value: string) => void;
  setNinInput: (value: string) => void;
  setNextOfKinField: (field: keyof KYCState['nextOfKin'], value: string) => void;
  loadNextOfKin: () => Promise<void>;
  saveNextOfKin: () => Promise<void>;
  setEmploymentField: (field: keyof EmploymentForm, value: string) => void;
  loadEmployment: () => Promise<void>;
  saveEmployment: () => Promise<{ record: EmploymentRecord; changed: boolean }>;
  sendWorkEmailOtp: () => Promise<void>;
  verifyWorkEmailOtp: (otpCode: string) => Promise<void>;
  loadPep: () => Promise<void>;
  savePep: (isPep: boolean) => Promise<PepDetailsRecord>;
  loadBanks: () => Promise<void>;
  loadBankAccount: () => Promise<void>;
  resolveBankAccount: (accountNumber: string, bankCode: string, signal: AbortSignal) => Promise<ResolvedBankAccount>;
  saveBankAccount: (resolved: ResolvedBankAccount, phone: string) => Promise<BankDetailsRecord>;
  setKYCComplete: (value: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetKYC: () => void;
  syncKycProgress: () => Promise<void>;
  sendPhoneOtp: () => Promise<any>;
  verifyPhoneOtp: (otpCode: string) => Promise<any>;
  verifyBvn: () => Promise<any>;
  verifyNin: () => Promise<any>;
  fetchNinStatus: () => Promise<NinVerificationStatus | null>;
  submitLiveness: (payload: string) => Promise<any>;
  submitKyc: () => Promise<void>;
  createTransactionPin: (pin: string) => Promise<void>;
}

export interface EmploymentForm {
  employmentStatus: EmploymentStatus | '';
  employerName: string;
  jobTitle: string;
  sector: string;
  industry: string;
  monthlyIncome: string;
  payday: string;
  state: string;
  city: string;
  address: string;
  sourceOfIncome: string;
  workEmail: string;
}

export const EMPTY_EMPLOYMENT: EmploymentForm = {
  employmentStatus: '',
  employerName: '',
  jobTitle: '',
  sector: '',
  industry: '',
  monthlyIncome: '',
  payday: '',
  state: '',
  city: '',
  address: '',
  sourceOfIncome: '',
  workEmail: '',
};

// Mirrors the backend's REQUIRED_FIELDS for each employment status.
export const EMPLOYMENT_REQUIRED_FIELDS: Record<EmploymentStatus, (keyof EmploymentForm)[]> = {
  employed: ['employerName', 'jobTitle', 'sector', 'industry', 'monthlyIncome', 'payday', 'state', 'city', 'address', 'workEmail'],
  self_employed: ['employerName', 'industry', 'monthlyIncome', 'state', 'address'],
  unemployed: ['sourceOfIncome', 'monthlyIncome'],
  student: ['employerName', 'sourceOfIncome', 'monthlyIncome'],
  retired: ['employerName', 'monthlyIncome', 'payday'],
};
const EMPLOYMENT_OPTIONAL_FIELDS: Partial<Record<EmploymentStatus, (keyof EmploymentForm)[]>> = {
  self_employed: ['city'],
};

export const employmentFields = (status: EmploymentStatus | '') =>
  status ? [...EMPLOYMENT_REQUIRED_FIELDS[status], ...(EMPLOYMENT_OPTIONAL_FIELDS[status] ?? [])] : [];

export const isEmploymentFormComplete = (form: EmploymentForm) =>
  !!form.employmentStatus
  && EMPLOYMENT_REQUIRED_FIELDS[form.employmentStatus].every((field) => form[field].trim() !== '');

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// An employed user must verify their work email unless the current version
// already holds this same verified email.
export const needsWorkEmailVerification = (form: EmploymentForm, current: EmploymentRecord | null) =>
  form.employmentStatus === 'employed'
  && !(
    current?.employment_status === 'employed'
    && !!current.work_email_verified_at
    && current.work_email === normalizeEmail(form.workEmail)
  );

export const employmentFormFromRecord = (record: EmploymentRecord | null): EmploymentForm =>
  record
    ? {
      employmentStatus: record.employment_status,
      employerName: record.employer_name,
      jobTitle: record.job_title,
      sector: record.sector,
      industry: record.industry,
      monthlyIncome: record.monthly_income ? String(Number(record.monthly_income)) : '',
      payday: record.payday ? String(record.payday) : '',
      state: record.state,
      city: record.city,
      address: record.company_location,
      sourceOfIncome: record.source_of_income,
      workEmail: record.work_email,
    }
    : { ...EMPTY_EMPLOYMENT };

// Only the fields the status uses are sent; the backend clears the rest.
export const employmentPayload = (form: EmploymentForm): EmploymentVerificationRequest => {
  const used = new Set(employmentFields(form.employmentStatus));
  const value = (field: keyof EmploymentForm) => (used.has(field) ? form[field].trim() : undefined);
  return {
    employment_status: form.employmentStatus as EmploymentStatus,
    employer_name: value('employerName'),
    job_title: value('jobTitle'),
    sector: value('sector'),
    industry: value('industry'),
    monthly_income: value('monthlyIncome')?.replace(/,/g, ''),
    payday: used.has('payday') ? Number(form.payday) : undefined,
    state: value('state'),
    city: value('city'),
    company_location: value('address'),
    source_of_income: value('sourceOfIncome'),
    work_email: used.has('workEmail') ? normalizeEmail(form.workEmail) : undefined,
  };
};

// Normalizes a Nigerian phone number to +234XXXXXXXXXX, or null if invalid.
export const normalizeNigerianPhone = (input: string) => {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('234')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+234${digits.slice(1)}`;
  if (digits.length === 10 && /^[789]/.test(digits)) return `+234${digits}`;
  return null;
};

// NIN status polling: every 3s for 2 minutes, every 10s until 5 minutes, then
// stop and let the user check manually (the backend keeps checking SmileID).
export const NIN_POLL_SCHEDULE = [
  { untilMs: 2 * 60_000, everyMs: 3_000 },
  { untilMs: 5 * 60_000, everyMs: 10_000 },
];

const NIN_POLL_STOP_MS = NIN_POLL_SCHEDULE[NIN_POLL_SCHEDULE.length - 1].untilMs;

// Delay before the next status check for a lookup this old, or null to stop.
// A check that would land after the cut-off is never scheduled.
export const ninPollDelay = (ageMs: number) => {
  const step = NIN_POLL_SCHEDULE.find((candidate) => ageMs < candidate.untilMs);
  return step && ageMs + step.everyMs <= NIN_POLL_STOP_MS ? step.everyMs : null;
};

// Age of a lookup at time `at`. Uses the server-measured age from the last
// response plus local time since then, so a wrong device clock doesn't matter.
export const ninLookupAgeMs = (
  lookup: NinVerificationStatus | null,
  checkedAt: number,
  at: number,
) => {
  if (!lookup) return 0;
  if (typeof lookup.elapsed_seconds === 'number') {
    return Math.max(0, lookup.elapsed_seconds * 1000 + at - checkedAt);
  }
  const created = Date.parse(lookup.created_date);
  return Number.isNaN(created) ? 0 : Math.max(0, at - created);
};

// Backend normalizes to 234XXXXXXXXXX; drop the trunk "0" users often type.
const fullPhoneNumber = (dialCode: string, phone: string) =>
  `${dialCode.replace('+', '')}${phone.replace(/\D/g, '').replace(/^0/, '')}`;

interface KycApiValidationError {
  attr?: string;
  detail?: string;
  message?: string;
  code?: string;
}

interface KycApiError {
  response?: {
    data?: {
      errors?: KycApiValidationError[];
      detail?: string;
      message?: string;
    } | string;
  };
  message?: string;
}

const getKycErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as KycApiError;
  const data = apiError.response?.data;
  if (data && typeof data === 'object' && Array.isArray(data.errors)) {
    const message = data.errors
      .map((item: KycApiValidationError) => {
        const detail = item.detail || item.message || item.code?.replace(/_/g, ' ');
        return [item.attr, detail].filter(Boolean).join(': ');
      })
      .filter(Boolean)
      .join(' | ');
    if (message) return message;
  }
  if (data && typeof data === 'object' && data.detail) return data.detail;
  if (data && typeof data === 'object' && data.message) return data.message;
  if (typeof data === 'string') return data;
  if (apiError.message && !/^Request failed with status code \d+$/.test(apiError.message)) {
    return apiError.message;
  }
  return fallback;
};

interface NextOfKinRecord {
  id?: string | number;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  phone_number?: string;
  phone?: string;
  relationship?: string;
  relation?: string;
}

const findNextOfKinRecord = (value: unknown): NextOfKinRecord | null => {
  if (Array.isArray(value)) return findNextOfKinRecord(value[0]);
  if (!value || typeof value !== 'object') return null;

  const payload = value as Record<string, unknown>;
  const records = payload.results ?? payload.next_of_kin;
  if (Array.isArray(records)) return findNextOfKinRecord(records[0]);
  if (Array.isArray(payload.data)) return findNextOfKinRecord(payload.data[0]);
  if (payload.data && typeof payload.data === 'object') return findNextOfKinRecord(payload.data);
  if ('id' in payload || 'first_name' in payload || 'firstName' in payload) {
    return payload as NextOfKinRecord;
  }
  return null;
};

// The KYC steps in flow order. A step counts as done when the backend
// checklist says so or the matching local record exists.
export function getKycSteps(state: KYCState) {
  const done = (key: string) => state.completedKycSteps.includes(key);
  return [
    { id: 'phone', name: 'Phone Verification', completed: state.isPhoneVerified || done('phone_verification') },
    { id: 'bvn', name: 'BVN Verification', completed: state.isBvnVerified || done('bvn_verification') },
    { id: 'liveness', name: 'Liveness Check', completed: state.isLivenessVerified || done('liveness_check') },
    { id: 'nin', name: 'NIN Verification', completed: state.isNinVerified || done('nin_verification') },
    { id: 'nextOfKin', name: 'Next of Kin Details', completed: done('next_of_kin_details') || (!!state.nextOfKin.firstName && !!state.nextOfKin.lastName) },
    { id: 'employment', name: 'Employment Details', completed: done('employment_details') || !!state.currentEmployment },
    { id: 'pep', name: 'PEP Details', completed: done('pep_details') || !!state.pepRecord },
    { id: 'bankDetails', name: 'Add Bank Details', completed: done('bank_details') || !!state.bankAccount },
    { id: 'transactionPin', name: 'Create Transaction PIN', completed: done('transaction_pin') || state.hasTransactionPin },
  ];
}

export function isKycCompleted(state: KYCState) {
  return state.isKYCComplete || getKycSteps(state).every((step) => step.completed);
}

export const useKYCStore = create<KYCState>((set, get) => ({
  currentStep: 1,
  phone: '',
  phoneDialCode: '+234',
  isPhoneVerified: false,
  bvn: '',
  isBvnVerified: false,
  isLivenessVerified: false,
  ninInput: '',
  isNinVerified: false,
  ninVerification: null,
  ninCheckedAt: 0,
  completedKycSteps: [],
  pendingVerification: null,
  nextOfKin: {
    firstName: '',
    lastName: '',
    phone: '',
    relation: '',
  },
  nextOfKinId: null,
  isNextOfKinLoading: false,
  isNextOfKinLoaded: false,
  employment: { ...EMPTY_EMPLOYMENT },
  currentEmployment: null,
  isEmploymentLoaded: false,
  pepRecord: null,
  isPepLoaded: false,
  banks: [],
  bankAccount: null,
  isBankAccountLoaded: false,
  hasTransactionPin: false,
  isKYCComplete: false,
  smileIdConfig: null,
  isLoading: false,
  error: null,
  activeStepId: 'phone',
  bvnInput: '',
  setPhone: (value) => set({ phone: value, isPhoneVerified: false, error: null }),
  setPhoneDialCode: (value) => set({ phoneDialCode: value, isPhoneVerified: false, error: null }),
  setActiveStepId: (value) => set({ activeStepId: value }),
  setBvnInput: (value) => set({ bvnInput: value, isBvnVerified: false, isLivenessVerified: false, pendingVerification: null, error: null }),
  setBvn: (value) => set({ bvn: value, isBvnVerified: false, isLivenessVerified: false, pendingVerification: null, error: null }),
  setNinInput: (value) => set({ ninInput: value.replace(/\D/g, '').slice(0, 11), isNinVerified: false, error: null }),
  setNextOfKinField: (field, value) =>
    set((state) => ({
      nextOfKin: { ...state.nextOfKin, [field]: value },
      error: null,
    })),
  setEmploymentField: (field, value) =>
    set((state) => ({
      employment: { ...state.employment, [field]: value },
      error: null,
    })),
  loadEmployment: async () => {
    set({ isLoading: true, error: null });
    try {
      const currentEmployment = await KycService.getCurrentEmployment();
      set({
        currentEmployment,
        employment: employmentFormFromRecord(currentEmployment),
        isEmploymentLoaded: true,
      });
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not load employment details') });
    } finally {
      set({ isLoading: false });
    }
  },
  saveEmployment: async () => {
    const before = get().currentEmployment;
    set({ isLoading: true, error: null });
    try {
      const record = await KycService.saveEmployment(employmentPayload(get().employment));
      set((state) => ({
        currentEmployment: record,
        employment: employmentFormFromRecord(record),
        completedKycSteps: state.completedKycSteps.includes('employment_details')
          ? state.completedKycSteps
          : [...state.completedKycSteps, 'employment_details'],
      }));
      return { record, changed: record.id !== before?.id };
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not save employment details') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  sendWorkEmailOtp: async () => {
    set({ isLoading: true, error: null });
    try {
      await KycService.sendWorkEmailOtp(normalizeEmail(get().employment.workEmail));
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not send the verification code') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  verifyWorkEmailOtp: async (otpCode: string) => {
    set({ isLoading: true, error: null });
    try {
      await KycService.verifyWorkEmailOtp(normalizeEmail(get().employment.workEmail), otpCode);
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not verify the code') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  loadPep: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await KycService.getPepDetails();
      const [pepRecord] = (response.data ?? []) as PepDetailsRecord[];
      set({ pepRecord: pepRecord ?? null, isPepLoaded: true });
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not load your PEP details') });
    } finally {
      set({ isLoading: false });
    }
  },
  savePep: async (isPep) => {
    const existing = get().pepRecord;
    if (existing?.is_pep === isPep) return existing;
    set({ isLoading: true, error: null });
    try {
      const response = existing
        ? await KycService.patchPepDetails(existing.id, { is_pep: isPep })
        : await KycService.createPepDetails({ is_pep: isPep });
      const pepRecord: PepDetailsRecord = response.data;
      set((state) => ({
        pepRecord,
        completedKycSteps: state.completedKycSteps.includes('pep_details')
          ? state.completedKycSteps
          : [...state.completedKycSteps, 'pep_details'],
      }));
      return pepRecord;
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not save your PEP details') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  loadBanks: async () => {
    if (get().banks.length) return;
    try {
      const banks = await KycService.getBanks();
      // An empty list can't be picked from, so treat it as a failed load.
      if (!banks.length) throw new Error('We could not load the list of banks. Please try again.');
      set({ banks });
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not load the bank list') });
    }
  },
  loadBankAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      const [bankAccount] = await KycService.listBankAccounts();
      set({ bankAccount: bankAccount ?? null, isBankAccountLoaded: true });
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not load your bank details') });
    } finally {
      set({ isLoading: false });
    }
  },
  resolveBankAccount: async (accountNumber, bankCode, signal) => {
    try {
      return await KycService.resolveBankAccount(accountNumber, bankCode, signal);
    } catch (error: any) {
      if (signal.aborted) throw error;
      throw new Error(getKycErrorMessage(error, 'Could not resolve the account name.'));
    }
  },
  saveBankAccount: async (resolved, phone) => {
    const phoneNumber = normalizeNigerianPhone(phone);
    if (!phoneNumber) throw new Error('Enter a valid Nigerian phone number.');
    // Account details come from the resolve response, never from user input.
    const data = {
      bank_name: resolved.bank_name,
      bank_code: resolved.bank_code,
      account_number: resolved.account_number,
      account_name: resolved.account_name,
      phone_number: phoneNumber,
    };
    const existing = get().bankAccount;
    set({ isLoading: true, error: null });
    try {
      const response = existing
        ? await KycService.patchBankDetails(existing.id, data)
        : await KycService.createBankDetails(data);
      const bankAccount: BankDetailsRecord = response.data;
      set((state) => ({
        bankAccount,
        completedKycSteps: state.completedKycSteps.includes('bank_details')
          ? state.completedKycSteps
          : [...state.completedKycSteps, 'bank_details'],
      }));
      return bankAccount;
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not save your bank details') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  setKYCComplete: (value) => set({ isKYCComplete: value }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 7) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  resetKYC: () => set({
    pendingVerification: null,
    currentStep: 1,
    phone: '',
    phoneDialCode: '+234',
    isPhoneVerified: false,
    bvn: '',
    isBvnVerified: false,
    isLivenessVerified: false,
    ninInput: '',
    isNinVerified: false,
    ninVerification: null,
    ninCheckedAt: 0,
    completedKycSteps: [],
    nextOfKin: {
      firstName: '',
      lastName: '',
      phone: '',
      relation: '',
    },
    nextOfKinId: null,
    isNextOfKinLoading: false,
    isNextOfKinLoaded: false,
    employment: { ...EMPTY_EMPLOYMENT },
    currentEmployment: null,
    isEmploymentLoaded: false,
    pepRecord: null,
    isPepLoaded: false,
    bankAccount: null,
    isBankAccountLoaded: false,
    hasTransactionPin: false,
    isKYCComplete: false,
    isLoading: false,
    error: null,
      activeStepId: 'phone',
    bvnInput: '',
  }),
  syncKycProgress: async () => {
    try {
      const profile = await UserService.getMe();
      const digits = (profile.phone_number || '').replace(/\D/g, '');
      const phoneState = digits && (profile.is_phone_verified || !get().phone)
        ? digits.startsWith('234')
          ? { phoneDialCode: '+234', phone: digits.slice(3) }
          : { phone: digits.replace(/^0/, '') }
        : {};
      const checklist = profile.kyc_checklist;
      if (!checklist) {
        set({ ...phoneState, isPhoneVerified: profile.is_phone_verified });
        return;
      }

      const completedKycSteps = checklist.steps
        .filter((step) => step.status === 'completed')
        .map((step) => step.key);
      const isStepComplete = (key: string) => completedKycSteps.includes(key);
      const stepIdByKey: Record<string, string> = {
        phone_verification: 'phone',
        bvn_verification: 'bvn',
        liveness_check: 'liveness',
        nin_verification: 'nin',
        next_of_kin_details: 'nextOfKin',
        employment_details: 'employment',
        pep_details: 'pep',
        bank_details: 'bankDetails',
        transaction_pin: 'transactionPin',
      };
      const firstIncompleteStep = checklist.steps.find((step) => step.status !== 'completed');
      const apiNextStepIndex = checklist.steps.findIndex((step) => step.key === checklist.next_step);
      const apiNextStep = checklist.steps[apiNextStepIndex];
      const nextIncompleteAfterApiStep = checklist.steps
        .slice(apiNextStepIndex + 1)
        .find((step) => step.status !== 'completed');
      const nextStepKey = apiNextStep?.status === 'completed'
        ? nextIncompleteAfterApiStep?.key || firstIncompleteStep?.key
        : checklist.next_step || firstIncompleteStep?.key;
      // SmileID answers NIN lookups asynchronously; hold the flow on the NIN
      // step until it does, even though the API lets the user move on.
      const ninIndex = checklist.steps.findIndex((step) => step.key === 'nin_verification');
      const holdOnNin = checklist.steps[ninIndex]?.status === 'pending'
        && checklist.steps.findIndex((step) => step.key === nextStepKey) > ninIndex;
      const activeStepId = holdOnNin ? 'nin' : nextStepKey ? stepIdByKey[nextStepKey] : undefined;

      set({
        ...phoneState,
        isPhoneVerified: profile.is_phone_verified || isStepComplete('phone_verification'),
        isBvnVerified: isStepComplete('bvn_verification'),
        isLivenessVerified: isStepComplete('liveness_check'),
        isNinVerified: isStepComplete('nin_verification'),
        hasTransactionPin: isStepComplete('transaction_pin'),
        completedKycSteps,
        isKYCComplete: checklist.is_complete,
        ...(activeStepId ? { activeStepId } : {}),
      });
    } catch {
      // Keep the local flow usable if the profile endpoint is temporarily unavailable.
    }
  },
  loadNextOfKin: async () => {
    set({ isNextOfKinLoading: true, error: null });
    try {
      const record = findNextOfKinRecord(await KycService.getNextOfKin());
      set({
        ...(record
          ? {
            nextOfKinId: record.id == null ? null : String(record.id),
            nextOfKin: {
              firstName: record.first_name || record.firstName || '',
              lastName: record.last_name || record.lastName || '',
              phone: record.phone_number || record.phone || '',
              relation: record.relationship || record.relation || '',
            },
          }
          : {
            nextOfKinId: null,
            nextOfKin: { firstName: '', lastName: '', phone: '', relation: '' },
          }),
        isNextOfKinLoaded: true,
      });
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not load next of kin details') });
    } finally {
      set({ isNextOfKinLoading: false });
    }
  },
  saveNextOfKin: async () => {
    const { nextOfKin, nextOfKinId } = get();
    set({ isLoading: true, error: null });
    try {
      const data = {
        first_name: nextOfKin.firstName.trim(),
        last_name: nextOfKin.lastName.trim(),
        phone_number: nextOfKin.phone.trim(),
        relationship: nextOfKin.relation,
      };
      const response = nextOfKinId
        ? await KycService.updateNextOfKin(nextOfKinId, data)
        : await KycService.createNextOfKin(data);
      const savedRecord = findNextOfKinRecord(response);
      set({
        nextOfKinId: savedRecord?.id == null ? nextOfKinId : String(savedRecord.id),
        isNextOfKinLoaded: true,
      });
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Could not save next of kin details') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  sendPhoneOtp: async () => {
    const { phone, phoneDialCode } = get();
    set({ isLoading: true, error: null });
    try {
      return await OtpService.sendOtp({
        otp_type: 'sms',
        otp_action_type: 'change_phone_number',
        identifier: fullPhoneNumber(phoneDialCode, phone),
      });
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'Failed to send OTP') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  verifyPhoneOtp: async (otpCode: string) => {
    const { phone, phoneDialCode } = get();
    set({ isLoading: true, error: null });
    try {
      const response = await OtpService.verifyOtp({
        identifier: fullPhoneNumber(phoneDialCode, phone),
        otp_code: otpCode,
      });
      set({ isPhoneVerified: true });
      return response;
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'OTP verification failed') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  verifyBvn: async () => {
    const { bvn, bvnInput } = get();
    set({ isLoading: true, error: null });
    try {
      const config = await KycService.verifySmileId({
        verification_type: 'BVN',
        type_value: bvnInput || bvn,
      });
      set({ smileIdConfig: config, bvn: bvnInput || bvn });
      return config;
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'BVN verification failed') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  verifyNin: async () => {
    const { ninInput } = get();
    set({ isLoading: true, error: null });
    try {
      if (!/^\d{11}$/.test(ninInput)) throw new Error('Enter a valid 11-digit NIN.');
      const result = await KycService.verifySmileId({
        verification_type: 'NIN',
        type_value: ninInput,
      });
      // Submission only queues the lookup; fetchNinStatus reports the result.
      set({
        isNinVerified: false,
        ninVerification: {
          id: String(result?.data?.id ?? ''),
          verification_type: 'NIN',
          verification_status: 'pending',
          result_code: '',
          reason: '',
          elapsed_seconds: 0,
          created_date: new Date().toISOString(),
          modified_date: new Date().toISOString(),
        },
        ninCheckedAt: Date.now(),
      });
      return result;
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'NIN verification failed') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  fetchNinStatus: async () => {
    const ninVerification = await KycService.getNinStatus();
    const isNinVerified = ninVerification?.verification_status === 'verified';
    set((state) => ({
      ninVerification,
      ninCheckedAt: Date.now(),
      isNinVerified,
      completedKycSteps: isNinVerified && !state.completedKycSteps.includes('nin_verification')
        ? [...state.completedKycSteps, 'nin_verification']
        : state.completedKycSteps,
    }));
    return ninVerification;
  },
  submitLiveness: async (payload: string) => {
    const bvn = get().bvnInput || get().bvn;
    set({ isLoading: true, error: null, isBvnVerified: false, isLivenessVerified: false });
    try {
      if (!/^\d{11}$/.test(bvn)) throw new Error('Enter a valid 11-digit BVN before taking your selfie.');
      const pending = get().pendingVerification;
      const config = pending?.bvn === bvn
        ? await KycService.waitForBiometricResult(pending.jobId)
        : await KycService.submitLiveness(payload, bvn, (jobId) => set({ pendingVerification: { jobId, bvn } }));
      if ((get().bvnInput || get().bvn) !== bvn) throw new Error('Your BVN changed. Please verify it again.');
      if (config.verification_status === 'verified') {
        set({ isBvnVerified: true, isLivenessVerified: true, bvn, pendingVerification: null });
      }
      return config;
    } catch (error: any) {
      if (error.code === 'verification_rejected') set({ pendingVerification: null });
      set({ error: getKycErrorMessage(error, 'Liveness verification failed') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  submitKyc: async () => {
    const { nextOfKin, employment, pepRecord, bankAccount } = get();
    set({ isLoading: true, error: null });
    try {
      // Assuming a unified submission or sequential calls
      // TODO: Replace with actual KYC submission endpoint when available
      console.log('KYC data to submit:', { nextOfKin, employment, pepRecord, bankAccount });
      // Further logic if needed
    } catch (error: any) {
      set({ error: getKycErrorMessage(error, 'KYC submission failed') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  createTransactionPin: async (pin: string) => {
    set({ isLoading: true, error: null });
    try {
      await KycService.createTransactionPin(pin);
    } catch (error: any) {
      // A PIN saved by an earlier attempt (e.g. a retry after a timeout)
      // means this step is already done.
      const alreadySet = error?.response?.data?.errors?.some(
        (item: KycApiValidationError) => item.code === 'transaction_pin_exists',
      );
      if (!alreadySet) {
        set({ error: getKycErrorMessage(error, 'PIN creation failed'), isLoading: false });
        throw error;
      }
    }
    set((state) => ({
      hasTransactionPin: true,
      isLoading: false,
      completedKycSteps: state.completedKycSteps.includes('transaction_pin')
        ? state.completedKycSteps
        : [...state.completedKycSteps, 'transaction_pin'],
    }));
  },
}));
