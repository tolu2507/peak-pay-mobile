import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { openLoansTab } from '@/lib/loans-tab';
import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SegmentedControl from '@/shared/ui/organisms/segmented-control';
import { useAuthStore } from '@/store/useAuthStore';
import { nextKycRoute } from '@/constants/kyc-routes';
import { isKycCompleted, useKYCStore } from '@/store/useKYCStore';
import { useLoanStore } from '@/store/useLoanStore';
import { useSignupStore } from '@/store/useSignupStore';
import { useCurrentUser } from '@/hooks/use-current-user';
import { UserAvatar } from '@/components/user-avatar';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Shadows } from '@/constants/theme';
import { Skeleton, SkeletonGroup, SkeletonHero, SkeletonList } from '@/shared/ui/base/skeleton';
import LoanService, { type LoanTransaction } from '@/api/services/loan.service';

const FILTERS = ['All', 'Credit', 'Debit'] as const;

const LOAN_PROGRESS = ['Applied', 'Approved', 'Paid out'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { form } = useSignupStore();
  const { user: authUser } = useAuthStore();
  const kycState = useKYCStore();
  const { syncKycProgress } = kycState;
  const isKYCComplete = isKycCompleted(kycState);
  const { isApplied, appliedAmount, status, application, eligibility, fetchLatestApplication, getEligibility } = useLoanStore();
  // The approved limit, as on the web dashboard.
  const eligibleAmount = eligibility?.can_apply || (eligibility?.application_status === 'open' && eligibility.eligibility_status === 'eligible')
    ? Number(eligibility.eligible_amount || 0)
    : 0;
  const isPaidOut = application?.disbursement_status === 'disbursed';
  // One loan at a time (until top-ups are decided): while a paid-out loan is
  // being repaid, Manage Loan is the main action and Request Loan is off.
  const runningLoan = eligibility?.has_running_loan === true;
  // Only a live application shows on the loan card: one still open (under review
  // or waiting for the offer), or a paid-out loan still being repaid. A closed,
  // declined or repaid one doesn't.
  const hasLiveLoan = isApplied && !!application && (
    isPaidOut ? eligibility?.has_running_loan !== false : application.application_status === 'open'
  );
  // Where the application is, for the loan card's tracker: 0 applied (under
  // review), 1 approved (offer waiting), 2 paid out.
  const loanStep = status === 'applied' ? 0 : isPaidOut || runningLoan ? 2 : 1;
  const loanTone = !hasLiveLoan
    ? { label: 'Action required', fg: '#FFB45C', bg: 'rgba(255,138,0,0.16)' }
    : loanStep === 0
      ? { label: 'Under review', fg: '#FFD7A8', bg: 'rgba(255,215,168,0.14)' }
      : { label: loanStep === 2 ? 'Active' : 'Approved', fg: '#5EE0B5', bg: 'rgba(30,159,133,0.22)' };
  const [filter, setFilter] = useState<'All' | 'Credit' | 'Debit'>('All');
  const { fullName, initials, photo, loading: profileLoading } = useCurrentUser();
  // True until the first KYC/loan sync settles, so the cards don't flash the
  // wrong state while we wait for the server.
  const [booting, setBooting] = useState(true);

  // KYC progress and the loan status live on the server; refresh them each
  // time the tab is shown (e.g. after finishing a KYC step).
  useFocusEffect(
    useCallback(() => {
      void Promise.allSettled([
        syncKycProgress(),
        fetchLatestApplication(),
        getEligibility(),
      ]).finally(() => setBooting(false));
    }, [syncKycProgress, fetchLatestApplication, getEligibility]),
  );

  const openKyc = () => router.push((nextKycRoute() ?? '/kyc/phone') as any);

  const displayName = fullName
    || (form.firstName && form.lastName ? `${form.firstName} ${form.lastName}` : 'there');

  // Loan transactions (payouts and repayments), 20 a page like the web.
  const [txItems, setTxItems] = useState<LoanTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txHasNext, setTxHasNext] = useState(false);
  const [txLoadingMore, setTxLoadingMore] = useState(false);

  const loadTransactions = useCallback(async (page: number) => {
    if (page === 1) setTxError(false);
    else setTxLoadingMore(true);
    try {
      const history = await LoanService.getTransactionPage(page);
      setTxItems((current) => (page === 1 ? history.results : [...current, ...history.results]));
      setTxHasNext(history.next);
      setTxPage(page);
    } catch {
      if (page === 1) setTxError(true);
    } finally {
      setTxLoading(false);
      setTxLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTransactions(1);
    }, [loadTransactions]),
  );

  const transactions = txItems.map((tx) => {
    const value = Number(tx.amount);
    return {
      id: tx.id,
      title: tx.narration,
      date: new Date(tx.date).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' }),
      amount: Math.abs(value).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }),
      type: (value < 0 ? 'debit' : 'credit') as 'credit' | 'debit',
    };
  });

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'All') return true;
    return tx.type.toLowerCase() === filter.toLowerCase();
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
                <UserAvatar photo={photo} initials={initials} size={44} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                {profileLoading && !fullName && !form.firstName ? (
                  <Skeleton width={160} height={22} radius={8} style={{ marginBottom: 14 }} />
                ) : (
                  <ThemedText type="title" style={styles.greeting} numberOfLines={1}>Hi, {displayName}</ThemedText>
                )}
                <ThemedText style={styles.subGreeting}>Ready to start a new day with us?</ThemedText>
              </View>
            </View>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => router.push('/notifications' as any)}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color="#000" />
            </TouchableOpacity>
          </View>

          {booting && (
            <SkeletonGroup style={{ gap: 16, marginBottom: 24 }}>
              <Skeleton height={56} radius={14} />
              <SkeletonHero />
            </SkeletonGroup>
          )}

          {/* KYC Alert */}
          {!booting && !isKYCComplete && (
            <TouchableOpacity
              style={styles.kycAlert}
              onPress={openKyc}
              activeOpacity={0.8}
            >
              <View style={styles.kycLeft}>
                <Ionicons name="warning-outline" size={20} color="#FF7A00" />
                <ThemedText style={styles.kycText}>Complete your KYC to get started!</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          )}

          {/* Eligibility/Loan Status Card */}
          {!booting && (!isKYCComplete || hasLiveLoan) && (
            <View style={styles.loanCard}>
              {/* Soft rings for depth, in the brand orange. */}
              <View pointerEvents="none" style={[styles.loanRing, styles.loanRingLarge]} />
              <View pointerEvents="none" style={[styles.loanRing, styles.loanRingSmall]} />

              <View style={styles.loanTopRow}>
                <ThemedText style={styles.loanEyebrow}>{hasLiveLoan ? 'Your loan' : 'Get started'}</ThemedText>
                <View style={[styles.loanPill, { backgroundColor: loanTone.bg }]}>
                  <View style={[styles.loanPillDot, { backgroundColor: loanTone.fg }]} />
                  <ThemedText style={[styles.loanPillText, { color: loanTone.fg }]}>{loanTone.label}</ThemedText>
                </View>
              </View>

              <ThemedText style={styles.loanCaption}>{hasLiveLoan ? 'You applied for' : 'You may be eligible for up to'}</ThemedText>
              <ThemedText style={styles.loanAmount} numberOfLines={1} adjustsFontSizeToFit>
                ₦{(hasLiveLoan ? Number(appliedAmount) : 10000000).toLocaleString('en-NG')}
              </ThemedText>

              {hasLiveLoan ? (
                <View style={styles.loanSteps}>
                  {LOAN_PROGRESS.map((label, index) => {
                    const done = index < loanStep;
                    const current = index === loanStep;
                    return (
                      <React.Fragment key={label}>
                        {index > 0 && <View style={[styles.loanStepLine, index <= loanStep && styles.loanStepLineDone]} />}
                        <View style={styles.loanStep}>
                          <View style={[styles.loanStepDot, done && styles.loanStepDotDone, current && styles.loanStepDotCurrent]}>
                            {done && <Ionicons name="checkmark" size={12} color="#3D2100" />}
                          </View>
                          <ThemedText style={[styles.loanStepLabel, (done || current) && styles.loanStepLabelActive]}>{label}</ThemedText>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>
              ) : (
                <ThemedText style={styles.loanHint}>Finish your KYC to see how much you can borrow.</ThemedText>
              )}

              {hasLiveLoan && status === 'applied' ? (
                <View style={styles.loanReviewing}>
                  <Ionicons name="hourglass-outline" size={16} color="#FFD7A8" />
                  <ThemedText style={styles.loanReviewingText}>We&apos;re reviewing your application</ThemedText>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.loanCta}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (!hasLiveLoan) openKyc();
                    // Paid out: manage it. Approved: set up repayment and accept the offer.
                    else if (isPaidOut || runningLoan) openLoansTab(navigation);
                    else if (status === 'approved') router.push('/loans/start');
                  }}
                >
                  <ThemedText style={styles.loanCtaText}>
                    {!hasLiveLoan ? 'Get it now' : isPaidOut || runningLoan ? 'Manage Loan' : 'Accept Offer'}
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Loan Balance Card - Only show if KYC complete and NOT applied yet */}
          {!booting && isKYCComplete && !hasLiveLoan && (
            <View style={styles.balanceCard}>
              <ThemedText style={styles.balanceLabel}>Eligible Loan Balance</ThemedText>
              <View style={styles.balanceRow}>
                <ThemedText style={styles.balanceAmount}>₦ {eligibleAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</ThemedText>
                <Ionicons name="eye-off-outline" size={20} color="#666" style={{ marginLeft: 8 }} />
              </View>
              {eligibility?.can_apply ? (
                <ThemedText style={styles.balanceLabel}>Your approved limit · choose your loan amount</ThemedText>
              ) : eligibility?.assessment_status === 'pending_review' ? (
                <ThemedText style={styles.balanceLabel}>Eligibility review in progress</ThemedText>
              ) : eligibility?.assessment_status === 'statement_outdated' && !eligibility.application_id ? (
                <ThemedText style={styles.balanceLabel}>Your bank statement is no longer recent · pull a new one to continue</ThemedText>
              ) : null}
              {runningLoan && <ThemedText style={styles.balanceLabel}>You can request another loan once this one is repaid.</ThemedText>}
              <TouchableOpacity
                style={styles.requestBtn}
                onPress={() => (runningLoan ? openLoansTab(navigation) : router.push('/loans/start'))}
              >
                <ThemedText style={styles.requestBtnText}>{runningLoan ? 'Manage Loan' : 'Request Loan'}</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Ads Banner: not while the loan card is showing an application. */}
          {!booting && !hasLiveLoan && (
            <View style={styles.adsBanner}>
              <View style={styles.adsTextContainer}>
                <ThemedText style={[styles.adsTitle, { color: '#d1d10bff' }]}>Need instant loan? <ThemedText style={[styles.adsTitle, { maxWidth: "100%" }]}>Get it in minutes!</ThemedText></ThemedText>
              </View>
              <Image
                source={require('@/assets/images/logo-mark-white.png')}
                style={styles.adsIcon}
              />
            </View>
          )}

          {/* Transaction History */}
          <View style={styles.transactionsHeader}>
            <ThemedText style={styles.sectionTitle}>Transaction History</ThemedText>
            <SegmentedControl
              currentIndex={FILTERS.indexOf(filter)}
              onChange={(index) => setFilter(FILTERS[index])}
              width={SCREEN_WIDTH - 40}
              segmentedControlBackgroundColor="#F5F5F5"
              activeSegmentBackgroundColor="#FFF"
              borderRadius={12}
              containerStyle={{ marginVertical: 10 }}
            >
              {FILTERS.map((f) => (
                <ThemedText key={f} style={filter === f ? styles.activeTabText : styles.tabText}>{f}</ThemedText>
              ))}
            </SegmentedControl>
          </View>

          <View style={styles.transactionsList}>
            {txLoading && (
              <SkeletonGroup><SkeletonList rows={4} /></SkeletonGroup>
            )}
            {!txLoading && txError && (
              <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
                <ThemedText style={styles.emptyTransactions}>We could not load your transactions.</ThemedText>
                <TouchableOpacity onPress={() => { setTxLoading(true); void loadTransactions(1); }}>
                  <ThemedText style={{ color: '#FF7A00', fontWeight: '700', fontSize: 14 }}>Try again</ThemedText>
                </TouchableOpacity>
              </View>
            )}
            {!txLoading && !txError && filteredTransactions.map(item => (
              <View key={item.id} style={styles.transactionItem}>
                <View style={styles.txIcon}>
                  <Ionicons name={item.type === 'credit' ? "arrow-down-circle" : "arrow-up-circle"} size={24} color={item.type === 'credit' ? "#1E9F85" : "#FF3B30"} />
                </View>
                <View style={styles.txInfo}>
                  <ThemedText style={styles.txTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.txDate}>{item.date}</ThemedText>
                </View>
                <ThemedText style={[styles.txAmount, { color: item.type === 'credit' ? '#1E9F85' : '#000' }]}>{item.amount}</ThemedText>
              </View>
            ))}
            {!txLoading && !txError && filteredTransactions.length === 0 && (
              <ThemedText style={styles.emptyTransactions}>
                {transactions.length === 0 ? 'No transactions yet.' : 'No transactions found in this category.'}
              </ThemedText>
            )}
            {!txLoading && !txError && txHasNext && (
              <TouchableOpacity
                style={{ alignItems: 'center', paddingVertical: 14 }}
                disabled={txLoadingMore}
                onPress={() => void loadTransactions(txPage + 1)}
              >
                <ThemedText style={{ color: '#FF7A00', fontWeight: '700', fontSize: 14 }}>
                  {txLoadingMore ? 'Loading…' : 'Load more'}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loanCard: {
    backgroundColor: '#3D2100',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    overflow: 'hidden',
    ...Shadows.card,
  },
  loanRing: {
    position: 'absolute',
    borderRadius: 999,
    borderColor: 'rgba(255,138,0,0.18)',
  },
  loanRingLarge: { width: 220, height: 220, borderWidth: 28, top: -90, right: -80 },
  loanRingSmall: { width: 90, height: 90, borderWidth: 14, top: 70, right: -30, borderColor: 'rgba(255,138,0,0.10)' },
  loanTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  loanEyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  loanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  loanPillDot: { width: 6, height: 6, borderRadius: 3 },
  loanPillText: { fontSize: 12, fontWeight: '700' },
  loanCaption: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  loanAmount: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  loanHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  loanSteps: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 22,
  },
  loanStep: { alignItems: 'center', width: 64 },
  loanStepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanStepDotDone: { backgroundColor: '#FF8A00', borderColor: '#FF8A00' },
  loanStepDotCurrent: { borderColor: '#FF8A00', backgroundColor: 'rgba(255,138,0,0.25)' },
  loanStepLine: {
    flex: 1,
    height: 2,
    marginTop: 9,
    marginHorizontal: -22,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  loanStepLineDone: { backgroundColor: '#FF8A00' },
  loanStepLabel: {
    fontSize: 11,
    marginTop: 6,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  loanStepLabelActive: { color: '#FFF' },
  loanCta: {
    marginTop: 22,
    backgroundColor: '#FF7A00',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loanCtaText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  loanReviewing: {
    marginTop: 22,
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  loanReviewingText: { color: '#FFD7A8', fontSize: 14, fontWeight: '600' },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140, // Extra space for bottom tabs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  subGreeting: {
    fontSize: 14,
    color: '#4B4B55',
    fontWeight: '400',
    marginTop:-10
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FF7A00',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    ...Shadows.card,
    backgroundColor: '#FFF',
  },
  kycLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  balanceCard: {
    backgroundColor: '#FFF2E6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Shadows.card,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#4B4B55',
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  requestBtn: {
    backgroundColor: '#FF7A00',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'flex-end',
    width: 140,
  },
  requestBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  adsBanner: {
    backgroundColor: '#3E1D05',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  adsTextContainer: {
    flex: 1,
  },
  adsTitle: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '700',
    maxWidth: '80%',
    lineHeight: 35
  },
  adsIcon: {
    width: 60,
    height: 60,
    opacity: 0.3,
  },
  transactionsHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,

  },
  tabText: {
    fontSize: 14, fontWeight: "400",
    color: '#4B4B55', textAlign: "center"
  },
  activeTabText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '400', textAlign: "center"
  },
  transactionsList: {
    gap: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  txDate: {
    fontSize: 12,
    color: '#6E6E78',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTransactions: {
    textAlign: 'center',
    color: '#6E6E78',
    marginTop: 20,
    fontSize: 14,
  },
});
