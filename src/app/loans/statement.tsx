import KycService from '@/api/services/kyc.service';
import StatementService, { BankStatementRequest, StatementContext } from '@/api/services/statement.service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Checkbox,
  LoanHeader,
  Notice,
  PrimaryButton,
  TextLink,
  loanStyles as ls,
} from '@/components/loans/loan-ui';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { useKYCStore } from '@/store/useKYCStore';
import { parseLoanError, useLoanStore } from '@/store/useLoanStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// The same steps as the web's BankStatementStep: the bank texts a ticket and a
// password, the customer enters them here, and the statement arrives later.

const ACTIVE = new Set(['requested', 'ticket_sent', 'processing', 'insufficient_funds']);
const NEEDS_TICKET = new Set(['requested', 'ticket_sent', 'insufficient_funds']);
const SUPPORT_EMAIL = 'support@smartcitylimited.com';

const statementDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const mask = (value: string) => `•••• ${value.slice(-4)}`;

export default function StatementScreen() {
  const router = useRouter();
  const { submitEligibilityAssessment, isLoading: submitting, error: submissionError } = useLoanStore();
  const savedEmployment = useKYCStore((state) => state.currentEmployment?.employment_status);
  const [employmentStatus, setEmploymentStatus] = useState<string | undefined>(savedEmployment);
  const [context, setContext] = useState<StatementContext | null>(null);
  const [current, setCurrent] = useState<BankStatementRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [ticket, setTicket] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [banks, setBanks] = useState<Array<{ id: number; name: string }>>([]);
  const [bankId, setBankId] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const pollAttempt = useRef(0);
  const requestRef = useRef<BankStatementRequest | null>(null);
  const bankSheet = useRef<BottomSheetMethods>(null);

  useEffect(() => {
    let active = true;
    KycService.getCurrentEmployment()
      .then((record) => {
        if (active && record) setEmploymentStatus(record.employment_status);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const showError = (failure: unknown) => {
    const parsed = parseLoanError(failure);
    setError(parsed.message);
    setFields(parsed.fields);
  };

  const accept = useCallback((request: BankStatementRequest | null) => {
    requestRef.current = request;
    setCurrent(request);
    if (request?.ticket_no) setTicket(request.ticket_no);
    if (request?.status === 'processing' || request?.status === 'completed') setPassword('');
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const value = await StatementService.getContext(signal);
      if (!mounted.current || signal?.aborted) return;
      setContext(value);
      accept(value.current);
      setPhone(value.current?.phone_number || value.bank_account?.phone_number || '');
      setLoading(false);
      setError(null);
    },
    [accept],
  );

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    load(controller.signal).catch((failure) => {
      if (!controller.signal.aborted) {
        showError(failure);
        setLoading(false);
      }
    });
    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, [load]);

  const check = useCallback(
    async (signal?: AbortSignal) => {
      if (inFlight.current || AppState.currentState !== 'active') return;
      inFlight.current = true;
      setChecking(true);
      try {
        const request = requestRef.current;
        if (request) {
          const value = await StatementService.getById(request.id, signal);
          if (!mounted.current || signal?.aborted) return;
          accept(value);
        } else {
          await load(signal);
        }
        if (!mounted.current || signal?.aborted) return;
        setLastChecked(new Date());
        setUncertain(false);
        setError(null);
      } catch {
        if (mounted.current && !signal?.aborted) {
          setError('We could not check with your bank. Your progress is saved. Check your connection and try again.');
        }
      } finally {
        inFlight.current = false;
        if (mounted.current) setChecking(false);
      }
    },
    [accept, load],
  );

  // While the bank is working, check every 15s, slowing to once a minute, and
  // straight away when the app comes back to the foreground.
  const requestId = current?.id;
  const requestStatus = current?.status;
  useEffect(() => {
    if (!requestId || !requestStatus || !ACTIVE.has(requestStatus) || requestStatus === 'insufficient_funds') return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await check(controller.signal);
        pollAttempt.current += 1;
        if (!stopped) schedule();
      }, Math.min(15000 + pollAttempt.current * 5000, 60000));
    };
    schedule();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      clearTimeout(timer);
      void check(controller.signal).then(() => {
        if (!stopped) schedule();
      });
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      subscription.remove();
    };
  }, [requestId, requestStatus, check]);

  const start = async () => {
    if (inFlight.current || busy) return;
    const digits = phone.replace(/\D/g, '');
    if (!/^(?:0|234)?[789]\d{9}$/.test(digits)) {
      setFields({ phone: 'Enter a valid Nigerian phone number registered with this bank account.' });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const value = await StatementService.start({
        phone,
        consent: true,
        ...(bankId ? { provider_bank_id: Number(bankId) } : {}),
      });
      if (mounted.current) {
        accept(value);
        setUncertain(false);
        pollAttempt.current = 0;
      }
    } catch (failure) {
      if (!mounted.current) return;
      showError(failure);
      if (parseLoanError(failure).fields.provider_bank_id) {
        try {
          const options = await StatementService.getBanks();
          if (mounted.current) setBanks(options);
        } catch {
          if (mounted.current) setError('We could not load supported banks. Please try again.');
        }
      }
      if (!(failure as { response?: unknown }).response) {
        setUncertain(true);
        setError('We did not receive a response. Check the request status before trying again.');
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const confirm = async () => {
    if (!current || inFlight.current || busy) return;
    if (!/^\d+-\d+$/.test(ticket.trim())) {
      setFields({ ticket_no: 'Enter the complete ticket number, including the hyphen, e.g. 1137400-6.' });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const value = await StatementService.confirm(current.id, ticket.trim(), password);
      if (mounted.current) {
        accept(value);
        setPassword('');
        setUncertain(false);
        pollAttempt.current = 0;
      }
    } catch (failure) {
      if (!mounted.current) return;
      showError(failure);
      const status = (failure as { response?: { status?: number } }).response?.status;
      if (!status || status >= 500) {
        setUncertain(true);
        setError('Confirmation may still be processing. Check the status before trying again to avoid repeating a bank charge.');
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const submitForReview = async () => {
    try {
      await submitEligibilityAssessment();
      // The start screen opens the review status.
      router.replace('/loans/start');
    } catch {
      // The store holds the error, shown below.
    }
  };

  const busyAny = busy || checking || submitting;
  const usable = current?.status === 'completed' && current.is_usable;
  const showStart = !current || current.status === 'failed' || (current.status === 'completed' && !current.is_usable);
  const needsTicket = !!current && NEEDS_TICKET.has(current.status);
  const account = showStart ? context?.bank_account : current;
  const fieldError = (name: string) => (fields[name] ? <ThemedText style={ls.errorText}>{fields[name]}</ThemedText> : null);
  const selectedBank = banks.find((bank) => String(bank.id) === bankId);

  const accountAdvice =
    employmentStatus === 'employed'
      ? 'Use the account where you receive your salary for better loan offers. Confirm that this is your salary account before continuing.'
      : employmentStatus === 'self_employed'
        ? 'Use the account where you receive business income for better loan offers. Confirm that this is your business account before continuing.'
        : 'Use the account where you regularly receive income so we can assess your loan offers.';

  return (
    <ThemedView style={ls.container}>
      <SafeAreaView style={ls.safeArea}>
        <ScrollView contentContainerStyle={ls.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LoanHeader title="Bank Statement" step={2} />
          <ThemedText style={[ls.body, { marginTop: 12 }]}>Help us assess your loan with a statement from your bank.</ThemedText>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#FF7A00" />
              <ThemedText style={ls.body}>Loading your saved progress…</ThemedText>
            </View>
          ) : (
            <View style={ls.form}>
              {account && (
                <View style={ls.card}>
                  <ThemedText style={ls.heading}>Confirm your bank account</ThemedText>
                  <ThemedText style={ls.body}>{accountAdvice}</ThemedText>
                  <View style={styles.accountRow}>
                    <View>
                      <ThemedText style={styles.small}>Bank Name</ThemedText>
                      <ThemedText style={styles.strong}>{account.bank_name}</ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText style={styles.small}>Account Number</ThemedText>
                      <ThemedText style={styles.strong}>{mask(account.account_number)}</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.small}>
                    {current && !showStart ? `${statementDate(current.start_date)} – ${statementDate(current.end_date)}` : 'Last 6 months'}
                  </ThemedText>
                </View>
              )}

              {!context && (
                <PrimaryButton
                  label="Try again"
                  onPress={() => {
                    setLoading(true);
                    load().catch((failure) => {
                      showError(failure);
                      setLoading(false);
                    });
                  }}
                />
              )}

              {context && !context.available && (
                <>
                  <Notice tone="warning" text="Statement fetching is currently unavailable. Check availability to try again." />
                  <TextLink
                    label={checking ? 'Checking availability…' : 'Check availability'}
                    disabled={busyAny}
                    onPress={async () => {
                      if (inFlight.current) return;
                      inFlight.current = true;
                      setChecking(true);
                      try {
                        await load();
                      } catch (failure) {
                        if (mounted.current) showError(failure);
                      } finally {
                        inFlight.current = false;
                        if (mounted.current) setChecking(false);
                      }
                    }}
                  />
                </>
              )}

              {context && !context.bank_account && (
                <>
                  <ThemedText style={ls.body}>Add your bank account before requesting a statement.</ThemedText>
                  <TextLink label="Add bank details" onPress={() => router.push('/kyc/bank-details')} />
                </>
              )}

              {showStart && context?.available && context.bank_account && (
                <>
                  {current?.status === 'failed' && (
                    <Notice
                      tone="error"
                      text={`Your statement request could not be completed. ${current.feedback || 'Check your bank account and registered phone number before trying again.'}`}
                    />
                  )}
                  <TextLink label="Update bank details" onPress={() => router.push('/kyc/bank-details')} />
                  {current?.status === 'completed' && (
                    <Notice
                      tone="warning"
                      text={`We need an updated statement for your saved bank account. Statements must end within the last ${context.max_age_days} days.`}
                    />
                  )}

                  <View>
                    <ThemedText style={ls.fieldLabel}>Phone number registered with your bank</ThemedText>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      editable={!busyAny}
                      style={ls.input}
                      placeholderTextColor="#AAA"
                    />
                    {fieldError('phone')}
                    <ThemedText style={ls.hint}>
                      Your bank will send the ticket to this number. It must match the number on your bank account.
                    </ThemedText>
                  </View>

                  {banks.length > 0 && (
                    <View>
                      <ThemedText style={ls.fieldLabel}>Match your saved bank</ThemedText>
                      <TouchableOpacity style={[ls.input, styles.select]} onPress={() => bankSheet.current?.expand()} disabled={busyAny}>
                        <ThemedText style={{ color: selectedBank ? '#000' : '#AAA', fontSize: 14 }}>
                          {selectedBank?.name || `Select ${context.bank_account.bank_name}`}
                        </ThemedText>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                      </TouchableOpacity>
                      {fieldError('provider_bank_id')}
                      <ThemedText style={ls.hint}>
                        Choose the same bank shown above. To change your account, update your bank details.
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.privacy}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#666" />
                    <ThemedText style={[ls.body, { flex: 1, fontSize: 13 }]}>
                      Peakpay receives your statement to assess your loan. You will only enter the statement ticket and password sent by your bank.
                    </ThemedText>
                  </View>
                  <Checkbox
                    checked={consent}
                    onToggle={() => !busyAny && setConsent((value) => !value)}
                    label={`I agree to share my statement with Peakpay. ${context.charge_notice}`}
                  />
                  {fieldError('consent')}
                  <PrimaryButton
                    label={busy ? 'Fetching statement…' : current ? 'Fetch updated statement' : 'Fetch statement'}
                    onPress={() => void start()}
                    isLoading={busy}
                    disabled={!consent || !phone.trim() || busyAny || uncertain || (banks.length > 0 && !bankId)}
                  />
                </>
              )}

              {needsTicket && current && (
                <>
                  <Notice
                    tone={current.status === 'insufficient_funds' ? 'warning' : 'info'}
                    text={
                      current.status === 'insufficient_funds'
                        ? 'Your bank could not collect the statement fee. Fund this bank account, then enter your statement password again and retry confirmation.'
                        : `${current.status === 'requested' ? 'Your bank is preparing your SMS ticket.' : 'Check your bank’s SMS.'} Enter the ticket number and statement password sent to your bank-registered phone. The SMS may take a few minutes.`
                    }
                  />
                  <View>
                    <ThemedText style={ls.fieldLabel}>Ticket number</ThemedText>
                    <TextInput
                      value={ticket}
                      onChangeText={setTicket}
                      placeholder="e.g. 1137400-6"
                      placeholderTextColor="#AAA"
                      autoCorrect={false}
                      autoCapitalize="none"
                      editable={!busyAny && !uncertain}
                      style={ls.input}
                    />
                    {fieldError('ticket_no')}
                  </View>
                  <View>
                    <ThemedText style={ls.fieldLabel}>Statement password</ThemedText>
                    <View>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCorrect={false}
                        autoCapitalize="none"
                        maxLength={50}
                        editable={!busyAny && !uncertain}
                        style={[ls.input, { paddingRight: 52 }]}
                      />
                      <TouchableOpacity
                        style={styles.eye}
                        onPress={() => setShowPassword((value) => !value)}
                        accessibilityLabel={showPassword ? 'Hide statement password' : 'Show statement password'}
                      >
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {fieldError('password')}
                    <ThemedText style={ls.hint}>Use the statement password in the SMS, not your bank login password or PIN.</ThemedText>
                  </View>
                  {!!context?.charge_notice && <ThemedText style={ls.hint}>{context.charge_notice}</ThemedText>}
                  <PrimaryButton
                    label={current.status === 'insufficient_funds' ? 'Retry confirmation' : 'Confirm and retrieve statement'}
                    onPress={() => void confirm()}
                    isLoading={busy}
                    disabled={!ticket.trim() || !password || busyAny || uncertain || !context?.available}
                  />
                  <ThemedText style={ls.hint}>
                    No SMS yet? Check that your bank has the correct phone number and wait a little longer. You can leave this screen and come back to continue.
                  </ThemedText>
                </>
              )}

              {current?.status === 'processing' && (
                <View style={[ls.card, { backgroundColor: '#FFF4E8' }]}>
                  <View style={styles.inline}>
                    <ActivityIndicator color="#FF7A00" />
                    <ThemedText style={ls.heading}>Your bank is preparing your statement</ThemedText>
                  </View>
                  <ThemedText style={ls.body}>This may take a few minutes. Your progress is saved, so you can come back later.</ThemedText>
                  <ThemedText style={ls.hint}>If this remains pending, contact support before confirming again.</ThemedText>
                </View>
              )}

              {usable && (
                <Notice
                  tone="success"
                  text="Bank statement received. Submit it for review and we will set your borrowing limit before you apply."
                />
              )}

              {(uncertain || (current && ACTIVE.has(current.status))) && (
                <View>
                  <TextLink label={checking ? 'Checking your bank…' : 'Check status'} onPress={() => void check()} disabled={busyAny} />
                  {lastChecked && (
                    <ThemedText style={ls.hint}>
                      Last checked at {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                  )}
                </View>
              )}

              {usable && (
                <PrimaryButton label="Submit for eligibility review" onPress={() => void submitForReview()} isLoading={submitting} disabled={busyAny} />
              )}
            </View>
          )}

          {(error || submissionError) && (
            <View style={{ marginTop: 16 }}>
              <Notice tone="error" text={(error || submissionError) as string} />
            </View>
          )}

          <View style={styles.links}>
            <TextLink label="Contact support" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
            <TextLink label="Back to address" onPress={() => router.replace('/loans/address')} disabled={busyAny} />
            <TextLink label="Save and return home" color="#666" onPress={() => router.replace('/(tabs)')} />
          </View>
        </ScrollView>
      </SafeAreaView>

      <BottomSheet ref={bankSheet} snapPoints={['50%']} enableBackdrop backdropOpacity={0.7}>
        <ScrollView style={ls.optionsList}>
          <ThemedText style={ls.optionsHeader}>Select your bank</ThemedText>
          {banks.map((bank) => (
            <TouchableOpacity
              key={bank.id}
              style={ls.optionItem}
              onPress={() => {
                setBankId(String(bank.id));
                bankSheet.current?.close();
              }}
            >
              <ThemedText style={ls.optionText}>{bank.name}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 32 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  small: { fontSize: 12, color: '#666' },
  strong: { fontSize: 14, fontWeight: '700', color: '#000', marginTop: 2 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  privacy: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  eye: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  links: { marginTop: 28, gap: 14, alignItems: 'flex-start' },
});
