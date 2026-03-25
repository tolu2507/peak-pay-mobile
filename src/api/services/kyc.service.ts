import apiClient from '../client';

export interface VerificationRequest {
  idType: string;
  idNumber: string;
}

export interface BankVerificationRequest {
  accountNumber: string;
  bankCode: string;
}

class KycService {
  async verifyIdentity(data: VerificationRequest) {
    const response = await apiClient.post('/kyc/verify-identity', data);
    return response.data;
  }

  async verifyBank(data: BankVerificationRequest) {
    const response = await apiClient.post('/kyc/verify-bank', data);
    return response.data;
  }

  async saveAddress(data: any) {
    const response = await apiClient.post('/kyc/save-address', data);
    return response.data;
  }

  async createPin(pin: string) {
    const response = await apiClient.post('/kyc/create-pin', { pin });
    return response.data;
  }
}

export default new KycService();
