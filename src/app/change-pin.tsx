import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/shared/ui/base/button';
import { OtpInput } from '@/shared/ui/base/otp-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import KycService from '@/api/services/kyc.service';
import { getKycErrorMessage } from '@/store/useKYCStore';
import { getTransactionPinId, saveTransactionPinId } from '@/lib/transaction-pin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const pinInputProps = {
  otpCount: 4,
  unfocusedBackgroundColor: '#FFF',
  unfocusedBorderColor: '#F0F0F0',
  focusedBorderColor: '#FF7A00',
  focusedBackgroundColor: '#FFF',
  textStyle: { color: '#000' },
} as const;

// PUT /kyc/transaction-pin/{id}/ with the current PIN and the new one.
export default function ChangePinScreen() {
  const router = useRouter();
  // PINs stay on this screen only.
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  // Bumped to clear the inputs after a failed attempt.
  const [resetKey, setResetKey] = useState(0);

  const isComplete = currentPin.length === 4 && newPin.length === 4 && confirmPin.length === 4;

  const showError = (message: string) =>
    Toast.show(message, { type: 'error', position: 'top', backgroundColor: '#FF3B30' });

  const clear = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setResetKey((k) => k + 1);
  };

  const handleSave = async () => {
    if (newPin !== confirmPin) return showError('New PINs do not match');
    if (newPin === currentPin) return showError('Your new PIN must be different from the current one');
    if (/^(\d)\1{3}$/.test(newPin) || ['1234', '4321', '0123', '9876'].includes(newPin)) {
      return showError('Choose a PIN that is harder to guess');
    }

    setSaving(true);
    try {
      const id = await getTransactionPinId();
      if (!id) throw new Error('Please log in again and retry.');
      const updated = await KycService.updateTransactionPin(id, newPin, currentPin);
      await saveTransactionPinId(updated?.id ?? updated?.data?.id ?? id);
      Toast.show('Transaction PIN changed', { type: 'success', position: 'top', backgroundColor: '#1E9F85' });
      router.back();
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Change PIN" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
  footer: { paddingBottom: 20, paddingHorizontal: 24, alignItems: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700' },
});
