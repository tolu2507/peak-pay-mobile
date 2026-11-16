import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/shared/ui/base/button';
import { OtpInput } from '@/shared/ui/base/otp-input';
import { PopTextInput } from '@/shared/ui/base/pop-text-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { loanStyles } from '@/components/loans/loan-ui';
import KycService, { describePinChangeError } from '@/api/services/kyc.service';
import { getKycErrorMessage } from '@/store/useKYCStore';
import { getTransactionPinId, saveTransactionPinId } from '@/lib/transaction-pin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RESEND_SECONDS = 59;

const pinInputProps = {
  otpCount: 4,
  unfocusedBackgroundColor: '#FFF',
  unfocusedBorderColor: '#F0F0F0',
  focusedBorderColor: '#FF7A00',
  focusedBackgroundColor: '#FFF',
  textStyle: { color: '#000' },
} as const;

const easyToGuess = (pin: string) => /^(\d)\1{3}$/.test(pin) || ['1234', '4321', '0123', '9876'].includes(pin);
const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

// PUT /kyc/transaction-pin/{id}/ with the current PIN and the new one, or,
// via "Forgot PIN?", with a code emailed to the account email.
export default function ChangePinScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'current' | 'code'>('current');
  // The code and PINs stay on this screen only; never logged or stored.
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [destination, setDestination] = useState('');
  const [timer, setTimer] = useState(0);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [pinError, setPinError] = useState('');
  // Bumped to clear the inputs after a failed attempt.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const pinsFilled = newPin.length === 4 && confirmPin.length === 4;
  const isComplete = pinsFilled && (mode === 'current' ? currentPin.length === 4 : otp.length === 6);

  const showError = (message: string) =>
    Toast.show(message, { type: 'error', position: 'top', backgroundColor: '#FF3B30' });

  const succeed = () => {
    Toast.show('Transaction PIN changed', { type: 'success', position: 'top', backgroundColor: '#1E9F85' });
    router.back();
  };

  const clear = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setResetKey((k) => k + 1);
  };

  const clearMessages = () => { setCodeError(''); setOtpError(''); setPinError(''); };

  const sendCode = async () => {
    clearMessages();
    setSending(true);
    try {
      const sent = await KycService.sendPinChangeCode();
      setDestination(sent.destination);
      setOtp('');
      setTimer(RESEND_SECONDS);
    } catch (error) {
      const problem = describePinChangeError(error);
      if (problem.createPin) { router.replace('/kyc/create-pin' as any); return; }
      setCodeError(problem.message);
    } finally {
      setSending(false);
    }
  };

  const startForgotPin = () => {
    clearMessages();
    clear();
    setMode('code');
    void sendCode();
  };

  const backToCurrentPin = () => {
    clearMessages();
    clear();
    setOtp('');
    setDestination('');
    setTimer(0);
    setMode('current');
  };

  const handleSave = async () => {
    if (newPin !== confirmPin) return mode === 'code' ? setPinError('New PINs do not match') : showError('New PINs do not match');
    if (mode === 'current' && newPin === currentPin) return showError('Your new PIN must be different from the current one');
    if (easyToGuess(newPin)) {
      return mode === 'code' ? setPinError('Choose a PIN that is harder to guess') : showError('Choose a PIN that is harder to guess');
    }
    if (mode === 'code') return void changeWithCode();

    setSaving(true);
    try {
      const id = await getTransactionPinId();
      if (!id) throw new Error('Please log in again and retry.');
      const updated = await KycService.updateTransactionPin(id, newPin, currentPin);
      await saveTransactionPinId(updated?.id ?? updated?.data?.id ?? id);
      succeed();
    } catch (error: any) {
      const status = error?.response?.status;
      showError(
        status === 404
          ? 'We could not find your PIN. Please contact support to reset it.'
          : getKycErrorMessage(error, 'Could not change your PIN. Check your current PIN and try again.'),
      );
      clear();
    } finally {
      setSaving(false);
    }
  };

  const changeWithCode = async () => {
    clearMessages();
    setSaving(true);
    try {
      await KycService.changePinWithCode(otp, newPin);
      succeed();
    } catch (error) {
      const problem = describePinChangeError(error);
      if (problem.createPin) { router.replace('/kyc/create-pin' as any); return; }
      if (problem.field === 'otp') setOtpError(problem.message);
      else if (problem.field === 'pin') setPinError(problem.message);
      else setCodeError(problem.message);
      // The code is used up: clear it and allow a resend straight away.
      if (problem.resend) { setOtp(''); setTimer(0); }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title={mode === 'current' ? 'Change PIN' : 'Forgot PIN'} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {mode === 'current' ? (
            <>
              <ThemedText style={styles.description}>
                Your transaction PIN is used to approve loans and other actions on PeakPay. Enter your current PIN, then choose a new one.
              </ThemedText>

              <View style={styles.pinSection}>
                <ThemedText style={styles.fieldLabel}>Current PIN</ThemedText>
                <OtpInput key={`current-${resetKey}`} {...pinInputProps} onInputChange={setCurrentPin} />
              </View>
              <View style={styles.pinSection}>
                <ThemedText style={styles.fieldLabel}>New PIN</ThemedText>
                <OtpInput key={`new-${resetKey}`} {...pinInputProps} onInputChange={setNewPin} />
              </View>
              <View style={styles.pinSection}>
                <ThemedText style={styles.fieldLabel}>Confirm new PIN</ThemedText>
                <OtpInput key={`confirm-${resetKey}`} {...pinInputProps} onInputChange={setConfirmPin} />
              </View>
              <TouchableOpacity onPress={startForgotPin}>
                <ThemedText style={styles.link}>Forgot PIN?</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ThemedText style={styles.description}>
                {destination
                  ? `We sent a code to ${destination}. Enter it with your new PIN.`
                  : sending ? 'Sending your code…' : "We'll email you a code to set a new PIN."}
              </ThemedText>

              <View style={styles.pinSection}>
                <ThemedText style={styles.fieldLabel}>6-digit code</ThemedText>
                <PopTextInput
                  style={loanStyles.input}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                />
                {!!otpError && <ThemedText style={styles.error}>{otpError}</ThemedText>}
                {timer > 0 ? (
                  <ThemedText style={styles.hint}>Resend code in {formatTimer(timer)}</ThemedText>
                ) : (
                  <TouchableOpacity onPress={() => void sendCode()} disabled={sending}>
                    <ThemedText style={[styles.link, styles.resend]}>
                      {sending ? 'Sending…' : destination ? 'Resend code' : 'Send code'}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.pinSection}>
                <ThemedText style={styles.fieldLabel}>New PIN</ThemedText>
                <PopTextInput
                  style={loanStyles.input}
                  keyboardType="number-pad"
                  secureTextEntry
                  placeholder="4-digit PIN"
                  value={newPin}
                  onChangeText={(v) => setNewPin(v.replace(/\D/g, '').slice(0, 4))}
                />
              </View>
              <View style={styles.pinSection}>
                <ThemedText style={styles.fieldLabel}>Confirm new PIN</ThemedText>
                <PopTextInput
                  style={loanStyles.input}
                  keyboardType="number-pad"
                  secureTextEntry
                  placeholder="4-digit PIN"
                  value={confirmPin}
                  onChangeText={(v) => setConfirmPin(v.replace(/\D/g, '').slice(0, 4))}
                />
                {!!pinError && <ThemedText style={styles.error}>{pinError}</ThemedText>}
              </View>
              {!!codeError && <ThemedText style={[styles.error, styles.pinSection]}>{codeError}</ThemedText>}
              <TouchableOpacity onPress={backToCurrentPin}>
                <ThemedText style={styles.link}>I remember my PIN</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            onPress={handleSave}
            isLoading={saving}
            disabled={!isComplete || saving}
            width={SCREEN_WIDTH - 48}
            height={56}
            backgroundColor={isComplete ? '#FF7A00' : '#F3F3F3'}
            borderRadius={16}
          >
            <ThemedText style={[styles.buttonText, { color: isComplete ? '#FFF' : '#AAA' }]}>Change PIN</ThemedText>
          </Button>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  description: { fontSize: 14, color: '#4B4B55', lineHeight: 22, marginBottom: 32 },
  pinSection: { marginBottom: 24, width: '100%' },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 12 },
  link: { fontSize: 14, fontWeight: '600', color: '#FF7A00', textAlign: 'center', paddingVertical: 4 },
  resend: { textAlign: 'left', marginTop: 8 },
  hint: { fontSize: 13, color: '#4B4B55', marginTop: 8 },
  error: { fontSize: 13, color: '#FF3B30', marginTop: 8 },
  footer: { paddingBottom: 20, paddingHorizontal: 24, alignItems: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700' },
});
