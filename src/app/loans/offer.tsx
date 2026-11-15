import KycService, { type BankDetailsRecord } from '@/api/services/kyc.service';
import { PopTextInput } from '@/shared/ui/base/pop-text-input';
import { Skeleton, SkeletonDetails, SkeletonGroup, SkeletonHero } from '@/shared/ui/base/skeleton';
import LoanService, { type AddressVerification, type LoanApplication, type OfferCodeDestination } from '@/api/services/loan.service';
import RepaymentService, { setupProgress, type RepaymentMethod, type RepaymentOptions, type SetupProgress } from '@/api/services/repayment.service';
import { directDebitAccounts, payoutAccounts } from '@/constants/banks';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Checkbox,
  DetailRows,
  LoanHeader,
  Notice,
  ORANGE,
  OutlineButton,
  PrimaryButton,
  TextLink,
  loanStyles as ls,
} from '@/components/loans/loan-ui';
import { formatDate, formatLetterDate, formatNaira } from '@/constants/loan';
import { OtpInput } from '@/shared/ui/base/otp-input';
import { useAuthStore } from '@/store/useAuthStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// The mobile version of the web's LoanOfferFlow: set up repayment (direct
// debit or card on Paystack), review the loan summary and offer letter, then
// accept with a one-time code and the transaction PIN.

type Stage = 'setup' | 'directDebit' | 'confirming' | 'summary' | 'letter';
type Dialog = 'otp' | 'pin' | 'processing' | 'success' | 'cancel' | null;
type PendingSetup = { kind: RepaymentMethod['kind']; id: string };

// Matches the backend's PAYSTACK_SETUP_FEE_KOBO (₦100); shown so the charge isn't a surprise.
const SETUP_FEE = 100;
const SETUP_POLL_MS = 5000;
const SETUP_POLL_TRIES = 24;
const PAYOUT_POLL_MS = 3000;
const PAYOUT_POLL_TRIES = 10;

const DIALOG_BUTTON_WIDTH = Dimensions.get('window').width - 88;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const errorMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: { message?: string; errors?: { detail?: string }[] } } })?.response?.data;
  return data?.message || data?.errors?.[0]?.detail || fallback;
};

// The setup the customer left for on Paystack, so it is confirmed when they
// come back, even after the app was closed.
const setupKey = (loanId: string) => `loan-repayment-setup:${loanId}`;
const rememberSetup = (loanId: string, setup: PendingSetup) =>
  AsyncStorage.setItem(setupKey(loanId), JSON.stringify(setup)).catch(() => undefined);
const recalledSetup = async (loanId: string): Promise<PendingSetup | null> => {
  try {
    return JSON.parse((await AsyncStorage.getItem(setupKey(loanId))) || 'null');
  } catch {
    return null;
  }
};
const forgetSetup = (loanId: string) => AsyncStorage.removeItem(setupKey(loanId)).catch(() => undefined);

async function verifySetup(setup: PendingSetup): Promise<RepaymentMethod> {
  return setup.kind === 'card'
    ? { kind: 'card', record: await RepaymentService.verifyCard(setup.id) }
    : { kind: 'direct_debit', record: await RepaymentService.verifyDirectDebit(setup.id) };
}

// How repayments are collected, for the offer letter.
async function activePaymentMethod(): Promise<string | null> {
  const [cards, mandates] = await Promise.all([
    RepaymentService.listCards().catch(() => []),
    RepaymentService.listMandates().catch(() => []),
  ]);
  const card = cards.find((item) => item.status === 'active');
  if (card) return `Card${card.last4 ? ` ending ${card.last4}` : ''}`;
  return mandates.some((item) => item.status === 'active') ? 'Direct debit' : null;
}

function Sheet({ visible, title, children, onClose }: { visible: boolean; title: string; children: React.ReactNode; onClose?: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color="#666" />
            </TouchableOpacity>
          )}
          <ThemedText style={styles.dialogTitle}>{title}</ThemedText>
          <View style={{ gap: 16, marginTop: 16 }}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

