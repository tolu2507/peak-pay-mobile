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
  verification_type: 'BVN';
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

export interface NextOfKinRequest {
  first_name: string;
  last_name: string;
  relationship: string;
  phone_number: string;
}

export interface EmploymentVerificationRequest {
  employment_status: string;
  employer_name: string;
  industry: string;
  monthly_income: string;
  date_of_payroll: string;
  job_title: string;
  company_location: string;
}

export interface PepDetailsRequest {
  is_pep: boolean;
}

export interface BankDetailsRequest {
  bank_name: string;
  account_number: string;
  account_name: string;
  phone_number: string;
}

class KycService {
  async getSecurityQuestions(): Promise<SecurityQuestion[]> {
    const response = await apiClient.get('/kyc/security-questions-list/');
    console.log(response.data.data)
    return response.data.data;
  }

  async answerSecurityQuestions(data: AnswerSecurityQuestionsRequest) {
    const response = await apiClient.post('/kyc/security-questions/answer/', data);
    return response.data;
  }

  async createTransactionPin(pin: string) {
    const response = await apiClient.post('/kyc/transaction-pin/', { pin });
    return response.data;
  }

  async updateTransactionPin(id: string, pin: string) {
    const response = await apiClient.put(`/kyc/transaction-pin/${id}/`, { pin });
    return response.data;
  }

  async verifySmileId(data: SmileIdVerificationRequest): Promise<SmileIdConfig> {
    console.log({ data })
    const response = await apiClient.post('/kyc/smileid-verification/', data);
    console.log(response.data)
    return response.data;
  }

  // Next of Kin
  async getNextOfKin() {
    const response = await apiClient.get('/kyc/next-of-kin/');
    return response.data;
  }

  async createNextOfKin(data: NextOfKinRequest) {
    console.log({ data })
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
