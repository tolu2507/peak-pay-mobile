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

// Employed customers are salaried; everyone else is turnover.
export type LoanCategory = 'salaried' | 'turnover';

export type LoanApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LoanApplication {
  id: string;
  amount: string;
  loan_reason: string | null;
  loan_reason_name: string | null;
  duration_in_months: number;
  flat_interest_rate: string | null;
  management_fee: string | null;
  credit_life_insurance: string | null;
  monthly_repayment: string | null;
  estimated_total_amount: string | null;
  date_of_first_payment: string | null;
  address_verification: string | null;
  statement_request: string | null;
  status: LoanApplicationStatus;
  application_status: 'open' | 'closed';
  eligibility_status: 'eligible' | 'ineligible' | null;
  eligible_amount: string | null;
  // Blank on loans decided before categories existed.
  loan_category: LoanCategory | '';
  eligibility_assessment: string | null;
  repayment_setup_completed_at: string | null;
  offer_accepted_at: string | null;
  disbursement_status: 'pending' | 'disbursed';
  disbursement_method: '' | 'automatic' | 'manual';
  disbursement_platform: '' | 'paystack' | 'bank_transfer' | 'deposit';
  payout_account: { id: string; bank_name: string; account_number: string; account_name: string } | null;
  disbursed_amount: string | null;
  disbursed_at: string | null;
  created_date: string;
  modified_date: string;
}

export type CodeChannel = 'sms' | 'email';

// Where a confirmation code went, and the other way it can be sent (null when
// the customer only has one of phone or email on file).
export interface OfferCodeDestination {
  channel: CodeChannel;
  // Masked, e.g. "•••• 4567" or "al•••@gmail.com".
  destination: string;
  alternative: { channel: CodeChannel; destination: string } | null;
}

// Text for the link that sends the code the other way instead.
export const otherChannelLabel = (alternative: { channel: CodeChannel; destination: string }) =>
  alternative.channel === 'email'
    ? `Send it to my email (${alternative.destination}) instead`
    : `Send it by SMS to ${alternative.destination} instead`;

export interface LoanEligibility {
  assessment_id: string | null;
  // statement_outdated: the bank statement went out of date before a decision,
  // so the customer must pull a new one and is reviewed again.
  assessment_status: 'not_started' | 'pending_review' | 'eligible' | 'ineligible' | 'refresh_required' | 'statement_outdated' | 'expired';
  can_apply: boolean;
  minimum_amount: string;
  disbursement_status: 'pending' | 'disbursed' | null;
  expires_at: string | null;
  expired_at: string | null;
  application_id: string | null;
  application_status: 'open' | 'closed' | null;
  eligibility_status: 'eligible' | 'ineligible' | null;
  // The most the customer can borrow; any amount from the minimum up to it.
  eligible_amount: string | null;
  // Set by the decisioning officer with the limit.
  loan_category?: LoanCategory | null;
  tenure_months?: number | null;
  monthly_interest_rate?: string | null;
  // What the customer repays on the full eligible amount.
  total_repayment?: string | null;
  monthly_repayment?: string | null;
}

export interface LoanTransaction {
  id: string;
  date: string;
  narration: string;
  amount: string;
}

export const UTILITY_BILL_OPTIONS = [
  { value: 'electricity', label: 'Electricity bill' },
  { value: 'water', label: 'Water bill' },
  { value: 'waste', label: 'Waste collection bill' },
  { value: 'gas', label: 'Gas bill' },
  { value: 'internet', label: 'Internet bill' },
  { value: 'telephone', label: 'Telephone bill' },
] as const;

export type UtilityBillType = typeof UTILITY_BILL_OPTIONS[number]['value'];

export interface AddressRequest {
  house_number: string;
  street: string;
  closest_landmark: string;
  state: string;
  lga: string;
  city: string;
  utility_bill_type?: UtilityBillType;
}

// pending_review -> verified | rejected; verified -> expired after six months.
export type AddressStatus = 'pending_review' | 'verified' | 'rejected' | 'expired' | 'superseded';

export interface AddressVerification extends AddressRequest {
  id: string;
  utility_bill: string;
  status: AddressStatus;
  needs_new_address: boolean;
  review_note: string;
  reviewed_at: string | null;
  expires_at: string | null;
  created_date: string;
  modified_date: string;
}

// A picked file as React Native's FormData expects it
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

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

  async submitEligibilityAssessment(): Promise<void> {
    await apiClient.post('/loan/eligibility-assessments/', {}, inline);
  }

  async getEligibility(signal?: AbortSignal): Promise<LoanEligibility> {
    const response = await apiClient.get('/loan/applications/eligibility/', { ...inline, signal });
    return response.data.data;
  }

  async getTransactions(signal?: AbortSignal): Promise<LoanTransaction[]> {
    const response = await apiClient.get('/loan/applications/transactions/', { ...inline, signal });
    return response.data.data;
  }

  async getTransactionPage(page: number, signal?: AbortSignal): Promise<{ results: LoanTransaction[]; next: boolean; previous: boolean }> {
    const response = await apiClient.get('/loan/applications/transactions/', { ...inline, signal, params: { page, page_size: 20 } });
    return { results: response.data.data, next: Boolean(response.data.next), previous: Boolean(response.data.previous) };
  }

  // Newest first.
  async getLoans(pageSize = 100): Promise<LoanApplication[]> {
    const response = await apiClient.get('/loan/applications/', { params: { page_size: pageSize } });
    return response.data.data;
  }

  async getLoanById(id: string): Promise<LoanApplication> {
    const response = await apiClient.get(`/loan/applications/${id}/`);
    return response.data.data;
  }

  // Sends the code that confirms the offer. Without a channel the server picks
  // SMS when a phone is on file, else email. Only the newest code works, and
  // at most 5 codes an hour across both channels (429 after that).
  async sendOfferCode(id: string, channel?: CodeChannel): Promise<OfferCodeDestination> {
    const response = await apiClient.post(`/loan/applications/${id}/offer-otp/`, channel ? { channel } : {}, inline);
    return response.data.data;
  }

  // Accepts the offer; loans below the automatic limit are then paid out.
  // A wrong PIN uses up the code, so the caller must request a new one.
  // payoutAccountId: which of the customer's accounts to pay into (any bank);
  // without it, the account shown as payout_account.
  async acceptOffer(id: string, otpCode: string, transactionPin: string, payoutAccountId?: string): Promise<LoanApplication> {
    const response = await apiClient.post(
      `/loan/applications/${id}/accept-offer/`,
      {
        otp_code: otpCode,
        transaction_pin: transactionPin,
        ...(payoutAccountId ? { payout_bank_account: payoutAccountId } : {}),
      },
      inline,
    );
    return response.data.data;
  }

  // The address in use, or null when the user hasn't submitted one.
  async getCurrentAddress(): Promise<AddressVerification | null> {
    const response = await apiClient.get('/kyc/address-verification/current/');
    return response.data.data;
  }

  async submitAddress(data: AddressRequest, utilityBill: UploadFile): Promise<AddressVerification> {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) form.append(key, value);
    });
    form.append('utility_bill', utilityBill as unknown as Blob);
    const response = await apiClient.post('/kyc/address-verification/', form, {
      ...inline,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }
}

export default new LoanService();
