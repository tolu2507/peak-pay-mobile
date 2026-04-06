import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { useKYCStore } from '@/store/useKYCStore';
import { useSignupStore } from '@/store/useSignupStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import KycService from '@/api/services/kyc.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BANKS = ["Access Bank", "First Bank", "GTBank", "Kuda Bank", "Zenith Bank", "UBA", "Stanbic IBTC"];

export default function BankDetailsScreen() {
  const router = useRouter();
  const { bank, setBankField, nextStep } = useKYCStore();
  const { form: signupForm } = useSignupStore();
  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fullName = signupForm.firstName && signupForm.lastName ? `${signupForm.firstName} ${signupForm.lastName}` : 'Oluwasegun Adigun';

  const isFormValid = bank.bankName && bank.accountNumber.length === 10 && (signupForm.phone || bank.phone) && verifiedName !== '';

  const handleAccountNumberChange = (val: string) => {
    setBankField('accountNumber', val);
    if (val.length === 10) {
      verifyAccount();
    } else {
      setVerifiedName('');
    }
  };

  const verifyAccount = () => {
    setIsVerifying(true);
    setVerifiedName('');
    // Simulate API call for account verification
    setTimeout(() => {
      setIsVerifying(false);
      setVerifiedName(fullName);
      Toast.show('Account verified successfully', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
    }, 2000);
  };

  const handleProceed = async () => {
    if (isFormValid) {
      setIsLoading(true);
      try {
        await KycService.createBankDetails({
          bank_name: bank.bankName,
          account_number: bank.accountNumber,
          account_name: verifiedName,
          phone_number: signupForm.phone || bank.phone,
        });
        nextStep();
        Toast.show('Bank details saved', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
        router.push('/kyc/create-pin');
      } catch (error: any) {
        Toast.show(error.response?.data?.message || 'Failed to save bank details', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Add bank details
            </ThemedText>
          </View>
          <CircularProgress
            currentStep={6}
            totalSteps={7}
            progress={6 / 7}
            size={60}
          />
        </View>

        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <ThemedText style={styles.description}>
              Provide your salary or most active account to qualify for better loan offers and significantly higher amounts.
            </ThemedText>

            <View style={styles.form}>
              <View style={styles.dropdownContainer}>
                <ThemedText style={styles.fieldLabel}>Bank</ThemedText>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => bottomSheetRef.current?.expand()}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.dropdownValue, !bank.bankName && { color: '#AAA' }]}>
                    {bank.bankName || 'Select an option'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>



              <View style={styles.phoneContainer}>
                <FloatingLabelInput
                  label="Account Number"
                  placeholder="Enter answer"
                  keyboardType="numeric"
                  maxLength={10}
                  value={bank.accountNumber}
                  onChangeText={handleAccountNumberChange}
                />
                <View style={styles.phoneHeader}>
                  {isVerifying ? (
                    <View style={styles.verifyingContainer}>
                      <ActivityIndicator size="small" color="#FF7A00" />
                      <ThemedText style={styles.verifyingText}>Verifying account...</ThemedText>
                    </View>
                  ) : verifiedName ? (
                    <ThemedText style={styles.verifiedName}>{verifiedName}</ThemedText>
                  ) : null}
                </View>
              </View>
              <FloatingLabelInput
                label="Phone Number"
                placeholder="Enter answer"
                keyboardType="phone-pad"
                value={signupForm.phone || bank.phone}
                onChangeText={(val) => setBankField('phone', val)}
              />
            </View>

            <ThemedText style={styles.consentText}>
              By proceeding, you are giving us permission to run a credit check and collect financial information from you.
            </ThemedText>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            onPress={handleProceed}
            disabled={!isFormValid}
            width={SCREEN_WIDTH - 48}
            height={56}
            backgroundColor={isFormValid ? "#FF7A00" : "#F3F3F3"}
            borderRadius={16}
          >
            <ThemedText style={[styles.buttonText, { color: isFormValid ? "#FFF" : "#AAA" }]}>Proceed</ThemedText>
          </Button>
        </View>
      </SafeAreaView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['50%', '70%']}
        enableBackdrop={true}
        backdropOpacity={0.7}
        backgroundColor="#FFF"
        borderRadius={32}
      >
        <ScrollView style={styles.optionsList}>
          <ThemedText style={styles.optionsHeader}>Select bank</ThemedText>
          {BANKS.map((b, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.optionItem}
              onPress={() => {
                setBankField('bankName', b);
                bottomSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{b}</ThemedText>
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
    paddingBottom: 24,
  },
  formContainer: {
    flex: 1,
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
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    marginTop: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  dropdownContainer: {
    marginTop: 4,
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
  phoneContainer: {
    marginTop: 0,
  },
  phoneHeader: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  verifiedName: {
    fontSize: 12,
    color: '#1E9F85',
    fontWeight: '600',
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifyingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  consentText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginTop: 24,
    fontWeight: '400',
  },
  footer: {
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionsList: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
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
    fontWeight: '400',
  },
});
