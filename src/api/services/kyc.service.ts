import apiClient from '../client';

export interface SecurityQuestion {
  id: string;
  question: string;
}

export interface AnswerSecurityQuestionsRequest {
  security_question_1: string;
  security_answer_1: string;
  security_question_2: string;
  security_answer_2: string;
}

export interface TransactionPinRequest {
  pin: string;
}

export interface SmileIdVerificationRequest {
  verification_type: 'BVN' | 'NIN';
  type_value: string;
}

export interface SmileIdConfig {
  partner_id?: string;
  signature?: string;
  timestamp?: string;
  job_id?: string;
  user_id?: string;
  country?: string;
  id_type?: string;
  id_number?: string;
  [key: string]: any; // backend may return additional config
}

export type IdVerificationStatus = 'pending' | 'verified' | 'rejected' | 'cancelled' | 'unverified';

export interface NinVerificationStatus {
  id: string;
  verification_type: 'NIN';
  verification_status: IdVerificationStatus;
  result_code: string;
  reason: string;
  // Age of the lookup measured on the server, at response time.
  elapsed_seconds?: number;
  created_date: string;
  modified_date: string;
}

export interface NextOfKinRequest {
  first_name: string;
  last_name: string;
  relationship: string;
  phone_number: string;
}

export type EmploymentStatus = 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired';

export interface EmploymentVerificationRequest {
  employment_status: EmploymentStatus;
  employer_name?: string;
  job_title?: string;
  sector?: string;
  industry?: string;
  monthly_income?: string;
  payday?: number | null;
  state?: string;
  city?: string;
  company_location?: string;
  source_of_income?: string;
  work_email?: string;
}

// A saved version of the user's employment; older versions are 'superseded'.
export interface EmploymentRecord extends Required<Omit<EmploymentVerificationRequest, 'payday'>> {
  id: string;
  payday: number | null;
  record_status: 'current' | 'superseded';
  work_email_verified_at: string | null;
  changed_fields: Record<string, { from: unknown; to: unknown }>;
  superseded_at: string | null;
  created_date: string;
  modified_date: string;
}

export interface PepDetailsRequest {
  is_pep: boolean;
}

export interface PepDetailsRecord extends PepDetailsRequest {
  id: string;
  created_date: string;
  modified_date: string;
}

export interface BankDetailsRequest {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  phone_number: string;
}

export interface BankDetailsRecord extends BankDetailsRequest {
  id: string;
  created_date: string;
  modified_date: string;
}

export interface Bank {
  id: string;
  name: string;
  code: string;
  slug: string;
}

export interface ResolvedBankAccount {
  account_number: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
}

class KycService {
  async submitLiveness(payload: string, bvn: string, onSubmitted: (jobId: string) => void) {
    const capture = JSON.parse(payload);
    const response = await apiClient.post('/kyc/biometric-verification/', { bvn, images: capture.images });
    const job = response.data.data;
    onSubmitted(job.job_id);
    return this.waitForBiometricResult(job.job_id);
  }

