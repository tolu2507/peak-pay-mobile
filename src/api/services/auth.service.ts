import apiClient from '../client';

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
  phone_number: string;
  terms: boolean;
  security_question_1: string;
  security_answer_1: string;
  security_question_2: string;
  security_answer_2: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

class AuthService {
  async register(data: RegisterRequest) {
    const response = await apiClient.post('/auth/create-user/', data);
    return response.data;
  }

  async login(data: LoginRequest) {
    const response = await apiClient.post('/auth/token/', data);
    return response.data;
  }

  async getProfile() {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  }
}

export default new AuthService();
