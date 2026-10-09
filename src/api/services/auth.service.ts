import apiClient from '../client';

export interface RegisterRequest {
  first_name: string;
  // Optional; null when the user has no middle name.
  middle_name?: string | null;
  last_name: string;
  email: string;
  terms: boolean;
  privacy: boolean;
  password: string;
  referral_code?: string;
  how_did_you_hear?: string;
}

export interface LoginRequest {
  email_phonenumber: string;
  password: string;
  email: string;
}

export interface LogoutRequest {
  refresh: string;
}

export interface PasswordResetRequest {
  identifier: string;
  otp_code: string;
  new_password: string;
}

class AuthService {
  async register(data: RegisterRequest) {
    const response = await apiClient.post('/auth/create-user/', data);
    return response.data;
  }

  async login(data: LoginRequest) {
    const response = await apiClient.post('/auth/login/', data);
    console.log({ responses: response.data })
    return response.data;
  }

  async logout(data: LogoutRequest) {
    const response = await apiClient.post('/auth/logout/', data);
    return response.data;
  }

  async resetPassword(data: PasswordResetRequest) {
    const response = await apiClient.post('/auth/password/reset/', data);
    return response.data;
  }

  async getProfile() {
    const response = await apiClient.get('/auth/profile/');
    return response.data;
  }
}

export default new AuthService();
