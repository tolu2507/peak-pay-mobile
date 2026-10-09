import apiClient from '../client';

export interface SendOtpRequest {
  otp_type: 'email' | 'sms';
  otp_action_type: 'registration' | 'change_phone_number' | 'forget_password';
  identifier: string;
}

export interface VerifyOtpRequest {
  identifier: string;
  otp_code: string;
  // Signup only: applied to an unverified account once the code is confirmed.
  password?: string;
}

class OtpService {
  async sendOtp(data: SendOtpRequest) {
    // Current temporary fix for OTP sending
    const response = await apiClient.post('/otp/send-otp/', data);
    return response.data;
  }

  async verifyOtp(data: VerifyOtpRequest) {
    const response = await apiClient.post('/otp/verify-otp/', data);
    return response.data;
  }
}

export default new OtpService();
