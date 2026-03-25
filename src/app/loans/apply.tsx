import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { useLoanStore } from '@/store/useLoanStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OPTIONS = {
  purpose: ["Car", "Business", "Education", "Health", "Personal"],
  duration: ["3 months", "6 months", "12 months", "18 months", "24 months"]
};

export default function ApplyLoanScreen() {
  const router = useRouter();
  const { loanDetails, setLoanField, nextStep } = useLoanStore();
  const [activeDropdown, setActiveDropdown] = useState<keyof typeof OPTIONS | null>(null);
  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  const amountNumber = parseFloat(loanDetails.amount.replace(/[^0-9.]/g, '')) || 0;

  const calculations = useMemo(() => {
    if (!amountNumber) return null;
    const durationMonths = parseInt(loanDetails.duration) || 6;
    const interestRate = 0.25; // 25% flat
    const managementFeeRate = 0.01; // 1%
    const insuranceRate = 0.003; // 0.3%

    const loanAmount = amountNumber;
    const totalInterest = loanAmount * interestRate;
    const managementFee = loanAmount * managementFeeRate;
    const insurance = loanAmount * insuranceRate;

    const totalRepayment = loanAmount + totalInterest + managementFee + insurance;
    const monthlyPayment = totalRepayment / durationMonths;

    return {
      monthlyPayment: Math.round(monthlyPayment),
      receiveAmount: loanAmount + (loanAmount * 0.1), // Mocking "Amount you will receive" higher as per UI
      loanAmount: loanAmount,
      interestRate: '25%',
      duration: `${durationMonths} months`,
      managementFee: '1% flat',
      insurance: '0.3% flat'
    };
  }, [amountNumber, loanDetails.duration]);

  const isFormValid = loanDetails.purpose && amountNumber > 0 && loanDetails.duration;

  const handleProceed = () => {
    if (isFormValid) {
      nextStep();
      router.push('/loans/address');
    }
  };

  const openDropdown = (key: keyof typeof OPTIONS) => {
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
                  {loanDetails.purpose || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <FloatingLabelInput
              label="How much do you need?"
              placeholder="₦ 10,000,000"
              keyboardType="numeric"
              value={loanDetails.amount}
              onChangeText={(val) => setLoanField('amount', val)}
            />

            <View style={styles.dropdownContainer}>
              <ThemedText style={styles.fieldLabel}>How long do you want to repay for?</ThemedText>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openDropdown('duration')}
              >
                <ThemedText style={[styles.dropdownValue, !loanDetails.duration && { color: '#AAA' }]}>
                  {loanDetails.duration || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {calculations && (
            <View style={styles.summaryContainer}>
              <View style={styles.monthlyPaymentCard}>
                <ThemedText style={styles.monthlyLabel}>Estimated Monthly Payment</ThemedText>
                <ThemedText style={styles.monthlyValue}>₦ {calculations.monthlyPayment.toLocaleString()}</ThemedText>
              </View>

              <View style={styles.detailsList}>
                <View style={styles.detailItem}>
                  <ThemedText style={styles.detailLabel}>Amount you will receive</ThemedText>
                  <ThemedText style={styles.detailValue}>₦ {calculations.receiveAmount.toLocaleString()}</ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <ThemedText style={styles.detailLabel}>Loan amount</ThemedText>
                  <ThemedText style={styles.detailValue}>₦ {calculations.loanAmount.toLocaleString()}</ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <ThemedText style={styles.detailLabel}>Monthly flat interest rate</ThemedText>
                  <ThemedText style={styles.detailValue}>{calculations.interestRate}</ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <ThemedText style={styles.detailLabel}>Loan duration</ThemedText>
                  <ThemedText style={styles.detailValue}>{calculations.duration}</ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <ThemedText style={styles.detailLabel}>Management fee</ThemedText>
                  <ThemedText style={styles.detailValue}>{calculations.managementFee}</ThemedText>
                </View>
                <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                  <ThemedText style={styles.detailLabel}>Credit life insurance</ThemedText>
                  <ThemedText style={styles.detailValue}>{calculations.insurance}</ThemedText>
                </View>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
              disabled={!isFormValid}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={isFormValid ? "#FF7A00" : "#FAFAFA"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: isFormValid ? "#FFF" : "#AAA" }]}>Proceed</ThemedText>
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
          {activeDropdown && OPTIONS[activeDropdown].map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.optionItem}
              onPress={() => {
                setLoanField(activeDropdown as any, opt);
                bottomSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{opt}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