export default function LoanOfferScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [customerAddress, setCustomerAddress] = useState<AddressVerification | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [stage, setStage] = useState<Stage>('setup');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  // What can be set up: undefined while loading (nothing offered yet, so a
  // card-only customer never sees direct debit flash up), null if loading
  // failed (both are offered; the backend still refuses an unsupported bank).
  const [options, setOptions] = useState<RepaymentOptions | null | undefined>(undefined);
  // Accounts the loan can be paid into, and the one chosen.
  const [payoutChoices, setPayoutChoices] = useState<BankDetailsRecord[]>([]);
  const [payoutId, setPayoutId] = useState('');
  const [accounts, setAccounts] = useState<BankDetailsRecord[]>([]);
  const [accountId, setAccountId] = useState('');
  const [address, setAddress] = useState({ state: '', city: '', street: '' });
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [consent, setConsent] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<OfferCodeDestination | null>(null);
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const showSummary = useCallback(async (loan: LoanApplication) => {
    setApplication(loan);
    setStage('summary');
    const [addr, method] = await Promise.all([LoanService.getCurrentAddress().catch(() => null), activePaymentMethod()]);
    if (!activeRef.current) return;
    setCustomerAddress(addr);
    setPaymentMethod(method);
  }, []);

  const confirmSetup = useCallback(
    async (loan: LoanApplication, setup: PendingSetup) => {
      setStage('confirming');
      setProgress(null);
      for (let tries = 0; tries < SETUP_POLL_TRIES && activeRef.current; tries++) {
        try {
          const current = setupProgress(await verifySetup(setup));
          if (!activeRef.current) return;
          setProgress(current);
          if (current.state === 'done') {
            await forgetSetup(loan.id);
            const refreshed = await LoanService.getLoanById(loan.id);
            if (!activeRef.current) return;
            setConsent(false);
            await showSummary(refreshed);
            return;
          }
          if (current.state === 'failed') {
            await forgetSetup(loan.id);
            return;
          }
        } catch (problem) {
          if (activeRef.current) {
            setProgress({ state: 'waiting', message: errorMessage(problem, 'We could not check your repayment setup. Retrying…') });
          }
        }
        await wait(SETUP_POLL_MS);
      }
    },
    [showSummary],
  );

  // Works out where the customer is in the offer, as the web does.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const eligibility = await LoanService.getEligibility();
        if (!active) return;
        if (
          eligibility.application_status !== 'open' ||
          eligibility.eligibility_status !== 'eligible' ||
          !eligibility.application_id ||
          !eligibility.eligible_amount
        ) {
          router.replace('/loans/start');
          return;
        }
        const loan = await LoanService.getLoanById(eligibility.application_id);
        if (!active) return;
        if (loan.application_status !== 'open' || loan.eligibility_status !== 'eligible' || !loan.eligible_amount) {
          router.replace('/(tabs)');
          return;
        }
        setApplication(loan);
        setConsent(false);
        setOtp('');
        setPin('');
        setFailed(false);
        setLoading(false);
        if (loan.offer_accepted_at || loan.repayment_setup_completed_at) {
          await showSummary(loan);
          return;
        }
        const setup = await recalledSetup(loan.id);
        if (!active) return;
        if (setup) {
          await confirmSetup(loan, setup);
          return;
        }
        setStage('setup');
      } catch {
        if (active) {
          setFailed(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, router, confirmSetup, showSummary]);

  // Whether direct debit can be offered at all; a bank without it gets card only.
  useEffect(() => {
    if (stage !== 'setup' || !application) return;
    let active = true;
    RepaymentService.options()
      .then((value) => { if (active) setOptions(value); })
      .catch(() => { if (active) setOptions(null); });
    return () => { active = false; };
  }, [stage, application?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // The accounts the loan can be paid into, before the offer is accepted.
  useEffect(() => {
    if ((stage !== 'summary' && stage !== 'letter') || !application || application.offer_accepted_at) return;
    let active = true;
    KycService.listBankAccounts().then((list) => {
      if (!active) return;
      const choices = payoutAccounts(list);
      setPayoutChoices(choices);
      setPayoutId((current) => choices.some((a) => a.id === current) ? current
        : choices.find((a) => a.id === application.payout_account?.id)?.id ?? choices[0]?.id ?? '');
    }).catch(() => undefined);
    return () => { active = false; };
  }, [stage, application?.id, application?.offer_accepted_at]); // eslint-disable-line react-hooks/exhaustive-deps

  // After acceptance, wait for the payout so success is only shown once it's real.
  useEffect(() => {
    if (dialog !== 'processing' || !application) return;
    let active = true;
    void (async () => {
      for (let tries = 0; tries < PAYOUT_POLL_TRIES && active; tries++) {
        try {
          const loan = await LoanService.getLoanById(application.id);
          if (!active) return;
          setApplication(loan);
          if (loan.disbursement_status === 'disbursed') break;
        } catch {
          // Keep waiting; the result is shown either way.
        }
        await wait(PAYOUT_POLL_MS);
      }
      if (active) setDialog('success');
    })();
    return () => {
      active = false;
    };
  }, [dialog, application?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paystack opens in the browser; the setup is confirmed when it closes.
  const openPaystack = async (loan: LoanApplication, setup: PendingSetup, url: string) => {
    await rememberSetup(loan.id, setup);
    setBusy(false);
    await WebBrowser.openBrowserAsync(url).catch(() => undefined);
    if (activeRef.current) await confirmSetup(loan, setup);
  };

  const openDirectDebit = async () => {
    setNotice('');
    setBusy(true);
    try {
      const [mine, bankList, current] = await Promise.all([
        KycService.listBankAccounts(),
        KycService.getBanks(),
        LoanService.getCurrentAddress().catch(() => null),
      ]);
      // Only accounts at banks that support direct debit, the suggested one first.
      const usable = directDebitAccounts(mine, bankList, options?.direct_debit.bank_account?.id);
      setAccounts(usable);
      setAccountId(usable[0]?.id || '');
      if (current) {
        setAddress({ state: current.state, city: current.city, street: [current.house_number, current.street].filter(Boolean).join(' ') });
      }
      setStage('directDebit');
    } catch (problem) {
      setNotice(errorMessage(problem, 'We could not load your bank accounts. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const startDirectDebit = async () => {
    if (!application) return;
    setNotice('');
    setBusy(true);
    try {
      const mandate = await RepaymentService.startDirectDebit(accountId, address);
      await openPaystack(application, { kind: 'direct_debit', id: mandate.id }, mandate.redirect_url);
    } catch (problem) {
      setNotice(errorMessage(problem, 'We could not start the direct debit. Try again.'));
      setBusy(false);
    }
  };

  const startCard = async () => {
    if (!application) return;
    setNotice('');
    setBusy(true);
    try {
      const card = await RepaymentService.startCard();
      await openPaystack(application, { kind: 'card', id: card.id }, card.authorization_url);
    } catch (problem) {
      setNotice(errorMessage(problem, 'We could not start card setup. Try again.'));
      setBusy(false);
    }
  };

  const sendCode = async () => {
    if (!application) return;
    setNotice('');
    setBusy(true);
    try {
      setCodeSentTo(await LoanService.sendOfferCode(application.id));
      setOtp('');
      setPin('');
      setDialog('otp');
    } catch (problem) {
      setNotice(errorMessage(problem, 'We could not send your code. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!application) return;
    setNotice('');
    setBusy(true);
    try {
      setApplication(await LoanService.acceptOffer(application.id, otp, pin, payoutId || undefined));
      setOtp('');
      setPin('');
      setDialog('processing');
    } catch (problem) {
      // A wrong PIN or an expired code means a new code is needed.
      setNotice(errorMessage(problem, 'We could not accept your offer. Try again.'));
      setOtp('');
      setPin('');
      setDialog('otp');
    } finally {
      setBusy(false);
    }
  };

  const closeDialog = () => {
    setOtp('');
    setPin('');
    setNotice('');
    setDialog(null);
  };

  const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Customer' : 'Customer';
  const amount = application?.amount || '0';
  const paidOut = application?.disbursement_status === 'disbursed';
  // Final terms are set by the backend; the offer can't be accepted without them.
  const hasTerms =
    !!application &&
    [
      application.flat_interest_rate,
      application.management_fee,
      application.credit_life_insurance,
      application.monthly_repayment,
      application.estimated_total_amount,
      application.date_of_first_payment,
    ].every((value) => value !== null && value !== undefined);
  const termMoney = (value: string | null | undefined) => (hasTerms && value ? formatNaira(value) : 'Awaiting final terms');

  // Before acceptance the customer's choice; after it, the account the backend fixed.
  const chosenPayout = !application?.offer_accepted_at ? payoutChoices.find((a) => a.id === payoutId) : undefined;
  const paidInto = chosenPayout ?? application?.payout_account ?? null;
  const directDebitOff = !!options && !options.direct_debit.available;

  const summaryRows: Array<[string, string]> = application
    ? [
        ['Loan amount', formatNaira(amount)],
        ['Tenor', `${application.duration_in_months} months`],
        ['Interest rate', hasTerms ? `${Number(application.flat_interest_rate)}%` : 'Awaiting final terms'],
        // Older loans may carry fees; new ones are "0.00" and skip these rows.
        ...(Number(application.management_fee) > 0
          ? [['Management fees', termMoney(application.management_fee)] as [string, string]]
          : []),
        ...(Number(application.credit_life_insurance) > 0
          ? [['Credit life insurance', termMoney(application.credit_life_insurance)] as [string, string]]
          : []),
        ['Total repayment amount', termMoney(application.estimated_total_amount)],
        ['Monthly repayment', termMoney(application.monthly_repayment)],
        ['Total number of payments', String(application.duration_in_months)],
        [
          'Paid into',
          paidInto
            ? `${paidInto.bank_name} •••• ${paidInto.account_number.slice(-4)}`
            : 'Add a bank account in your name',
        ],
      ]
    : [];

  // Instalment dates count monthly from the first payment date.
  const schedule = application && hasTerms && application.date_of_first_payment
    ? Array.from({ length: Math.min(Math.max(application.duration_in_months, 0), 60) }, (_, index) => {
        const first = new Date(`${application.date_of_first_payment}T12:00:00Z`);
        const due = new Date(first);
        due.setUTCDate(1);
        due.setUTCMonth(due.getUTCMonth() + index);
        const lastDay = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, 0)).getUTCDate();
        due.setUTCDate(Math.min(first.getUTCDate(), lastDay));
        return { number: index + 1, date: due.toISOString().slice(0, 10) };
      })
    : [];

  const letterItems: Array<[string, string | null]> = application
    ? [
        ['Purpose', application.loan_reason_name],
        ['Loan Amount', formatNaira(amount, true)],
        ['Interest Rate', hasTerms ? `${Number(application.flat_interest_rate)}%` : null],
        ['Loan Term', `${application.duration_in_months} months`],
        ['Monthly Payment', hasTerms ? formatNaira(application.monthly_repayment, true) : null],
        ['First Payment Due Date', application.date_of_first_payment ? formatLetterDate(application.date_of_first_payment) : null],
        ['Total Repayment Amount', hasTerms ? formatNaira(application.estimated_total_amount, true) : null],
        ['Payment Method', paymentMethod],
      ]
    : [];

  const ordinalLabel = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 >= 11 && n % 100 <= 13 ? 0 : n % 10] || 'th'} repayment`;

  const renderStage = () => {
    if (!application) return null;
    if (stage === 'setup') {
      return (
        <>
          <LoanHeader title="Set up repayment process" step={4} onBack={() => setDialog('cancel')} />
          <View style={ls.form}>
            <ThemedText style={ls.body}>
              Choose how your monthly repayments will be collected. You will review your loan terms and offer letter before confirming the loan.
            </ThemedText>
            <View style={ls.card}>
              <ThemedText style={styles.small}>Eligible loan amount</ThemedText>
              <ThemedText style={styles.big}>{formatNaira(amount)}</ThemedText>
            </View>
            {options === undefined ? (
              <SkeletonGroup style={{ gap: 12 }}>
                <Skeleton height={72} radius={14} />
                <Skeleton height={72} radius={14} />
              </SkeletonGroup>
            ) : (
              <>
            {directDebitOff ? (
              <View style={[styles.option, { backgroundColor: '#F9FAFB', borderColor: '#F0F0F0' }]}>
                <Ionicons name="business-outline" size={22} color="#9CA3AF" />
                <ThemedText style={[styles.small, { flex: 1 }]}>
                  {options?.direct_debit.reason || "Direct debit isn't available for your bank. Use a debit card instead."}
                </ThemedText>
              </View>
            ) : (
              <TouchableOpacity style={styles.option} onPress={openDirectDebit} disabled={busy}>
                <Ionicons name="business-outline" size={22} color={ORANGE} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <ThemedText style={styles.optionTitle}>Direct debit from your bank account</ThemedText>
                    {options?.recommended === 'direct_debit' && (
                      <ThemedText style={styles.badge}>Recommended</ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.small}>
                    {options?.direct_debit.bank_account
                      ? `From ${options.direct_debit.bank_account.bank_name} •••• ${options.direct_debit.bank_account.account_number.slice(-4)}. `
                      : ''}
                    Authorize your bank to pay each instalment.
                  </ThemedText>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.option} onPress={startCard} disabled={busy}>
              <Ionicons name="card-outline" size={22} color={ORANGE} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.optionTitle}>Debit card</ThemedText>
                <ThemedText style={styles.small}>Save your card on Paystack&apos;s secure page.</ThemedText>
              </View>
            </TouchableOpacity>
              </>
            )}
            {busy && <ActivityIndicator color={ORANGE} />}
            <ThemedText style={ls.hint}>
              A one-time setup fee of {formatNaira(SETUP_FEE)} is charged through Paystack when your repayment method is confirmed.
            </ThemedText>
          </View>
        </>
      );
    }
    if (stage === 'directDebit') {
      return (
        <>
          <LoanHeader title="Set up repayment process" step={4} onBack={() => { setNotice(''); setStage('setup'); }} />
          <View style={ls.form}>
            <ThemedText style={ls.body}>
              Choose the account your repayments will come from. Your bank will ask you to approve the direct debit on the next page.
            </ThemedText>
            {accounts.length === 0 ? (
              <>
                <Notice tone="warning" text="None of your bank accounts supports direct debit. Use a debit card for your repayments instead." />
                <PrimaryButton label="Use a debit card" onPress={() => void startCard()} isLoading={busy} />
              </>
            ) : (
              <>
                <ThemedText style={ls.fieldLabel}>Bank account</ThemedText>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[styles.option, account.id === accountId && { borderColor: ORANGE }]}
                    onPress={() => setAccountId(account.id)}
                  >
                    <Ionicons name={account.id === accountId ? 'radio-button-on' : 'radio-button-off'} size={20} color={ORANGE} />
                    <ThemedText style={styles.optionTitle}>
                      {account.bank_name} · •••• {account.account_number.slice(-4)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
                <ThemedText style={ls.fieldLabel}>Your address</ThemedText>
                <PopTextInput style={ls.input} placeholder="Street" placeholderTextColor="#8E8E93" value={address.street} maxLength={255} onChangeText={(street) => setAddress({ ...address, street })} />
                <PopTextInput style={ls.input} placeholder="City" placeholderTextColor="#8E8E93" value={address.city} maxLength={100} onChangeText={(city) => setAddress({ ...address, city })} />
                <PopTextInput style={ls.input} placeholder="State" placeholderTextColor="#8E8E93" value={address.state} maxLength={100} onChangeText={(state) => setAddress({ ...address, state })} />
                <ThemedText style={ls.hint}>Once your bank approves it, a {formatNaira(SETUP_FEE)} setup fee is debited from this account.</ThemedText>
                <PrimaryButton
                  label="Continue to your bank"
                  onPress={() => void startDirectDebit()}
                  isLoading={busy}
                  disabled={!accountId || !address.street.trim() || !address.city.trim() || !address.state.trim()}
                />
              </>
            )}
          </View>
        </>
      );
    }
    if (stage === 'confirming') {
      return (
        <>
          <LoanHeader title="Set up repayment process" step={4} onBack={() => { setProgress(null); setStage('setup'); }} />
          <View style={[ls.form, { alignItems: 'center' }]}>
            {progress?.state === 'failed' ? (
              <Ionicons name="close-circle-outline" size={40} color="#FF3B30" />
            ) : (
              <ActivityIndicator size="large" color={ORANGE} />
            )}
            <ThemedText style={[ls.body, { textAlign: 'center' }]}>{progress?.message || 'Checking your repayment setup…'}</ThemedText>
            {progress?.state === 'failed' ? (
              <PrimaryButton label="Choose a repayment method" onPress={() => { setProgress(null); setStage('setup'); }} />
            ) : (
              <TextLink label="Check again" onPress={() => { setLoading(true); setAttempt((value) => value + 1); }} />
            )}
          </View>
        </>
      );
    }
    if (stage === 'summary') {
      return (
        <>
          <LoanHeader title="Loan Summary" step={5} onBack={() => setDialog('cancel')} />
          <View style={{ marginTop: 12 }}>
            <DetailRows rows={summaryRows} />
          </View>
          {!hasTerms && (
            <ThemedText style={[ls.hint, { color: '#B45309' }]}>
              Final pricing and a repayment schedule must be provided for this offer before it can be accepted.
            </ThemedText>
          )}
          {schedule.length > 0 && (
            <View style={styles.scheduleBox}>
              {schedule.map((row) => (
                <View key={row.number} style={styles.scheduleRow}>
                  <ThemedText style={styles.scheduleText}>{ordinalLabel(row.number)}</ThemedText>
                  <ThemedText style={styles.scheduleText}>{formatNaira(application.monthly_repayment)}</ThemedText>
                  <ThemedText style={styles.scheduleText}>{formatDate(row.date)}</ThemedText>
                </View>
              ))}
              <ThemedText style={[ls.hint, { paddingHorizontal: 12, paddingBottom: 12 }]}>
                Dates are counted from the day your loan is paid out; the last payment absorbs any rounding.
              </ThemedText>
            </View>
          )}
          <View style={ls.footer}>
            {application.offer_accepted_at ? (
              <>
                <Notice
                  tone="success"
                  text={
                    paidOut
                      ? `Your loan of ${formatNaira(application.disbursed_amount || amount)} has been paid to your bank account.`
                      : 'You have accepted this offer. We are paying your loan into your bank account and will notify you when it arrives.'
                  }
                />
                <PrimaryButton label="Go to my loan" onPress={() => router.replace('/(tabs)/loans')} />
              </>
            ) : (
              <>
                <PrimaryButton label="View offer letter" disabled={!hasTerms} onPress={() => { setConsent(false); setStage('letter'); }} />
                <OutlineButton label="Cancel" onPress={() => setDialog('cancel')} />
              </>
            )}
          </View>
        </>
      );
    }
    // Offer letter
    return (
      <>
        <LoanHeader title="Offer letter" onBack={() => setStage('summary')} />
        <View style={{ marginTop: 16, gap: 14 }}>
          <ThemedText style={ls.body}>
            Date: {formatLetterDate(new Date().toISOString())}
            {'\n'}Name of Customer: {customerName}
            {customerAddress ? `\nAddress of Customer: ${customerAddress.house_number} ${customerAddress.street}, ${customerAddress.city}, ${customerAddress.state}` : ''}
          </ThemedText>
          <ThemedText style={ls.body}>
            Dear <ThemedText style={styles.bold}>{customerName}</ThemedText>, your application for{' '}
            {application.loan_reason_name ? `a ${application.loan_reason_name} loan` : 'a loan'} with Peakpay Limited has been approved. Here is a breakdown of the details:
          </ThemedText>
          <ThemedText style={ls.body}>
            By accepting, you agree to repay the total amount in monthly instalments collected from your chosen repayment method.
          </ThemedText>
          <ThemedText style={ls.heading}>Loan Details:</ThemedText>
          <View style={{ gap: 4 }}>
            {letterItems
              .filter(([, value]) => value)
              .map(([label, value], index) => (
                <ThemedText key={label} style={styles.bullet}>
                  •  {label}: <ThemedText style={[styles.bullet, index > 0 && { color: ORANGE }]}>{value}</ThemedText>
                </ThemedText>
              ))}
          </View>
          <View style={styles.payoutBox}>
            {payoutChoices.length > 1 ? (
              <>
                <ThemedText style={ls.fieldLabel}>Pay my loan into</ThemedText>
                {payoutChoices.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[styles.option, { backgroundColor: '#FFF' }, account.id === payoutId && { borderColor: ORANGE }]}
                    onPress={() => setPayoutId(account.id)}
                  >
                    <Ionicons name={account.id === payoutId ? 'radio-button-on' : 'radio-button-off'} size={20} color={ORANGE} />
                    <ThemedText style={styles.optionTitle}>
                      {account.bank_name} · •••• {account.account_number.slice(-4)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <ThemedText style={ls.body}>
                Paid into{' '}
                <ThemedText style={styles.bold}>
                  {paidInto ? `${paidInto.bank_name} •••• ${paidInto.account_number.slice(-4)}` : 'your bank account'}
                </ThemedText>
              </ThemedText>
            )}
            <TextLink
              label="Add another account to be paid into"
              onPress={() => router.push('/kyc/bank-details?edit=loan-bank&return=/loans/offer' as any)}
            />
          </View>
          <View style={{ marginTop: 8 }}>
            <Checkbox checked={consent} onToggle={() => setConsent((value) => !value)} label="I hereby accept the Terms and Conditions of this offer" />
          </View>
          {!!notice && dialog === null && <Notice tone="error" text={notice} />}
        </View>
        <View style={ls.footer}>
          <PrimaryButton label={busy ? 'Sending code…' : 'Accept'} onPress={() => void sendCode()} isLoading={busy} disabled={!consent || !hasTerms} />
          <OutlineButton label="Decline" onPress={() => { setConsent(false); setDialog('cancel'); }} />
        </View>
      </>
    );
  };

  return (
    <ThemedView style={ls.container}>
      <SafeAreaView style={ls.safeArea}>
        <ScrollView contentContainerStyle={ls.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {loading ? (
            <>
              <LoanHeader title="Your loan offer" />
              <SkeletonGroup style={{ gap: 20, marginTop: 20 }}>
                <SkeletonHero />
                <View style={{ backgroundColor: '#FFF' }}><SkeletonDetails rows={6} /></View>
                <Skeleton height={56} radius={16} />
              </SkeletonGroup>
            </>
          ) : failed ? (
            <>
              <LoanHeader title="Your loan offer" />
              <View style={ls.form}>
                <ThemedText style={ls.body}>We could not load your loan offer.</ThemedText>
                <PrimaryButton label="Try again" onPress={() => { setLoading(true); setAttempt((value) => value + 1); }} />
              </View>
            </>
          ) : (
            <>
              {renderStage()}
              {!!notice && stage !== 'letter' && dialog === null && (
                <View style={{ marginTop: 16 }}>
                  <Notice tone="error" text={notice} />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={dialog === 'cancel'} title="Why leave now?" onClose={closeDialog}>
        <ThemedText style={ls.body}>
          You can come back to your open loan application later. Leaving now will not cancel or close your application.
        </ThemedText>
        <PrimaryButton width={DIALOG_BUTTON_WIDTH} label="Review loan details" onPress={closeDialog} />
        <OutlineButton width={DIALOG_BUTTON_WIDTH} label="Return to Home" onPress={() => { closeDialog(); router.replace('/(tabs)'); }} />
      </Sheet>

      <Sheet visible={dialog === 'otp'} title="Confirm with code" onClose={closeDialog}>
        <ThemedText style={ls.body}>
          {codeSentTo
            ? `Enter the 6-digit code we sent ${codeSentTo.channel === 'sms' ? 'by SMS to' : 'to'} ${codeSentTo.destination}.`
            : 'Request a code to confirm your offer.'}
        </ThemedText>
        <OtpInput
          otpCount={6}
          onInputChange={setOtp}
          unfocusedBackgroundColor="#FFF"
          unfocusedBorderColor="#F0F0F0"
          focusedBorderColor={ORANGE}
          focusedBackgroundColor="#FFF"
          textStyle={{ color: '#000' }}
        />
        {!!notice && <ThemedText style={ls.errorText}>{notice}</ThemedText>}
        <PrimaryButton width={DIALOG_BUTTON_WIDTH} label="Proceed" disabled={otp.length !== 6} onPress={() => { setNotice(''); setPin(''); setDialog('pin'); }} />
        <TextLink label={busy ? 'Sending…' : 'Send a new code'} disabled={busy} onPress={() => void sendCode()} />
      </Sheet>

      <Sheet visible={dialog === 'pin'} title="Enter Transaction PIN" onClose={closeDialog}>
        <ThemedText style={ls.body}>Enter your 4-digit transaction PIN to accept the loan.</ThemedText>
        <OtpInput
          otpCount={4}
          onInputChange={setPin}
          unfocusedBackgroundColor="#FFF"
          unfocusedBorderColor="#F0F0F0"
          focusedBorderColor={ORANGE}
          focusedBackgroundColor="#FFF"
          textStyle={{ color: '#000' }}
        />
        <PrimaryButton width={DIALOG_BUTTON_WIDTH} label={busy ? 'Confirming…' : 'Accept loan'} isLoading={busy} disabled={pin.length !== 4} onPress={() => void accept()} />
      </Sheet>

      <Sheet visible={dialog === 'processing'} title="Loan Tip 101">
        <ActivityIndicator size="large" color={ORANGE} />
        <ThemedText style={[ls.body, { textAlign: 'center' }]}>Paying your loan on time helps build a positive repayment history.</ThemedText>
        <ThemedText style={[ls.hint, { textAlign: 'center' }]}>Paying out your loan…</ThemedText>
      </Sheet>

      <Sheet visible={dialog === 'success'} title={paidOut ? 'Congratulations' : 'Offer accepted'}>
        <Ionicons name="trophy-outline" size={56} color={ORANGE} style={{ alignSelf: 'center' }} />
        <ThemedText style={[ls.body, { textAlign: 'center' }]}>
          {paidOut
            ? `${formatNaira(application?.disbursed_amount || amount)} has been paid to your bank account.`
            : `Your loan of ${formatNaira(amount)} is on its way. We will notify you as soon as it reaches your bank account.`}
        </ThemedText>
        <PrimaryButton width={DIALOG_BUTTON_WIDTH} label="Continue" onPress={() => { setDialog(null); router.replace('/(tabs)/loans'); }} />
      </Sheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B35F00',
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  payoutBox: { gap: 10, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginTop: 8 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 32 },
  small: { fontSize: 12, color: '#4B4B55' },
  big: { fontSize: 22, fontWeight: '700', color: '#000' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
  },
  optionTitle: { fontSize: 14, fontWeight: '600', color: '#000' },
  scheduleBox: { backgroundColor: '#F3F4F6', borderRadius: 12, marginTop: 16 },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  scheduleText: { fontSize: 12, color: '#333' },
  bold: { fontWeight: '700', color: '#000' },
  bullet: { fontSize: 14, fontWeight: '600', color: '#000', lineHeight: 21 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'stretch' },
  close: { position: 'absolute', right: 12, top: 12, padding: 6, zIndex: 1 },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#000', paddingRight: 32 },
});

