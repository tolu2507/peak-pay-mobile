import type { AddressVerification, LoanEligibility } from '@/api/services/loan.service';

// Shared by the loan screens; the same rules as the web's /loans page.

export const LOAN_STEPS = 6;
export const FALLBACK_MINIMUM_AMOUNT = 10000;

export const formatNaira = (value: string | number | null | undefined, decimals = false) =>
  `₦ ${Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;

const toDate = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00` : value);

// "25 Apr, 2026"
export const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = toDate(value);
  if (isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${date.toLocaleString('en-GB', { month: 'short' })}, ${date.getFullYear()}`;
};

const ordinal = (day: number) => {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return `${day}th`;
  return `${day}${['th', 'st', 'nd', 'rd'][day % 10] || 'th'}`;
};

// "30th July, 2026"
export const formatLetterDate = (value: string) => {
  const date = toDate(value);
  return `${ordinal(date.getDate())} ${date.toLocaleString('en-GB', { month: 'long' })}, ${date.getFullYear()}`;
};

// "25th of Sep, 2026"
export const formatDueDate = (value: string) => {
  const date = toDate(value);
  return `${ordinal(date.getDate())} of ${date.toLocaleString('en-GB', { month: 'short' })}, ${date.getFullYear()}`;
};

export const daysUntil = (value: string) => Math.ceil((toDate(value).getTime() - Date.now()) / 86_400_000);

export const percent = (value: string) => `${Number(value)}%`;

// An address that is verified or under review stays usable for six months.
export const canReuseAddressRecord = (address: AddressVerification | null) => {
  if (!address || address.needs_new_address || !['verified', 'pending_review'].includes(address.status)) return false;
  const submitted = new Date(address.created_date);
  if (!Number.isFinite(submitted.getTime())) return false;
  const expiry = new Date(submitted);
  expiry.setDate(1);
  expiry.setMonth(expiry.getMonth() + 6);
  const lastDay = new Date(expiry.getFullYear(), expiry.getMonth() + 1, 0).getDate();
  expiry.setDate(Math.min(submitted.getDate(), lastDay));
  return submitted.getTime() <= Date.now() && Date.now() < expiry.getTime();
};

export type LoanRoute =
  | '/loans/offer'
  | '/loans/status'
  | '/loans/apply'
  | '/loans/statement'
  | '/loans/address';

// Where the customer continues, from the backend's view of their application.
// The address is only needed when no other answer fits.
export function loanRouteFor(eligibility: LoanEligibility, address: AddressVerification | null): LoanRoute {
  // Statements are valid for 14 days: an outdated one means sending a new statement.
  if (eligibility.assessment_status === 'statement_outdated') return '/loans/statement';
  // Approved: set up repayment and accept the offer.
  if (eligibility.application_status === 'open' && eligibility.eligibility_status === 'eligible') return '/loans/offer';
  // Waiting for a decision on an application, or on the documents.
  if (eligibility.application_status === 'open') return '/loans/status';
  if (eligibility.can_apply) return '/loans/apply';
  if (eligibility.assessment_status === 'pending_review') return '/loans/status';
  return canReuseAddressRecord(address) ? '/loans/statement' : '/loans/address';
}

// Why the customer is sending documents again.
export const EVIDENCE_NOTICES: Partial<Record<LoanEligibility['assessment_status'], string>> = {
  ineligible: "We couldn't offer you a loan based on your last bank statement. You can try again with a different bank account.",
  expired: 'Your borrowing limit expired after 14 days. Send your documents again to refresh it.',
  refresh_required: 'We need newer documents before you can apply.',
  statement_outdated:
    "Your bank statement is no longer recent, so we couldn't finish reviewing it. Pull a new statement from your bank and we'll review your eligibility again.",
};

// "5 December 2026", in Lagos time.
const retryDay = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' });

// After a decline the same account waits two weeks; a different one can be used now.
export const retrySameAccountNote = (eligibility: LoanEligibility | null | undefined) =>
  eligibility?.assessment_status === 'ineligible' && eligibility.retry_same_account_after
    ? `To use ${eligibility.declined_account || 'the same account'} again, pull a new statement from ${retryDay(eligibility.retry_same_account_after)}.`
    : '';
