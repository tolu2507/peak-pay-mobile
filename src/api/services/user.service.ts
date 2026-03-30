import apiClient from '../client';

class UserService {
  async getUserById(id: string) {
    const response = await apiClient.get(`/users/${id}/`);
    return response.data;
  }
}

export default new UserService();
