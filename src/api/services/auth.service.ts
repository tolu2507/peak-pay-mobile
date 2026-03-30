import apiClient from '../client';

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  terms: boolean;
  privacy: boolean;
  password: string;
  referral_code?: string;
}

export interface LoginRequest {
  email_phonenumber: string;
  password: string;
  email: string;
}

export interface LogoutRequest {
  refresh: string;
}

class AuthService {
  async register(data: RegisterRequest) {
    const response = await apiClient.post('/auth/create-user/', data);
    return response.data;
  }

  async login(data: LoginRequest) {
    const response = await apiClient.post('/auth/login/', data);
    return response.data;
  }

  async logout(data: LogoutRequest) {
    const response = await apiClient.post('/auth/logout/', data);
    return response.data;
  }

  async getProfile() {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  }
}

export default new AuthService();