  async waitForBiometricResult(jobId: string) {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result = await apiClient.get(`/kyc/biometric-verification/${jobId}/`);
      const current = result.data.data;
      if (current.verification_status === 'verified') return current;
      if (current.verification_status === 'rejected') {
        throw Object.assign(new Error('Your selfie could not be verified against your BVN. Check your BVN and try again in clear lighting.'), { code: 'verification_rejected' });
      }
    }
    return { job_id: jobId, verification_status: 'pending' };
  }
  async getSecurityQuestions(): Promise<SecurityQuestion[]> {
    const response = await apiClient.get('/kyc/security-questions-list/');
    return response.data;
  }

  async answerSecurityQuestions(data: AnswerSecurityQuestionsRequest) {
    const response = await apiClient.post('/kyc/security-questions/answer/', data);
    return response.data;
  }

  async createTransactionPin(pin: string) {
    const response = await apiClient.post('/kyc/transaction-pin/', { pin });
    return response.data;
  }

  // Changing the PIN requires the current one.
  async updateTransactionPin(id: string, pin: string, currentPin: string) {
    const response = await apiClient.put(`/kyc/transaction-pin/${id}/`, { pin, current_pin: currentPin });
    return response.data;
  }

  async verifySmileId(data: SmileIdVerificationRequest): Promise<SmileIdConfig> {
    const response = await apiClient.post('/kyc/smileid-verification/', data);
    return response.data;
  }

  // Latest NIN lookup for the user, or null if none was submitted.
  async getNinStatus(): Promise<NinVerificationStatus | null> {
    const response = await apiClient.get('/kyc/smileid-verification/nin-status/');
    return response.data.data;
  }

  // Next of Kin
  async getNextOfKin() {
    const response = await apiClient.get('/kyc/next-of-kin/');
    return response.data;
  }

  async createNextOfKin(data: NextOfKinRequest) {
    const response = await apiClient.post('/kyc/next-of-kin/', data);
    return response.data;
  }

  async getNextOfKinById(id: string) {
    const response = await apiClient.get(`/kyc/next-of-kin/${id}/`);
    return response.data;
  }

  async updateNextOfKin(id: string, data: Partial<NextOfKinRequest>) {
    const response = await apiClient.put(`/kyc/next-of-kin/${id}/`, data);
    return response.data;
  }

  async deleteNextOfKin(id: string) {
    const response = await apiClient.delete(`/kyc/next-of-kin/${id}/`);
    return response.data;
  }

  // Employment: each save creates a new current version.
  async getCurrentEmployment(): Promise<EmploymentRecord | null> {
    const response = await apiClient.get('/kyc/employment-verification/current/');
    return response.data.data;
  }

  async saveEmployment(data: EmploymentVerificationRequest): Promise<EmploymentRecord> {
    const response = await apiClient.post('/kyc/employment-verification/', data);
    return response.data.data;
  }

  async sendWorkEmailOtp(workEmail: string) {
    const response = await apiClient.post('/kyc/employment-verification/work-email/send-otp/', { work_email: workEmail });
    return response.data;
  }

  async verifyWorkEmailOtp(workEmail: string, otpCode: string) {
    const response = await apiClient.post('/kyc/employment-verification/work-email/verify/', {
      work_email: workEmail,
      otp_code: otpCode,
    });
    return response.data;
  }

  // Employment Verification
  async getEmploymentVerification() {
    const response = await apiClient.get('/kyc/employment-verification/');
    return response.data;
  }

  async createEmploymentVerification(data: EmploymentVerificationRequest) {
    const response = await apiClient.post('/kyc/employment-verification/', data);
    return response.data;
  }

  async getEmploymentVerificationById(id: string) {
    const response = await apiClient.get(`/kyc/employment-verification/${id}/`);
    return response.data;
  }

  async updateEmploymentVerification(id: string, data: Partial<EmploymentVerificationRequest>) {
    const response = await apiClient.put(`/kyc/employment-verification/${id}/`, data);
    return response.data;
  }

  // PEP Details
  async getPepDetails() {
    const response = await apiClient.get('/kyc/pep-details/');
    return response.data;
  }

  async createPepDetails(data: PepDetailsRequest) {
    const response = await apiClient.post('/kyc/pep-details/', data);
    return response.data;
  }

  async getPepDetailsById(id: string) {
    const response = await apiClient.get(`/kyc/pep-details/${id}/`);
    return response.data;
  }

  async updatePepDetails(id: string, data: Partial<PepDetailsRequest>) {
    const response = await apiClient.put(`/kyc/pep-details/${id}/`, data);
    return response.data;
  }

  async patchPepDetails(id: string, data: Partial<PepDetailsRequest>) {
    const response = await apiClient.patch(`/kyc/pep-details/${id}/`, data);
    return response.data;
  }

  // Bank list for the bank picker; alphabetical and not paginated.
  async getBanks(): Promise<Bank[]> {
    const response = await apiClient.get('/kyc/bank-list/');
    return response.data.data;
  }

  // Looks up the account name with Paystack. Errors are shown inline by the
  // caller, so they don't raise a toast.
  async resolveBankAccount(accountNumber: string, bankCode: string, signal?: AbortSignal): Promise<ResolvedBankAccount> {
    const response = await apiClient.post(
      '/kyc/resolve-bank-account/',
      { account_number: accountNumber, bank_code: bankCode },
      { signal, skipErrorToast: true },
    );
    return response.data.data;
  }

  async listBankAccounts(): Promise<BankDetailsRecord[]> {
    const response = await apiClient.get('/kyc/bank-details/');
    return response.data.data ?? [];
  }

  // Bank Details
  async getBankDetails() {
    const response = await apiClient.get('/kyc/bank-details/');
    return response.data;
  }

  async createBankDetails(data: BankDetailsRequest) {
    const response = await apiClient.post('/kyc/bank-details/', data);
    return response.data;
  }

  async getBankDetailsById(id: string) {
    const response = await apiClient.get(`/kyc/bank-details/${id}/`);
    return response.data;
  }

  async updateBankDetails(id: string, data: Partial<BankDetailsRequest>) {
    const response = await apiClient.put(`/kyc/bank-details/${id}/`, data);
    return response.data;
  }

  async patchBankDetails(id: string, data: Partial<BankDetailsRequest>) {
    const response = await apiClient.patch(`/kyc/bank-details/${id}/`, data);
    return response.data;
  }
}

export default new KycService();
