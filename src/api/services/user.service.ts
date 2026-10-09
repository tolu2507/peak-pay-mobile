import apiClient from '../client';

export interface UserProfile {
  id: string;
  name: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email: string;
  phone_number: string | null;
  is_phone_verified: boolean;
  kyc_checklist?: {
    steps: Array<{
      key: string;
      label: string;
      status: string;
    }>;
    next_step: string | null;
    is_complete: boolean;
  };
  account_status: string;
  date_joined: string;
}

export interface ReferralSummary {
  referral_code: string;
  referral_count: number;
  verified_referral_count: number;
  kyc_completed_referral_count: number;
}

class UserService {
  async getMe(): Promise<UserProfile> {
    const response = await apiClient.get('/users/me/');
    return response.data;
  }

  async getReferralSummary(): Promise<ReferralSummary> {
    const response = await apiClient.get('/users/me/referrals/');
    return response.data;
  }

  async getUserById(id: string) {
    const response = await apiClient.get(`/users/${id}/`);
    return response.data;
  }
}

export default new UserService();
