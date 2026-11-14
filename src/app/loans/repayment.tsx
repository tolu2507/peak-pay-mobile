import { PopTextInput } from '@/shared/ui/base/pop-text-input';
import { SkeletonCard, SkeletonGroup, SkeletonHero, SkeletonList } from '@/shared/ui/base/skeleton';
import RepaymentService, {
  describeRepayment,
  type Installment,
  type Repayment,
  type RepaymentBankAccount,
  type RepaymentSummary,
  type VirtualAccount,
} from '@/api/services/repayment.service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoanHeader, Notice, ORANGE, OutlineButton, PrimaryButton, TextLink, loanStyles as ls } from '@/components/loans/loan-ui';
import { formatDate, formatNaira } from '@/constants/loan';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// The mobile version of the web's /repayment page: pay into the customer's own
// PeakPay account (confirmed automatically) or into a company bank account and
// report the transfer (confirmed by the team).

const PAGE_SIZE = 20;
const PROOF_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const PROOF_MAX_BYTES = 5 * 1024 * 1024;

const errorMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: { message?: string; errors?: { detail?: string }[] } } })?.response?.data;
  return data?.message || data?.errors?.[0]?.detail || fallback;
};

const pad = (value: number) => String(value).padStart(2, '0');
const todayParts = () => {
  const now = new Date();
  return { date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`, time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
};

// "2026-11-09" + "14:05" in the phone's time zone; null when not a real past time.
const parsePaidAt = (date: string, time: string): Date | null => {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const value = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  if (isNaN(value.getTime()) || value.getMonth() !== Number(d[2]) - 1 || Number(t[1]) > 23) return null;
  return value.getTime() <= Date.now() + 60_000 ? value : null;
};

const TONES = {
  success: { bg: '#EEF9F6', fg: '#1E9F85' },
  pending: { bg: '#FFF7E6', fg: '#B45309' },
  failed: { bg: '#FFF4F3', fg: '#FF3B30' },
};

export default function RepaymentScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<RepaymentSummary | null>(null);
  const [schedule, setSchedule] = useState<Installment[]>([]);
  const [history, setHistory] = useState<Repayment[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [method, setMethod] = useState<'account' | 'bank'>('account');

  const load = useCallback(async () => {
    try {
      const [nextSummary, nextSchedule, nextHistory] = await Promise.all([
        RepaymentService.summary(),
        RepaymentService.schedule(),
        RepaymentService.history(1),
      ]);
      setSummary(nextSummary);
      setSchedule(nextSchedule);
      setHistory(nextHistory.data);
      setCount(nextHistory.count);
      setPage(1);
      setError('');
    } catch (problem) {
      setError(errorMessage(problem, 'We could not load your repayments. Pull down to try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await RepaymentService.history(page + 1);
      setHistory((items) => [...items, ...next.data]);
      setCount(next.count);
      setPage(page + 1);
    } catch (problem) {
      setError(errorMessage(problem, 'We could not load more repayments. Try again.'));
    } finally {
      setLoadingMore(false);
    }
  };

  const owes = !!summary && (Number(summary.outstanding_balance) > 0 || Number(summary.awaiting_confirmation) > 0);
  const hasCompanyAccounts = !!summary && summary.repayment_bank_accounts.length > 0;

  return (
    <ThemedView style={ls.container}>
      <SafeAreaView style={ls.safeArea}>
        <ScrollView
          contentContainerStyle={ls.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={ORANGE} />}
        >
          <LoanHeader title="Make Repayment" />

          <View style={ls.form}>
            {!!error && <Notice tone="error" text={error} />}
            {!!notice && <Notice tone="success" text={notice} />}

            {loading ? (
              <SkeletonGroup style={{ gap: 20 }}>
                <SkeletonHero />
                <SkeletonCard lines={2} />
                <SkeletonList rows={3} />
              </SkeletonGroup>
            ) : summary && (
              <>
                <Balances summary={summary} />

                {owes ? (
                  <View style={styles.section}>
                    <ThemedText style={ls.heading}>How would you like to pay?</ThemedText>
                    <ThemedText style={ls.hint}>
                      Pay any amount, any time. Payments go to your oldest unpaid instalment first. A saved card or direct debit is still charged on the due date for whatever is left.
                    </ThemedText>
                    <MethodOption
                      active={method === 'account'}
                      onPress={() => setMethod('account')}
                      icon="wallet-outline"
                      title="Your PeakPay account"
                      detail="Confirmed automatically"
                    />
                    {hasCompanyAccounts && (
                      <MethodOption
                        active={method === 'bank'}
                        onPress={() => setMethod('bank')}
                        icon="business-outline"
                        title="PeakPay bank account"
                        detail="Confirmed by our team"
                      />
                    )}
                    {method === 'account' || !hasCompanyAccounts ? (
                      <VirtualAccountPanel account={summary.virtual_account} onChange={load} onNotice={setNotice} onError={setError} />
                    ) : (
                      <BankTransferPanel
                        accounts={summary.repayment_bank_accounts}
                        suggested={summary.next_installment?.balance}
                        onDone={(message) => { setNotice(message); setMethod('account'); void load(); }}
                        onError={setError}
                      />
                    )}
                  </View>
                ) : (
                  <View style={styles.section}>
                    <ThemedText style={ls.body}>
                      {schedule.length ? 'You have no repayments outstanding.' : 'You have no loans to repay yet.'}
                    </ThemedText>
                    <TextLink label="Back to Loans" onPress={() => router.replace('/(tabs)/loans')} />
                  </View>
                )}

                {schedule.length > 0 && <ScheduleList schedule={schedule} />}

                <View style={styles.section}>
                  <ThemedText style={ls.heading}>Repayment history</ThemedText>
                  {history.length === 0 ? (
                    <ThemedText style={ls.body}>No repayments yet.</ThemedText>
                  ) : (
                    history.map((repayment) => <HistoryItem key={repayment.id} repayment={repayment} />)
                  )}
                  {history.length < count && history.length >= PAGE_SIZE && (
                    <TextLink label={loadingMore ? 'Loading…' : 'Show more'} disabled={loadingMore} onPress={() => void loadMore()} />
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Balances({ summary }: { summary: RepaymentSummary }) {
  const next = summary.next_installment;
  const items: Array<{ label: string; value: string; alert?: boolean }> = [
    { label: 'Outstanding balance', value: formatNaira(summary.outstanding_balance, true) },
    { label: next ? `Next due ${formatDate(next.due_date)}` : 'Next payment', value: next ? formatNaira(next.balance, true) : '—' },
    ...(Number(summary.overdue_amount) > 0 ? [{ label: 'Overdue', value: formatNaira(summary.overdue_amount, true), alert: true }] : []),
    ...(Number(summary.awaiting_confirmation) > 0 ? [{ label: 'Awaiting confirmation', value: formatNaira(summary.awaiting_confirmation, true) }] : []),
    ...(Number(summary.credit_balance) > 0 ? [{ label: "Credit (we'll refund this)", value: formatNaira(summary.credit_balance, true) }] : []),
  ];
  return (
    <View style={styles.balances}>
      {items.map((item) => (
        <View key={item.label} style={[styles.balance, item.alert && { backgroundColor: '#FFF4F3' }]}>
          <ThemedText style={styles.small}>{item.label}</ThemedText>
          <ThemedText style={[styles.balanceValue, item.alert && { color: '#FF3B30' }]}>{item.value}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function MethodOption({
  active,
  onPress,
  icon,
  title,
  detail,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      style={[styles.option, active && { borderColor: ORANGE, backgroundColor: '#FFF4E8' }]}
    >
      <Ionicons name={icon} size={20} color={ORANGE} />
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={styles.small}>{detail}</ThemedText>
      </View>
      <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={ORANGE} />
    </TouchableOpacity>
  );
}

function AccountDetails({ bank, number, name }: { bank: string; number: string; name: string }) {
  return (
    <View style={ls.card}>
      <ThemedText style={styles.small}>Bank</ThemedText>
      <ThemedText style={styles.optionTitle}>{bank}</ThemedText>
      <ThemedText style={[styles.small, { marginTop: 6 }]}>Account number</ThemedText>
      {/* Selectable so the customer can press and hold to copy it. */}
      <ThemedText selectable style={styles.accountNumber}>{number}</ThemedText>
      <ThemedText style={[styles.small, { marginTop: 6 }]}>Account name</ThemedText>
      <ThemedText style={styles.optionTitle}>{name}</ThemedText>
      <ThemedText style={[ls.hint, { marginTop: 4 }]}>Press and hold the account number to copy it.</ThemedText>
    </View>
  );
}

function VirtualAccountPanel({
  account,
  onChange,
  onNotice,
  onError,
}: {
  account: VirtualAccount | null;
  onChange: () => Promise<void>;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    onError('');
    onNotice('');
    try {
      onNotice(await task());
      await onChange();
    } catch (problem) {
      onError(errorMessage(problem, 'Something went wrong. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (account?.status === 'active') {
    return (
      <View style={{ gap: 12 }}>
        <AccountDetails bank={account.bank_name} number={account.account_number} name={account.account_name} />
        <ThemedText style={ls.hint}>
          This account is yours alone and doesn&apos;t expire. Transfer any amount from any bank app; it shows here within a few minutes.
        </ThemedText>
        <OutlineButton label={busy ? 'Checking…' : "I've paid, but it isn't showing"} disabled={busy} onPress={() => void run(() => RepaymentService.checkPayments())} />
      </View>
    );
  }
  if (account?.status === 'pending') {
    return (
      <View style={{ gap: 12 }}>
        <Notice tone="info" text="We're creating your repayment account. This usually takes a few minutes." />
        <OutlineButton label={busy ? 'Refreshing…' : 'Refresh'} disabled={busy} onPress={() => void run(async () => '')} />
      </View>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      <ThemedText style={ls.body}>
        {account?.status === 'failed'
          ? "We couldn't create your repayment account yet. It needs your verified BVN and an active bank account on your profile."
          : 'Get a bank account number of your own to repay into.'}
      </ThemedText>
      <PrimaryButton
        label={account?.status === 'failed' ? 'Try again' : 'Create my repayment account'}
        isLoading={busy}
        onPress={() =>
          void run(async () => {
            const created = await RepaymentService.requestVirtualAccount();
            return created.status === 'failed' ? '' : 'Your repayment account is being created.';
          })
        }
      />
    </View>
  );
}

function BankTransferPanel({
  accounts,
  suggested,
  onDone,
  onError,
}: {
  accounts: RepaymentBankAccount[];
  suggested?: string;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0].id);
  const account = accounts.find((item) => item.id === accountId) || accounts[0];
  const [form, setForm] = useState(() => ({
    amount: suggested ? String(Number(suggested)) : '',
    ...todayParts(),
    senderName: '',
    reference: '',
  }));
  const [proof, setProof] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const paidAt = parsePaidAt(form.date, form.time);
  const valid = Number(form.amount) >= 1 && !!form.senderName.trim() && !!paidAt;

  const pickProof = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: PROOF_TYPES, copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    if (asset.size && asset.size > PROOF_MAX_BYTES) {
      setProofError('The receipt must be 5MB or smaller.');
      return;
    }
    const extension = asset.name.split('.').pop()?.toLowerCase() || '';
    setProofError(null);
    setProof({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || (extension === 'pdf' ? 'application/pdf' : `image/${extension === 'jpg' ? 'jpeg' : extension}`),
    });
  };

  const submit = async () => {
    if (!valid || !paidAt) return;
    setSaving(true);
    onError('');
    try {
      await RepaymentService.reportBankTransfer({
        repaymentBankAccountId: account.id,
        amount: form.amount,
        paidAt: paidAt.toISOString(),
        senderName: form.senderName.trim(),
        reference: form.reference.trim(),
        proof,
      });
      onDone("Thanks. We'll confirm your payment against our bank statement, usually within one working day.");
    } catch (problem) {
      onError(errorMessage(problem, 'We could not send your payment details. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {accounts.length > 1 && (
        <>
          <ThemedText style={ls.fieldLabel}>Account you paid into</ThemedText>
          {accounts.map((item) => (
            <MethodOption
              key={item.id}
              active={item.id === account.id}
              onPress={() => setAccountId(item.id)}
              icon="business-outline"
              title={item.repayment_bank}
              detail={item.repayment_account_number}
            />
          ))}
        </>
      )}
      <AccountDetails bank={account.repayment_bank} number={account.repayment_account_number} name={account.repayment_account_name} />
      <ThemedText style={ls.hint}>After you transfer, tell us below so our team can match it to your loan. It counts once confirmed.</ThemedText>

      <View>
        <ThemedText style={ls.fieldLabel}>Amount sent (₦)</ThemedText>
        <PopTextInput
          style={ls.input}
          keyboardType="decimal-pad"
          value={form.amount}
          onChangeText={(amount) => setForm({ ...form, amount: amount.replace(/[^\d.]/g, '') })}
        />
      </View>
      <View style={styles.row}>
        <View style={{ flex: 3 }}>
          <ThemedText style={ls.fieldLabel}>Date sent</ThemedText>
          <PopTextInput style={ls.input} placeholder="YYYY-MM-DD" placeholderTextColor="#8E8E93" value={form.date} onChangeText={(date) => setForm({ ...form, date })} />
        </View>
        <View style={{ flex: 2 }}>
          <ThemedText style={ls.fieldLabel}>Time</ThemedText>
          <PopTextInput style={ls.input} placeholder="HH:MM" placeholderTextColor="#8E8E93" value={form.time} onChangeText={(time) => setForm({ ...form, time })} />
        </View>
      </View>
      {!paidAt && <ThemedText style={ls.errorText}>Enter when you sent it, e.g. 2026-11-09 and 14:05. It can&apos;t be in the future.</ThemedText>}
      <View>
        <ThemedText style={ls.fieldLabel}>Name on the sending account</ThemedText>
        <PopTextInput style={ls.input} maxLength={255} value={form.senderName} onChangeText={(senderName) => setForm({ ...form, senderName })} />
      </View>
      <View>
        <ThemedText style={ls.fieldLabel}>Transfer reference (optional)</ThemedText>
        <PopTextInput style={ls.input} maxLength={100} autoCapitalize="none" value={form.reference} onChangeText={(reference) => setForm({ ...form, reference })} />
      </View>
      <View>
        <ThemedText style={ls.fieldLabel}>Receipt (optional, PDF, JPG or PNG up to 5MB)</ThemedText>
        <TouchableOpacity style={[ls.input, styles.picker]} onPress={() => void pickProof()}>
          <ThemedText style={{ color: proof ? '#000' : '#AAA', fontSize: 14, flex: 1 }} numberOfLines={1}>
            {proof?.name || 'Choose a file'}
          </ThemedText>
          <Ionicons name="cloud-upload-outline" size={20} color="#666" />
        </TouchableOpacity>
        {proofError && <ThemedText style={ls.errorText}>{proofError}</ThemedText>}
      </View>
      <PrimaryButton label={saving ? 'Sending…' : "I've made this transfer"} isLoading={saving} disabled={!valid} onPress={() => void submit()} />
    </View>
  );
}

const INSTALMENT_LABELS: Record<Installment['status'], string> = { pending: 'Unpaid', failed: 'Unpaid', completed: 'Paid', cancelled: 'Cancelled' };

function ScheduleList({ schedule }: { schedule: Installment[] }) {
  return (
    <View style={styles.section}>
      <ThemedText style={ls.heading}>Repayment schedule</ThemedText>
      {schedule.map((item) => {
        const partPaid = item.status !== 'completed' && Number(item.amount_paid) > 0;
        const label = partPaid ? 'Part paid' : INSTALMENT_LABELS[item.status];
        const color = item.status === 'completed' ? '#1E9F85' : partPaid ? '#B45309' : '#666';
        return (
          <View key={item.id} style={styles.scheduleRow}>
            <View>
              <ThemedText style={styles.optionTitle}>
                {item.installment_number}. {formatNaira(item.amount, true)}
              </ThemedText>
              <ThemedText style={styles.small}>Due {formatDate(item.due_date)} · Paid {formatNaira(item.amount_paid, true)}</ThemedText>
            </View>
            <ThemedText style={[styles.small, { color, fontWeight: '600' }]}>{label}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function HistoryItem({ repayment }: { repayment: Repayment }) {
  const { title, status, tone } = describeRepayment(repayment);
  return (
    <View style={styles.historyRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={styles.small}>
          {formatDate(repayment.paid_at)} · Ref {repayment.external_reference || repayment.reference}
        </ThemedText>
        <View style={[styles.pill, { backgroundColor: TONES[tone].bg }]}>
          <ThemedText style={[styles.pillText, { color: TONES[tone].fg }]}>{status}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.optionTitle}>{formatNaira(repayment.amount, true)}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 32 },
  section: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0', padding: 16, gap: 12 },
  balances: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  balance: { flexGrow: 1, flexBasis: '45%', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, gap: 4 },
  balanceValue: { fontSize: 18, fontWeight: '700', color: '#000' },
  small: { fontSize: 12, color: '#4B4B55' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 12, padding: 14 },
  optionTitle: { fontSize: 14, fontWeight: '600', color: '#000' },
  accountNumber: { fontSize: 20, fontWeight: '700', color: '#000', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  historyRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  pillText: { fontSize: 11, fontWeight: '600' },
});
