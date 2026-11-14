import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
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
          {!booting && (!isKYCComplete || isApplied) && (
            <View style={[styles.eligibilityCard, isApplied && { backgroundColor: '#F0F9FF' }]}>
              <View style={styles.eligibilityContent}>
                <ThemedText style={styles.eligibilityLabel}>
                  {isApplied ? `You applied for ₦${Number(appliedAmount).toLocaleString('en-NG')}` : 'You may be eligible for up to ₦10,000,000'}
                </ThemedText>
                <View style={styles.statusRow}>
                  <ThemedText style={[styles.statusTag, isApplied && { backgroundColor: status === 'applied' ? '#E0F2FE' : '#DCFCE7', color: status === 'applied' ? '#0369A1' : '#15803D' }]}>
                    {isApplied ? (status === 'applied' ? 'Under Review' : isPaidOut ? 'Active' : 'Approved') : 'Action Required'}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={[styles.getItBtn, isApplied && { backgroundColor: status === 'applied' ? '#CCC' : '#1E9F85' }]}
                  onPress={() => {
                    if (!isApplied) openKyc();
                    // Paid out: manage it. Approved: set up repayment and accept the offer.
                    else if (isPaidOut) router.push('/(tabs)/loans');
                    else if (status === 'approved') router.push('/loans/start');
                  }}
                  disabled={isApplied && status === 'applied'}
                >
                  <ThemedText style={styles.getItText}>
                    {isApplied ? (status === 'applied' ? 'Reviewing...' : isPaidOut ? 'Manage Loan' : 'Accept Offer') : 'Get it now'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Loan Balance Card - Only show if KYC complete and NOT applied yet */}
          {!booting && isKYCComplete && !isApplied && (
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
              ) : null}
              <TouchableOpacity
                style={styles.requestBtn}
                onPress={() => router.push('/loans/start')}
              >
                <ThemedText style={styles.requestBtnText}>Request Loan</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Ads Banner */}
          <View style={styles.adsBanner}>
            <View style={styles.adsTextContainer}>
              <ThemedText style={[styles.adsTitle, { color: '#d1d10bff' }]}>Need instant loan? <ThemedText style={[styles.adsTitle, { maxWidth: "100%" }]}>Get it in minutes!</ThemedText></ThemedText>
            </View>
            <Image
              source={require('@/assets/images/logo-mark-white.png')}
              style={styles.adsIcon}
            />
          </View>

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
  eligibilityContent: {
    width: "100%",
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: '#FFFBEB',
    color: '#B45309',
    overflow: 'hidden',
  },
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
  eligibilityCard: {
    backgroundColor: '#E6F4F1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.card,
  },
  eligibilityLabel: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000',
    marginBottom: 12,
    // maxWidth: '70%',
  },
  getItBtn: {
    backgroundColor: '#1E9F85',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  getItText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
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
