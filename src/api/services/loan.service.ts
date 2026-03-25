import apiClient from '../client';

export interface LoanApplicationRequest {
  amount: number;
  duration: number;
  purpose: string;
  address: {
    houseNumber: string;
    street: string;
    landmark: string;
    city: string;
    state: string;
    lga: string;
  };
}

class LoanService {
  async apply(data: LoanApplicationRequest) {
    const response = await apiClient.post('/loans/apply', data);
    return response.data;
  }

  async getLoans() {
    const response = await apiClient.get('/loans');
    return response.data;
  }

  async getLoanDetails(id: string) {
    const response = await apiClient.get(`/loans/${id}`);
    return response.data;
  }
}

export default new LoanService();
