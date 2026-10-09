import apiClient from '../client';

export interface LoanReason {
  id: string;
  loan_reason: string;
}

export interface LoanTenor {
  months: number;
  label: string;
}

export interface LoanRequest {
  amount: string;
  loan_reason: string;
  duration_in_months: number;
}

// Money values are decimal strings, e.g. "36233.33".
export interface LoanQuote {
  amount_to_receive: string;
  loan_amount: string;
  duration_in_months: number;
  monthly_interest_rate: string;
  interest: string;
  management_fee_percentage: string;
  management_fee: string;
  credit_life_insurance_percentage: string;
  credit_life_insurance: string;
  monthly_repayment: string;
  estimated_total_repayment: string;
  date_of_first_payment: string;
}

export type LoanApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LoanApplication {
  id: string;
  amount: string;
  loan_reason: string | null;
  loan_reason_name: string | null;
  duration_in_months: number;
  flat_interest_rate: string;
  management_fee: string;
  credit_life_insurance: string;
  monthly_repayment: string;
  estimated_total_amount: string;
  date_of_first_payment: string;
  address_verification: string | null;
  status: LoanApplicationStatus;
  created_date: string;
  modified_date: string;
}

export interface AddressRequest {
  house_number: string;
  street: string;
  closest_landmark: string;
  state: string;
  lga: string;
  city: string;
}

// pending_review -> verified | rejected; verified -> expired after six months.
// A newer submission marks the previous one superseded.
export type AddressStatus = 'pending_review' | 'verified' | 'rejected' | 'expired' | 'superseded';

export interface AddressVerification extends AddressRequest {
  id: string;
  utility_bill: string;
  status: AddressStatus;
  // True when the user must submit a new address before applying.
  needs_new_address: boolean;
  review_note: string;
  reviewed_at: string | null;
  expires_at: string | null;
  created_date: string;
  modified_date: string;
}

// A picked file as React Native's FormData expects it (there is no File).
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

// The loan screens show validation errors inline, not as a toast.
const inline = { skipErrorToast: true };

class LoanService {
  async getReasons(): Promise<LoanReason[]> {
    const response = await apiClient.get('/loan/reasons/');
    return response.data.data;
  }

  async getTenors(): Promise<LoanTenor[]> {
    const response = await apiClient.get('/loan/tenors/');
    return response.data.data;
  }

  // Validates the request and prices it; nothing is saved.
  async getQuote(data: LoanRequest): Promise<LoanQuote> {
    const response = await apiClient.post('/loan/quote/', data, inline);
    return response.data.data;
  }

  // Needs an address on file that is pending review or verified.
  async applyForLoan(data: LoanRequest): Promise<LoanApplication> {
    const response = await apiClient.post('/loan/applications/', data, inline);
    return response.data.data;
  }

  // Newest first.
  async getLoans(): Promise<LoanApplication[]> {
    const response = await apiClient.get('/loan/applications/');
    return response.data.data;
  }

  async getLoanById(id: string): Promise<LoanApplication> {
    const response = await apiClient.get(`/loan/applications/${id}/`);
    return response.data.data;
  }

  // The address in use, or null when the user hasn't submitted one.
  async getCurrentAddress(): Promise<AddressVerification | null> {
    const response = await apiClient.get('/kyc/address-verification/current/');
    return response.data.data;
  }

  async submitAddress(data: AddressRequest, utilityBill: UploadFile): Promise<AddressVerification> {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => form.append(key, value));
    form.append('utility_bill', utilityBill as unknown as Blob);
    // The client defaults to JSON, which would make axios serialise the form.
    const response = await apiClient.post('/kyc/address-verification/', form, {
      ...inline,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }
}

export default new LoanService();
