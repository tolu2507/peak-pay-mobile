import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { normalizeNigerianPhone, useKYCStore } from '@/store/useKYCStore';
import type { ResolvedBankAccount } from '@/api/services/kyc.service';
import { routeAfterKycStep } from '@/constants/kyc-routes';
import { useSignupStore } from '@/store/useSignupStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BANK_RESOLVE_DEBOUNCE_MS = 400;

export default function BankDetailsScreen() {
  const router = useRouter();
  const {
    banks,
    bankAccount: saved,
    isBankAccountLoaded,
    loadBanks,
    loadBankAccount,
    resolveBankAccount,
    saveBankAccount,
    phone: kycPhone,
    isLoading,
  } = useKYCStore();
  const { form: signupForm } = useSignupStore();
  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [phone, setPhone] = useState('');
  // The saved account counts as already resolved.
  const [resolved, setResolved] = useState<ResolvedBankAccount | null>(null);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    void loadBanks();
    if (!isBankAccountLoaded) void loadBankAccount();
  }, [isBankAccountLoaded, loadBanks, loadBankAccount]);

  // Pre-fill the saved account, else the phone given at signup or KYC.
  useEffect(() => {
    if (saved) {
      setBankCode(saved.bank_code);
      setAccountNumber(saved.account_number);
      setPhone(saved.phone_number?.startsWith('+234') ? `0${saved.phone_number.slice(4)}` : saved.phone_number ?? '');
      setResolved(saved);
    } else if (!phone) {
      setPhone(signupForm.phone || (kycPhone ? `0${kycPhone}` : ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const bank = banks.find((b) => b.code === bankCode);
  // Identifies the bank/account pair to resolve; null until both are complete.
  const resolveKey = bank && accountNumber.length === 10 ? `${bank.code}:${accountNumber}` : null;
  const isResolved = !!resolved && `${resolved.bank_code}:${resolved.account_number}` === resolveKey;
  const isVerifying = !!resolveKey && resolvingKey === resolveKey;
  const currentError = resolveError?.key === resolveKey ? resolveError.message : '';
  const phoneNumber = normalizeNigerianPhone(phone);
  const verifiedName = isResolved ? resolved!.account_name : '';

  useEffect(() => {
    if (!resolveKey || isResolved || !bank) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setResolvingKey(resolveKey);
      try {
        setResolved(await resolveBankAccount(accountNumber, bank.code, controller.signal));
      } catch (resolveFailure) {
        if (!controller.signal.aborted) {
          setResolveError({ key: resolveKey, message: (resolveFailure as Error).message });
        }
      } finally {
        if (!controller.signal.aborted) setResolvingKey(null);
      }
    }, BANK_RESOLVE_DEBOUNCE_MS);
    // A newer bank/account pair cancels this lookup, so a late response
    // can't overwrite it.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [resolveKey, isResolved, bank, accountNumber, resolveBankAccount]);

  const isFormValid = isResolved && !!phoneNumber;

  const handleAccountNumberChange = (val: string) => {
    setAccountNumber(val.replace(/\D/g, '').slice(0, 10));
  };

  const handleProceed = async () => {
    if (!resolved || !isFormValid) return;
    const unchanged = saved
      && saved.bank_code === resolved.bank_code
      && saved.account_number === resolved.account_number
      && saved.phone_number === phoneNumber;
    try {
      if (!unchanged) await saveBankAccount(resolved, phone);
      Toast.show('Bank details saved', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      router.push(routeAfterKycStep('bankDetails') as any);
    } catch (error: any) {
      Toast.show(useKYCStore.getState().error || error?.message || 'Failed to save bank details', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
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
                  <ThemedText style={[styles.dropdownValue, !bank && { color: '#AAA' }]}>
                    {bank?.name || (banks.length ? 'Select an option' : 'Loading banks...')}
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
                  value={accountNumber}
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
                  ) : currentError ? (
                    <ThemedText style={[styles.verifiedName, { color: '#FF3B30' }]}>{currentError}</ThemedText>
                  ) : null}
                </View>
              </View>
              <FloatingLabelInput
                label="Phone Number"
                placeholder="Enter answer"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
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
            isLoading={isLoading}
            disabled={!isFormValid || isLoading}
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
          {banks.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.optionItem}
              onPress={() => {
                setBankCode(b.code);
                bottomSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{b.name}</ThemedText>
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
    ...Shadows.input,
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
