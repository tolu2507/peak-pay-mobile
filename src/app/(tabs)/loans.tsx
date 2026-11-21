import React, { useState, useCallback, useRef } from 'react';
import { ScreenSkeleton } from '@/shared/ui/base/skeleton';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/shared/ui/base/button';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useLoanStore } from '@/store/useLoanStore';
import LoanService, { LoanApplication, AddressVerification, LoanEligibility } from '@/api/services/loan.service';
import RepaymentService, { Installment, RepaymentSummary } from '@/api/services/repayment.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatNaira = (value: string | number | null | undefined) =>
  `₦ ${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (isNaN(date.getTime())) return '—';
  const month = date.toLocaleString('en-GB', { month: 'short' });
  return `${date.getDate()} ${month}, ${date.getFullYear()}`;
};

export default function LoansScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RepaymentSummary | null>(null);
  const [schedule, setSchedule] = useState<Installment[]>([]);
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [address, setAddress] = useState<AddressVerification | null>(null);
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, sched, loans, addr, elig] = await Promise.all([
        RepaymentService.summary().catch(() => null),
        RepaymentService.schedule().catch(() => []),
        LoanService.getLoans().catch(() => []),
        LoanService.getCurrentAddress().catch(() => null),
        LoanService.getEligibility().catch(() => null),
      ]);
      setEligibility(elig);
      setSummary(sum);
      setSchedule(Array.isArray(sched) ? sched : []);
      setApplication(loans[0] || null);
      setAddress(addr);
    } catch {
      // Empty fallback
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh each time the tab is shown, e.g. after accepting an offer.
  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  // Manage Loan shows once the loan has been paid out.
  const hasActiveLoan =
    eligibility?.has_running_loan === true ||
    application?.disbursement_status === 'disbursed' ||
    Boolean(summary && Number(summary.outstanding_balance) > 0) ||
    schedule.length > 0;

  // An application that is open (under review or waiting for the offer) is
  // continued from the start screen, which knows the step.
  const applicationInProgress = eligibility?.application_status === 'open' || eligibility?.assessment_status === 'pending_review';
  const eligibleAmount = eligibility?.can_apply ? Number(eligibility.eligible_amount || 0) : 0;

  // Progress comes from the installments; before they exist, from the totals.
  const scheduleTotal = schedule.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalRepayment = scheduleTotal || Number(application?.estimated_total_amount || 0);
  const paidAmount = scheduleTotal
    ? schedule.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0)
    : Math.max(0, totalRepayment - Number(summary?.outstanding_balance ?? totalRepayment));
  const percentComplete =
    totalRepayment > 0
      ? Math.min(100, Math.round((paidAmount / totalRepayment) * 100))
      : 0;

  const nextInstallment =
    summary?.next_installment || schedule.find((item) => item.status !== 'completed' && item.status !== 'cancelled') || null;
  const nextPaymentAmount = nextInstallment
    ? Number(nextInstallment.balance || nextInstallment.amount)
    : Number(application?.monthly_repayment || 0);

  const nextDueDate = nextInstallment?.due_date || application?.date_of_first_payment;
  const daysToRepayment = nextDueDate
    ? Math.max(0, Math.ceil((new Date(nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScreenSkeleton style={{ paddingHorizontal: 20, paddingTop: 24 }} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!hasActiveLoan) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>Loans</ThemedText>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.emptyContent}>
            <View style={styles.illustrationContainer}>
              <Image 
                source={require('@/assets/images/logo-mark-orange.png')}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>
            <ThemedText style={styles.emptyText}>
              {applicationInProgress ? (
                <>You have a loan application in progress.{'\n'}Pick up where you stopped.</>
              ) : eligibleAmount > 0 ? (
                <>
                  You haven’t taken any loans yet.{'\n'}
                  You can borrow up to <ThemedText style={styles.boldAmount}>{formatNaira(eligibleAmount)}</ThemedText> today!
                </>
              ) : (
                <>
                  You haven’t taken any loans yet.{'\n'}
                  Unlock up to <ThemedText style={styles.boldAmount}>₦5,500,000</ThemedText> today!
                </>
              )}
            </ThemedText>

            <View style={styles.btnWrapper}>
              <Button
                onPress={() => router.push('/loans/start')}
                width={SCREEN_WIDTH - 48}
                height={56}
                backgroundColor="#FF7A00"
                borderRadius={16}
              >
                <ThemedText style={styles.buttonText}>{applicationInProgress ? 'Continue Application' : 'Take A Loan'}</ThemedText>
              </Button>
            </View>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Manage Loan</ThemedText>
          <TouchableOpacity onPress={() => void loadData()} style={styles.backBtn}>
            <Ionicons name="refresh-outline" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Manage Card */}
          <View style={styles.manageCard}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>Ongoing Loan</ThemedText>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>Active</ThemedText>
              </View>
            </View>

            {/* Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <ThemedText style={styles.progressAmount}>
                  <ThemedText style={styles.progressAmountBold}>{formatNaira(paidAmount)}</ThemedText> / {formatNaira(totalRepayment || application?.amount)}
                </ThemedText>
                <ThemedText style={styles.progressPercent}>{percentComplete}% complete</ThemedText>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${percentComplete}%` }]} />
              </View>
            </View>

            {/* Next Payment */}
            <View style={styles.paymentSection}>
              <ThemedText style={styles.paymentLabel}>Next payment amount</ThemedText>
              <ThemedText style={styles.paymentValue}>{formatNaira(nextPaymentAmount)}</ThemedText>
            </View>

            {/* Alert Banner */}
            {nextDueDate && (
              <View style={styles.alertBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#FF7A00" />
                <ThemedText style={styles.alertText}>
                  Next payment due on {formatDate(nextDueDate)}
                  {daysToRepayment !== null && (
                    <ThemedText style={styles.alertHighlight}> ({daysToRepayment} days left)</ThemedText>
                  )}
                </ThemedText>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity
              onPress={() => router.push('/loans/repayment')}
              style={styles.payButton}>
              <ThemedText style={styles.payButtonText}>Make Payment</ThemedText>
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <TouchableOpacity onPress={() => setShowSchedule(!showSchedule)}>
                <ThemedText style={styles.scheduleLink}>
                  {showSchedule ? 'Hide Repayment Schedule' : 'View Repayment Schedule'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOfferModalVisible(true)}>
                <ThemedText style={styles.offerLink}>View Offer Letter</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Schedule Section */}
          {showSchedule && (
            <View style={styles.scheduleContainer}>
              <ThemedText style={styles.scheduleTitle}>Repayment Schedule</ThemedText>
              {schedule.length > 0 ? (
                schedule.map((item, idx) => {
                  const daysLeft = item.due_date
                    ? Math.ceil((new Date(item.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <View key={item.id || idx} style={styles.scheduleItem}>
                      <View>
                        <ThemedText style={styles.scheduleItemAmount}>{formatNaira(item.amount)}</ThemedText>
                        <ThemedText style={styles.scheduleItemDate}>{formatDate(item.due_date)}</ThemedText>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={[styles.statusPill, item.status === 'completed' ? styles.statusPaid : styles.statusUpcoming]}>
                          <ThemedText style={[styles.statusPillText, item.status === 'completed' ? styles.statusPaidText : styles.statusUpcomingText]}>
                            {item.status === 'completed' ? 'Paid' : 'Upcoming'}
                          </ThemedText>
                        </View>
                        {item.status !== 'completed' && daysLeft !== null && (
                          <ThemedText style={styles.daysLeftText}>
                            {daysLeft > 0 ? `${daysLeft} days left` : 'Due today'}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <ThemedText style={styles.emptyScheduleText}>No repayment schedule records found.</ThemedText>
              )}
            </View>
          )}
        </ScrollView>

        {/* Offer Letter Modal */}
        <Modal
          visible={offerModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setOfferModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Loan Offer Letter</ThemedText>
                <TouchableOpacity onPress={() => setOfferModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <View style={styles.letterMeta}>
                  <ThemedText style={styles.metaText}>
                    Date: {formatDate(application?.created_date || new Date().toISOString())}{'\n'}
                    Customer: {user?.first_name} {user?.last_name}{'\n'}
                    Address: {address ? `${address.house_number} ${address.street}, ${address.city}` : 'On file'}
                  </ThemedText>
                  <ThemedText style={styles.greetingText}>
                    Dear {user?.first_name || 'Customer'}, review your loan details below:
                  </ThemedText>
                </View>

                <View style={styles.termsBox}>
                  <View style={styles.termRow}>
                    <ThemedText style={styles.termKey}>Purpose:</ThemedText>
                    <ThemedText style={styles.termVal}>{application?.loan_reason_name || 'General'}</ThemedText>
                  </View>
                  <View style={styles.termRow}>
                    <ThemedText style={styles.termKey}>Loan Amount:</ThemedText>
                    <ThemedText style={[styles.termVal, { color: '#FF7A00', fontWeight: '700' }]}>{formatNaira(application?.amount)}</ThemedText>
                  </View>
                  <View style={styles.termRow}>
                    <ThemedText style={styles.termKey}>Interest Rate:</ThemedText>
                    <ThemedText style={styles.termVal}>{application?.flat_interest_rate ? `${Number(application.flat_interest_rate)}%` : 'Awaiting final terms'}</ThemedText>
                  </View>
                  <View style={styles.termRow}>
                    <ThemedText style={styles.termKey}>Loan Term:</ThemedText>
                    <ThemedText style={styles.termVal}>{application?.duration_in_months} months</ThemedText>
                  </View>
                  <View style={styles.termRow}>
                    <ThemedText style={styles.termKey}>Monthly Payment:</ThemedText>
                    <ThemedText style={[styles.termVal, { color: '#FF7A00', fontWeight: '700' }]}>{formatNaira(application?.monthly_repayment)}</ThemedText>
                  </View>
                  <View style={styles.termRow}>
                    <ThemedText style={styles.termKey}>First Due Date:</ThemedText>
                    <ThemedText style={styles.termVal}>{formatDate(application?.date_of_first_payment)}</ThemedText>
                  </View>
                  <View style={styles.termRow}>
                    <ThemedText style={styles.termKey}>Total Repayment:</ThemedText>
                    <ThemedText style={[styles.termVal, { color: '#FF7A00', fontWeight: '700' }]}>{formatNaira(application?.estimated_total_amount)}</ThemedText>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setOfferModalVisible(false)}
                style={styles.modalCloseButton}>
                <ThemedText style={styles.modalCloseButtonText}>Close</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFB',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#4B4B55',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  illustrationContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  illustration: {
    width: 120,
    height: 120,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 16,
    color: '#4B4B55',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontWeight: '400',
  },
  boldAmount: {
    fontWeight: '700',
    color: '#000',
  },
  btnWrapper: {
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  manageCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  badge: {
    backgroundColor: '#FFF3E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FF7A00',
    fontSize: 12,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressAmount: {
    fontSize: 14,
    color: '#4B4B55',
  },
  progressAmountBold: {
    fontWeight: '700',
    color: '#111',
  },
  progressPercent: {
    fontSize: 13,
    color: '#4B4B55',
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF7A00',
    borderRadius: 4,
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 13,
    color: '#4B4B55',
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginTop: 4,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F2',
    borderWidth: 1,
    borderColor: '#FFE1CC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  alertText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  alertHighlight: {
    color: '#FF7A00',
    fontWeight: '700',
  },
  payButton: {
    backgroundColor: '#FF7A00',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  scheduleLink: {
    color: '#1E9F85',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  offerLink: {
    color: '#4B4B55',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  scheduleContainer: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  scheduleItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  scheduleItemDate: {
    fontSize: 12,
    color: '#6E6E78',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusUpcoming: {
    backgroundColor: '#FFF3E5',
  },
  statusPaid: {
    backgroundColor: '#E6F7EF',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusUpcomingText: {
    color: '#FF7A00',
  },
  statusPaidText: {
    color: '#00A85A',
  },
  daysLeftText: {
    fontSize: 10,
    color: '#E67C00',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyScheduleText: {
    fontSize: 12,
    color: '#6E6E78',
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  closeBtn: {
    padding: 4,
  },
  letterMeta: {
    marginBottom: 12,
  },
  metaText: {
    fontSize: 11,
    color: '#4B4B55',
    lineHeight: 18,
  },
  greetingText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginTop: 8,
  },
  termsBox: {
    backgroundColor: '#FBFBFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    gap: 8,
    marginBottom: 16,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termKey: {
    fontSize: 12,
    color: '#4B4B55',
  },
  termVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
  },
  modalCloseButton: {
    backgroundColor: '#FF7A00',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
