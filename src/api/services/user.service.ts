import apiClient from '../client';
import { useAuthStore } from '../../store/useAuthStore';

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
  // Several screens ask at once on start-up; share one request per session.
  private profileRequests = new Map<string | null, Promise<UserProfile>>();

  getMe(): Promise<UserProfile> {
    const token = useAuthStore.getState().token;
    const existing = this.profileRequests.get(token);
    if (existing) return existing;
    const pending = apiClient.get('/users/me/').then(response => response.data as UserProfile)
      .finally(() => { this.profileRequests.delete(token); });
    this.profileRequests.set(token, pending);
    return pending;
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
