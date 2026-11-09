import apiClient from '../client';

// Repayment methods: a direct debit mandate on the customer's bank account or a
// saved debit card. Either one costs a one-time setup fee, charged by Paystack.

export interface DirectDebitAddress {
  state: string;
  city: string;
  street: string;
}

export interface DirectDebitMandate {
  id: string;
  bank_account: string;
  loan_application: string | null;
  redirect_url: string;
  // cancelled: replaced by a newer mandate before the customer authorized it.
  status: 'pending' | 'active' | 'inactive' | 'cancelled' | 'failed';
  // Blank until the bank activates the mandate and the fee is charged.
  setup_fee_status: '' | 'pending' | 'success' | 'failed';
  setup_fee_message: string;
  setup_fee_paid_at: string | null;
  activated_at: string | null;
  created_date: string;
}

export interface PaymentCard {
  id: string;
  reference: string;
  authorization_url: string;
  status: 'pending' | 'active' | 'inactive' | 'cancelled' | 'failed';
  failure_reason: string;
  card_type: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  bank: string;
  setup_fee_paid_at: string | null;
  activated_at: string | null;
  created_date: string;
}

export type RepaymentMethod = { kind: 'direct_debit'; record: DirectDebitMandate } | { kind: 'card'; record: PaymentCard };

export interface SetupProgress {
  // done: usable for repayments. waiting: check again later. failed: start over.
  state: 'done' | 'waiting' | 'failed';
  message: string;
}

// What the customer should see about a method they just set up.
export function setupProgress(method: RepaymentMethod): SetupProgress {
  if (method.kind === 'card') {
    const card = method.record;
    if (card.status === 'active') return { state: 'done', message: `Your ${card.card_type || 'card'} ending ${card.last4} is saved for repayments.` };
    if (card.status === 'failed') return { state: 'failed', message: card.failure_reason || 'We could not save your card. Try again or use another card.' };
    if (card.status === 'pending') return { state: 'waiting', message: 'Waiting for Paystack to confirm your card payment.' };
    return { state: 'failed', message: 'This card setup is no longer active. Start again.' };
  }
  const mandate = method.record;
  if (mandate.status === 'pending') return { state: 'waiting', message: 'Waiting for your bank to confirm the direct debit. This can take a few minutes.' };
  if (mandate.status !== 'active') return { state: 'failed', message: 'This direct debit is no longer active. Start again.' };
  if (mandate.setup_fee_status === 'success') return { state: 'done', message: 'Your bank account is set up for repayments.' };
  if (mandate.setup_fee_status === 'failed') {
    return { state: 'failed', message: `We could not charge the setup fee${mandate.setup_fee_message ? `: ${mandate.setup_fee_message}` : '.'} Fund your account and try again.` };
  }
  return { state: 'waiting', message: 'Your bank approved the direct debit. We are charging the setup fee.' };
}

// The loan screens show errors inline, not as a toast.
const inline = { skipErrorToast: true };

class RepaymentService {
  async listMandates(): Promise<DirectDebitMandate[]> {
    const response = await apiClient.get('/direct-debit/mandates/', inline);
    return response.data.data;
  }

  // Returns the mandate with redirect_url, where the customer authorizes it.
  async startDirectDebit(bankAccountId: string, address: DirectDebitAddress): Promise<DirectDebitMandate> {
    const response = await apiClient.post('/direct-debit/initialize/', { bank_account: bankAccountId, address }, inline);
    return response.data.data;
  }

  // Asks Paystack for the latest state; also retries a failed setup fee.
  async verifyDirectDebit(id: string): Promise<DirectDebitMandate> {
    const response = await apiClient.post(`/direct-debit/mandates/${id}/verify/`, {}, inline);
    return response.data.data;
  }

  async listCards(): Promise<PaymentCard[]> {
    const response = await apiClient.get('/payment-cards/', inline);
    return response.data.data;
  }

  // Returns the card with authorization_url, Paystack's checkout page.
  async startCard(): Promise<PaymentCard> {
    const response = await apiClient.post('/payment-cards/', {}, inline);
    return response.data.data;
  }

  async verifyCard(id: string): Promise<PaymentCard> {
    const response = await apiClient.post(`/payment-cards/${id}/verify/`, {}, inline);
    return response.data.data;
  }

  async removeDirectDebit(id: string): Promise<DirectDebitMandate> {
    const response = await apiClient.post(`/direct-debit/mandates/${id}/deactivate/`, {}, inline);
    return response.data.data;
  }

  async removeCard(id: string): Promise<PaymentCard> {
    const response = await apiClient.post(`/payment-cards/${id}/deactivate/`, {}, inline);
    return response.data.data;
  }

  async summary(): Promise<RepaymentSummary> {
    const response = await apiClient.get('/repayments/summary/', inline);
    return response.data.data;
  }

