import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Toast } from '@/shared/ui/molecules/Toast';
import SegmentedControl from '@/shared/ui/organisms/segmented-control';
import { useKYCStore } from '@/store/useKYCStore';
import { useLoanStore } from '@/store/useLoanStore';
import { useSignupStore } from '@/store/useSignupStore';
import { useState } from 'react';

const FILTERS = ['All', 'Credit', 'Debit'] as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { form } = useSignupStore();
  const { isKYCComplete } = useKYCStore();
  const { isApplied, appliedAmount, status } = useLoanStore();
  const [filter, setFilter] = useState<'All' | 'Credit' | 'Debit'>('All');

  const displayName = form.firstName && form.lastName ? `${form.firstName} ${form.lastName}` : 'Oluwasegun Adigun';

  const transactions = [
    { id: '1', title: 'Card Funding', date: '24, Mar 2024', amount: '+₦5,000.00', type: 'credit' },
    { id: '2', title: 'DSTV Subscription', date: '23, Mar 2024', amount: '-₦12,000.00', type: 'debit' },
    { id: '3', title: 'Sent to John', date: '21, Mar 2024', amount: '-₦2,500.00', type: 'debit' },
  ];

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
            <View>
              <ThemedText type="title" style={styles.greeting}>Hi, {displayName}</ThemedText>
              <ThemedText style={styles.subGreeting}>Ready to start a new day with us?</ThemedText>
            </View>

          </View>

          {/* KYC Alert */}
          {!isKYCComplete && (
            <TouchableOpacity
              style={styles.kycAlert}
              onPress={() => router.push('/kyc/bvn')}
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
          {(!isKYCComplete || isApplied) && (
            <View style={[styles.eligibilityCard, isApplied && { backgroundColor: '#F0F9FF' }]}>
              <View style={styles.eligibilityContent}>
                <ThemedText style={styles.eligibilityLabel}>
                  {isApplied ? `You applied for ₦${appliedAmount}` : 'You may be eligible for up to ₦10,000,000'}
                </ThemedText>
                <View style={styles.statusRow}>
                  <ThemedText style={[styles.statusTag, isApplied && { backgroundColor: status === 'applied' ? '#E0F2FE' : '#DCFCE7', color: status === 'applied' ? '#0369A1' : '#15803D' }]}>
                    {isApplied ? (status === 'applied' ? 'Under Review' : 'Approved') : 'Action Required'}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={[styles.getItBtn, isApplied && { backgroundColor: status === 'applied' ? '#CCC' : '#1E9F85' }]}
                  onPress={() => !isApplied ? router.push('/kyc/bvn') : (status === 'approved' && Toast.show('Offer Accepted!', { type: 'success', position: "top", backgroundColor: "#1E9F85" }))}
                  disabled={isApplied && status === 'applied'}
                >
                  <ThemedText style={styles.getItText}>
                    {isApplied ? (status === 'applied' ? 'Reviewing...' : 'Accept Offer') : 'Get it now'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Loan Balance Card - Only show if KYC complete and NOT applied yet */}
          {isKYCComplete && !isApplied && (
            <View style={styles.balanceCard}>
              <ThemedText style={styles.balanceLabel}>Eligible Loan Balance</ThemedText>
              <View style={styles.balanceRow}>
                <ThemedText style={styles.balanceAmount}>₦ 10,000,000.00</ThemedText>
                <Ionicons name="eye-off-outline" size={20} color="#666" style={{ marginLeft: 8 }} />
              </View>
              <TouchableOpacity
                style={styles.requestBtn}
                onPress={() => router.push('/loans')}
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
              source={require('@/assets/images/peakpay_logo.jpg')} // Reusing logo for now
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
            {filteredTransactions.map(item => (
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
            {filteredTransactions.length === 0 && (
              <ThemedText style={styles.emptyTransactions}>No transactions found in this category.</ThemedText>
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
    paddingBottom: 100, // Extra space for bottom tabs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
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
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
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
    color: '#666', textAlign: "center"
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
    color: '#999',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTransactions: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },
});
