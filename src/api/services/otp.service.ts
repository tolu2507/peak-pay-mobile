import apiClient from '../client';

export interface SendOtpRequest {
  otp_type: 'email' | 'sms';
  otp_action_type: 'registration' | 'login' | 'password_reset' | 'kyc';
  identifier: string;
}

export interface VerifyOtpRequest {
  identifier: string;
  otp_code: string;
}

class OtpService {
  async sendOtp(data: SendOtpRequest) {
    const response = await apiClient.post('/otp/send-otp/', data);
    return response.data;
  }

  async verifyOtp(data: VerifyOtpRequest) {
    const response = await apiClient.post('/otp/verify-otp/', data);
    return response.data;
  }
}

export default new OtpService();
