import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { nextKycRoute } from '@/constants/kyc-routes';
import { Toast } from '@/shared/ui/molecules/Toast';
import { isKycCompleted, useKYCStore } from '@/store/useKYCStore';
import { useLoanStore } from '@/store/useLoanStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MINIMUM_AMOUNT = 1000;

const formatNaira = (value: string | number) =>
  `₦ ${Number(value).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// "2026-04-25" -> "25 Apr, 2026"
const formatDate = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  const month = date.toLocaleString('en-GB', { month: 'short' });
  return `${date.getDate()} ${month}, ${date.getFullYear()}`;
};

const percent = (value: string) => `${Number(value)}%`;

type DropdownKey = 'purpose' | 'duration';

export default function ApplyLoanScreen() {
  const router = useRouter();
  const {
    loanDetails,
    setLoanField,
    reasons,
    tenors,
    quote,
    loadOptions,
    getQuote,
    loadCurrentAddress,
    isLoading,
    error,
    fieldErrors,
  } = useLoanStore();
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey | null>(null);
  const [isOpeningAddress, setIsOpeningAddress] = useState(false);
  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  // Purposes and durations come from the backend.
  useEffect(() => {
    loadOptions().catch(() => undefined);
  }, [loadOptions]);

  const options: Record<DropdownKey, { value: string; label: string }[]> = {
    purpose: reasons.map((reason) => ({ value: reason.id, label: reason.loan_reason })),
    duration: tenors.map((tenor) => ({ value: String(tenor.months), label: tenor.label })),
  };
  const labelFor = (key: DropdownKey, value: string) =>
    options[key].find((option) => option.value === value)?.label || '';

  const amountNumber = Number(loanDetails.amount) || 0;
  const isFormValid = !!loanDetails.purpose && amountNumber >= MINIMUM_AMOUNT && !!loanDetails.duration;

  // The breakdown is priced by the server (/loan/quote/), as on the web.
  const summaryDetails = quote ? [
    { label: 'Amount you will receive', value: formatNaira(quote.amount_to_receive) },
    { label: 'Loan amount', value: formatNaira(quote.loan_amount) },
    { label: 'Monthly flat interest rate', value: percent(quote.monthly_interest_rate) },
    { label: 'Loan duration', value: labelFor('duration', String(quote.duration_in_months)) || `${quote.duration_in_months} months` },
    { label: 'Management fee', value: `${percent(quote.management_fee_percentage)} flat` },
    { label: 'Credit life insurance', value: `${percent(quote.credit_life_insurance_percentage)} flat` },
    { label: 'Estimated total repayment', value: formatNaira(quote.estimated_total_repayment) },
    { label: 'Date of first payment', value: formatDate(quote.date_of_first_payment) },
  ] : [];

  const handleProceed = async () => {
    if (!isFormValid) return;
    if (!quote) {
      const kyc = useKYCStore.getState();
      if (!isKycCompleted(kyc)) {
        // Check the server before sending the user back to KYC.
        await kyc.syncKycProgress();
        if (!isKycCompleted(useKYCStore.getState())) {
          Toast.show('Complete your KYC to take a loan.', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
          router.push((nextKycRoute() ?? '/kyc/phone') as any);
          return;
        }
      }
      getQuote().catch(() => undefined);
      return;
    }
    setIsOpeningAddress(true);
    try {
      await loadCurrentAddress();
    } catch {
      // Without the current address the user can still enter one.
    } finally {
      setIsOpeningAddress(false);
    }
    router.push('/loans/address');
  };

  const openDropdown = (key: DropdownKey) => {
    setActiveDropdown(key);
    bottomSheetRef.current?.expand();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>


          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <ThemedText type="title" style={styles.title}>Apply for Loan</ThemedText>
            </View>
            <CircularProgress
              currentStep={1}
              totalSteps={2}
              progress={1 / 2}
              size={60}
            />
          </View>

          <View style={styles.form}>
            <View style={styles.dropdownContainer}>
              <ThemedText style={styles.fieldLabel}>I want this loan for?</ThemedText>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openDropdown('purpose')}
              >
                <ThemedText style={[styles.dropdownValue, !loanDetails.purpose && { color: '#AAA' }]}>
                  {labelFor('purpose', loanDetails.purpose) || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <FloatingLabelInput
              label="How much do you need?"
              placeholder="₦ 10,000,000"
              keyboardType="numeric"
              value={loanDetails.amount ? Number(loanDetails.amount).toLocaleString('en-NG') : ''}
              onChangeText={(val) => setLoanField('amount', val.replace(/\D/g, ''))}
            />
            {(fieldErrors.amount || (loanDetails.amount !== '' && amountNumber < MINIMUM_AMOUNT)) && (
              <ThemedText style={styles.fieldError}>
                {fieldErrors.amount || `The minimum amount is ${formatNaira(MINIMUM_AMOUNT)}.`}
              </ThemedText>
            )}

            <View style={styles.dropdownContainer}>
              <ThemedText style={styles.fieldLabel}>How long do you want to repay for?</ThemedText>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openDropdown('duration')}
              >
                <ThemedText style={[styles.dropdownValue, !loanDetails.duration && { color: '#AAA' }]}>
                  {labelFor('duration', loanDetails.duration) || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {error && <ThemedText style={styles.fieldError}>{error}</ThemedText>}

          {quote && (
            <View style={styles.summaryContainer}>
              <View style={styles.monthlyPaymentCard}>
                <ThemedText style={styles.monthlyLabel}>Estimated Monthly Payment</ThemedText>
                <ThemedText style={styles.monthlyValue}>{formatNaira(quote.monthly_repayment)}</ThemedText>
              </View>

              <View style={styles.detailsList}>
                {summaryDetails.map((detail, index) => (
                  <View
                    key={detail.label}
                    style={[styles.detailItem, index === summaryDetails.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <ThemedText style={styles.detailLabel}>{detail.label}</ThemedText>
                    <ThemedText style={styles.detailValue}>{detail.value}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
              isLoading={isLoading || isOpeningAddress}
              disabled={!isFormValid || isLoading || isOpeningAddress}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={isFormValid ? "#FF7A00" : "#FAFAFA"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: isFormValid ? "#FFF" : "#AAA" }]}>{quote ? 'Continue' : 'Proceed'}</ThemedText>
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['50%']}
        enableBackdrop={true}
        backdropOpacity={0.7}
      >
        <ScrollView style={styles.optionsList}>
          <ThemedText style={styles.optionsHeader}>Select option</ThemedText>
          {activeDropdown && options[activeDropdown].length === 0 && (
            <ActivityIndicator color="#FF7A00" style={{ marginTop: 20 }} />
          )}
          {activeDropdown && options[activeDropdown].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.optionItem}
              onPress={() => {
                setLoanField(activeDropdown, opt.value);
                bottomSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{opt.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fieldError: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backBtn: {
    marginTop: 10,
    marginBottom: 10,
    marginLeft: -8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 20,
    gap:10
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  form: {
    marginTop: 20,
    gap: 16,
  },
  dropdownContainer: {
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginLeft: 4,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    ...Shadows.input,
  },
  dropdownValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
  },
  summaryContainer: {
    marginTop: 24,
  },
  monthlyPaymentCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    ...Shadows.card,
  },
  monthlyLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '400',
  },
  monthlyValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  detailsList: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    ...Shadows.card,
    backgroundColor: '#FFF',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '700',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionsList: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  optionsHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  optionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
});
