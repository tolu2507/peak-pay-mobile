// Which banks and accounts to offer at each step. Statements and direct debit
// only work at some banks (the backend works it out from the providers' live
// lists); a loan can be paid into an account at any bank.

export interface BankLike {
  code: string;
  supports_statement?: boolean;
  supports_direct_debit?: boolean;
}

export interface AccountLike {
  id: string;
  bank_code: string;
  account_number: string;
}

// Banks to choose a salary account from: those we can pull statements from.
// The customer's saved bank stays listed so their choice isn't silently lost.
// If no bank is marked (the statement provider is down), every bank is shown
// rather than none, and the statement step explains any problem later.
export function salaryBanks<T extends BankLike>(banks: T[], savedCode?: string | null): T[] {
  if (!banks.some(bank => bank.supports_statement)) return banks;
  return banks.filter(bank => bank.supports_statement || (!!savedCode && bank.code === savedCode));
}

function supporting(banks: BankLike[], flag: 'supports_statement' | 'supports_direct_debit'): Set<string> {
  return new Set(banks.filter(bank => bank[flag]).map(bank => bank.code));
}

// The customer's accounts at banks we can pull statements from.
export function statementAccounts<T extends AccountLike>(accounts: T[], banks: BankLike[]): T[] {
  const codes = supporting(banks, 'supports_statement');
  return accounts.filter(account => account.account_number && codes.has(account.bank_code));
}

// The customer's accounts a direct debit can be set up on, the suggested one first.
export function directDebitAccounts<T extends AccountLike>(accounts: T[], banks: BankLike[], suggestedId?: string | null): T[] {
  const codes = supporting(banks, 'supports_direct_debit');
  const usable = accounts.filter(account => account.account_number && codes.has(account.bank_code));
  return [...usable.filter(a => a.id === suggestedId), ...usable.filter(a => a.id !== suggestedId)];
}

// Accounts a loan can be paid into: any of the customer's, at any bank.
export function payoutAccounts<T extends AccountLike>(accounts: T[]): T[] {
  return accounts.filter(account => account.bank_code && account.account_number);
}
