import apiClient from "../client";

export type StatementStatus =
  | "requested"
  | "ticket_sent"
  | "processing"
  | "insufficient_funds"
  | "completed"
  | "failed";

export interface BankStatementRequest {
  id: string;
  status: StatementStatus;
  feedback: string;
  bank_name: string;
  account_number: string;
  phone_number: string;
  start_date: string;
  end_date: string;
  ticket_no: string;
  has_statement: boolean;
  is_usable: boolean;
  completed_at: string | null;
  created_date: string;
  modified_date: string;
}

export interface StatementContext {
  available: boolean;
  // The salary account: where statements come from.
  bank_account: {
    id: string | null;
    bank_name: string;
    bank_code: string;
    // False when we can't pull statements from this bank.
    supports_statement: boolean;
    account_number: string;
    phone_number: string;
  } | null;
  // True while an eligibility check is being reviewed: the account can't be
  // changed until the result is back.
  account_locked?: boolean;
  statement_months: number;
  max_age_days: number;
  charge_notice: string;
  current: BankStatementRequest | null;
}

const base = "/statement-analyzer/statements/";
const inline = { skipErrorToast: true, timeout: 100000 };

class StatementService {
  async getContext(signal?: AbortSignal): Promise<StatementContext> {
    const response = await apiClient.get(`${base}context/`, {
      ...inline,
      signal,
    });
    return response.data.data;
  }

  async getCurrent(signal?: AbortSignal): Promise<BankStatementRequest | null> {
    const response = await apiClient.get(`${base}current/`, {
      ...inline,
      signal,
    });
    return response.data.data;
  }

  async getById(
    id: string,
    signal?: AbortSignal,
  ): Promise<BankStatementRequest> {
    const response = await apiClient.get(`${base}${id}/`, {
      ...inline,
      signal,
    });
    return response.data.data;
  }

  async start(data: {
    phone: string;
    consent: true;
    provider_bank_id?: number;
    // One of the customer's accounts; defaults to their salary account.
    bank_account?: string;
  }): Promise<BankStatementRequest> {
    const response = await apiClient.post(base, data, inline);
    return response.data.data;
  }

  async confirm(
    id: string,
    ticket_no: string,
    password: string,
  ): Promise<BankStatementRequest> {
    const response = await apiClient.post(
      `${base}${id}/confirm/`,
      { ticket_no, password },
      inline,
    );
    return response.data.data;
  }

  async getBanks(): Promise<
    Array<{ id: number; name: string; sort_code: string }>
  > {
    const response = await apiClient.get(`${base}banks/`, inline);
    return response.data.data;
  }
}

export default new StatementService();