  // Newest first, with the installments each payment went to.
  async history(page = 1): Promise<{ data: Repayment[]; count: number }> {
    const response = await apiClient.get('/repayments/', { ...inline, params: { page, page_size: 20 } });
    return { data: response.data.data, count: response.data.count };
  }

  async schedule(): Promise<Installment[]> {
    const response = await apiClient.get('/repayments/schedule/', inline);
    return response.data.data;
  }

  // Creates the customer's repayment account, or retries one that failed.
  async requestVirtualAccount(): Promise<VirtualAccount> {
    const response = await apiClient.post('/repayments/virtual-account/', {}, inline);
    return response.data.data;
  }

  // Asks Paystack about a transfer that hasn't shown up yet.
  async checkPayments(): Promise<string> {
    const response = await apiClient.post('/repayments/check-payments/', {}, inline);
    return response.data.message;
  }
  // A transfer to the company account; it counts once our team confirms it.
  async reportBankTransfer(report: BankTransferReport): Promise<Repayment> {
    const form = new FormData();
    form.append('repayment_bank_account', report.repaymentBankAccountId);
    form.append('amount', report.amount);
    form.append('paid_at', report.paidAt);
    form.append('sender_name', report.senderName);
    if (report.reference) form.append('external_reference', report.reference);
    if (report.note) form.append('note', report.note);
    // React Native's FormData takes { uri, name, type } for a file.
    if (report.proof) form.append('proof', report.proof as unknown as Blob);
    const response = await apiClient.post('/repayments/', form, { ...inline, headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data.data;
  }

}

// Repayments ----------------------------------------------------------------

export interface VirtualAccount {
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'active' | 'failed';
  failure_reason: string;
  activated_at: string | null;
}

// A company account customers can transfer repayments into; managed by super admins.
export interface RepaymentBankAccount {
  id: string;
  repayment_bank: string;
  repayment_account_number: string;
  repayment_account_name: string;
}

export interface Installment {
  id: string;
  loan_application: string;
  installment_number: number;
  due_date: string;
  amount: string;
  amount_paid: string;
  balance: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  completed_at: string | null;
}

export interface RepaymentSummary {
  outstanding_balance: string;
  overdue_amount: string;
  next_installment: Installment | null;
  credit_balance: string;
  awaiting_confirmation: string;
  virtual_account: VirtualAccount | null;
  // Empty when no company account is active.
  repayment_bank_accounts: RepaymentBankAccount[];
}

export interface Repayment {
  id: string;
  amount: string;
  channel: 'virtual_account' | 'bank_transfer' | 'direct_debit' | 'card';
  platform: string;
  reference: string;
  external_reference: string;
  status: 'pending_confirmation' | 'confirmed' | 'rejected';
  paid_at: string;
  sender_name: string;
  rejection_reason: string;
  unapplied_amount: string;
  credit_refunded_at: string | null;
  // reversed_at: the loan's payout came back, so this part became credit.
  allocations: { loan_application: string; installment_number: number; due_date: string; amount: string; reversed_at: string | null }[];
  repayment_bank_account: RepaymentBankAccount | null;
  has_proof: boolean;
  created_date: string;
}

export interface BankTransferReport {
  repaymentBankAccountId: string;
  amount: string;
  paidAt: string;
  senderName: string;
  reference?: string;
  note?: string;
  proof?: { uri: string; name: string; type: string } | null;
}

const CHANNELS: Record<Repayment['channel'], string> = {
  virtual_account: 'Transfer to your PeakPay account',
  bank_transfer: 'Transfer to PeakPay bank account',
  direct_debit: 'Direct debit',
  card: 'Card',
};

// How a repayment appears in the customer's history (same as the web).
export function describeRepayment(repayment: Repayment): { title: string; status: string; tone: 'success' | 'pending' | 'failed' } {
  const account = repayment.repayment_bank_account;
  const title = account ? `Transfer to ${account.repayment_bank}` : CHANNELS[repayment.channel] || repayment.channel;
  if (repayment.status === 'rejected') return { title, status: repayment.rejection_reason ? `Not confirmed: ${repayment.rejection_reason}` : 'Not confirmed', tone: 'failed' };
  if (repayment.status === 'pending_confirmation') return { title, status: 'Awaiting confirmation', tone: 'pending' };
  const paid = repayment.allocations.filter((a) => !a.reversed_at).map((a) => `installment ${a.installment_number}`);
  const credit = Number(repayment.unapplied_amount) > 0 ? 'credit on your account' : '';
  if (!paid.length && credit) return { title, status: 'Held as credit on your account', tone: 'success' };
  const parts = [...paid, credit].filter(Boolean);
  return { title, status: parts.length ? `Paid ${parts.join(', ')}` : 'Received', tone: 'success' };
}

export default new RepaymentService();

