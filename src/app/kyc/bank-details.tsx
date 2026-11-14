import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { normalizeNigerianPhone, useKYCStore } from '@/store/useKYCStore';
import KycService, { type ResolvedBankAccount } from '@/api/services/kyc.service';
import { salaryBanks } from '@/constants/banks';
import { PopTextInput } from '@/shared/ui/base/pop-text-input';
import { loanStyles } from '@/components/loans/loan-ui';
import { routeAfterKycStep } from '@/constants/kyc-routes';
import { useSignupStore } from '@/store/useSignupStore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BANK_RESOLVE_DEBOUNCE_MS = 400;

// salary: the account statements come from, so only banks we can pull them from.
// payout: an account to be paid into, at any bank.
type BankPurpose = 'salary' | 'payout';

export default function BankDetailsScreen() {
  const router = useRouter();
  // ?edit=salary-bank: change the account statements come from (supported banks only).
  // ?edit=loan-bank: add an account to be paid into (any bank).
  // ?return=/loans/offer: where to go after saving (app paths only).
  const params = useLocalSearchParams<{ edit?: string; return?: string }>();
  const bankEdit: BankPurpose | null = params.edit === 'salary-bank' ? 'salary' : params.edit === 'loan-bank' ? 'payout' : null;
  const purpose: BankPurpose = bankEdit ?? 'salary';
  const returnTo = params.return && /^\/[A-Za-z0-9/_()-]*$/.test(params.return) && !params.return.startsWith('//') ? params.return : null;
  const {
    banks: allBanks,
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

  const banks = purpose === 'salary' ? salaryBanks(allBanks, saved?.bank_code) : allBanks;
  const bank = banks.find((b) => b.code === bankCode) ?? allBanks.find((b) => b.code === bankCode);
  const unsupportedSalaryBank = purpose === 'salary' && !!bank && bank.supports_statement === false && allBanks.some((b) => b.supports_statement);
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

  // A different bank from the saved one needs a code and the transaction PIN.
  const isNewBank = !!saved && !!resolved && isResolved
    && (saved.bank_code !== resolved.bank_code || saved.account_number !== resolved.account_number);
  const [codeDestination, setCodeDestination] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [pin, setPin] = useState('');
  const [codeError, setCodeError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);

  const sendCode = async () => {
    setSendingCode(true);
    setCodeError('');
    try {
      const sent = await KycService.sendBankChangeCode();
      setCodeDestination(sent.destination);
    } catch (sendError: any) {
      setCodeError(sendError?.response?.data?.message || 'We could not send your code. Try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const isFormValid = isResolved && !!phoneNumber && (!isNewBank || (otpCode.length === 6 && pin.length === 4));

  const finish = () => {
    if (bankEdit && returnTo) { router.replace(returnTo as any); return; }
    // A new salary account goes straight back to pulling its statement.
    if (bankEdit === 'salary') { router.replace('/loans/statement'); return; }
    if (bankEdit) { router.replace('/(tabs)'); return; }
    router.push(routeAfterKycStep('bankDetails') as any);
  };

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
      if (!unchanged) await saveBankAccount(resolved, phone, isNewBank ? { otpCode, pin } : undefined);
      Toast.show('Bank details saved', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      finish();
    } catch (error: any) {
      // The code is single use; ask for a new one after any failure.
      if (isNewBank) { setOtpCode(''); setPin(''); setCodeDestination(''); }
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
              {purpose === 'payout' ? 'Add payout account' : 'Add bank details'}
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
              {purpose === 'payout'
                ? 'Your loan can be paid into an account at any bank. It must be in your name.'
                : 'Provide the account your salary or income goes into. We pull your bank statement from it, so only banks we can get statements from are listed.'}
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
                  <Ionicons name="chevron-down" size={20} color="#4B4B55" />
                </TouchableOpacity>
                {unsupportedSalaryBank && (
                  <ThemedText style={styles.warning}>
                    We can&apos;t get bank statements from {bank?.name} yet. Choose the bank your salary or income goes into from the list, or your loan can&apos;t be assessed.
                  </ThemedText>
                )}
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

            {isNewBank && (
              <View style={styles.newBank}>
                <ThemedText style={styles.newBankText}>
                  Adding a new bank account needs a code and your transaction PIN. Your current account stays linked, and any loan you have already accepted is still paid into it.
                </ThemedText>
                {!!codeError && <ThemedText style={[styles.warning, { color: '#FF3B30' }]}>{codeError}</ThemedText>}
                {!codeDestination ? (
                  <TouchableOpacity style={styles.sendCode} onPress={() => void sendCode()} disabled={sendingCode}>
                    <ThemedText style={styles.sendCodeText}>{sendingCode ? 'Sending…' : 'Send code'}</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View>
                      <ThemedText style={styles.fieldLabel}>Code sent to {codeDestination}</ThemedText>
                      <PopTextInput
                        style={loanStyles.input}
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                        placeholder="6-digit code"
                        value={otpCode}
                        onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                      />
                    </View>
                    <View>
                      <ThemedText style={styles.fieldLabel}>Transaction PIN</ThemedText>
                      <PopTextInput
                        style={loanStyles.input}
                        keyboardType="number-pad"
                        secureTextEntry
                        placeholder="4-digit PIN"
                        value={pin}
                        onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                      />
                    </View>
                  </>
                )}
              </View>
            )}

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
    color: '#4B4B55',
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
    color: '#4B4B55',
    fontWeight: '500',
  },
  warning: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9A3412',
    fontWeight: '600',
    marginTop: 8,
    marginLeft: 4,
  },
  newBank: {
    marginTop: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    backgroundColor: '#FFF8EE',
    borderRadius: 14,
    padding: 16,
  },
  newBankText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#3F3F46',
  },
  sendCode: {
    borderWidth: 1,
    borderColor: '#FF7A00',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF7A00',
  },
  consentText: {
    fontSize: 12,
    color: '#4B4B55',
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
