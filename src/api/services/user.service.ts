import apiClient from '../client';

export interface UserResponse {
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  account_status: string;
  created_date: string;
  modified_date: string;
}

class UserService {
  async getCurrentUser(): Promise<UserResponse> {
    const response = await apiClient.get('/users/me/');
    return response.data;
  }

  async getUserById(id: string) {
    const response = await apiClient.get(`/users/${id}/`);
    return response.data;
  }
}

export default new UserService();
