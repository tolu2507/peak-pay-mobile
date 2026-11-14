import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/shared/ui/base/button';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { Shadows } from '@/constants/theme';
import AuthService from '@/api/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import {
  authenticate,
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricSupport,
  isBiometricLoginEnabled,
  type BiometricSupport,
} from '@/lib/biometrics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Turning this on asks for the account password once, checks it with the API,
// then keeps it in the secure keychain so the login screen can sign in with
// Face ID / fingerprint instead of typing it.
export default function BiometricsScreen() {
  const email: string = useAuthStore((s) => s.user?.email) || '';
  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [askingPassword, setAskingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [s, on] = await Promise.all([getBiometricSupport(), isBiometricLoginEnabled()]);
    setSupport(s);
    setEnabled(on);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const label = support?.label ?? 'Biometrics';
  const success = (message: string) => Toast.show(message, { type: 'success', position: 'top', backgroundColor: '#1E9F85' });
  const fail = (message: string) => Toast.show(message, { type: 'error', position: 'top', backgroundColor: '#FF3B30' });

  const onToggle = async (value: boolean) => {
    if (!value) {
      await disableBiometricLogin();
      setEnabled(false);
      setAskingPassword(false);
      success(`${label} sign-in turned off`);
      return;
    }
    if (!support?.available) {
      fail(`Set up ${label} in your phone settings first.`);
      return;
    }
    setAskingPassword(true);
  };

  const confirmEnable = async () => {
    if (!password) return fail('Enter your password');
    if (!email) return fail('Please log in again and retry.');
    setSaving(true);
    try {
      // Make sure the password is right before saving it.
      await AuthService.login({ email_phonenumber: email, password, email });
      const ok = await authenticate(`Confirm ${label} for PeakPay`);
      if (!ok) {
        fail(`${label} was not confirmed`);
        return;
      }
      await enableBiometricLogin({ email, password });
      setEnabled(true);
      setAskingPassword(false);
      setPassword('');
      success(`${label} sign-in is on`);
    } catch (error: any) {
      const invalid = error?.response?.status === 400 || error?.response?.status === 401;
      fail(invalid ? 'That password is not correct' : 'Could not turn it on. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Biometric Authentication" />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name={support?.icon ?? 'finger-print-outline'} size={22} color="#FF7A00" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.cardTitle}>Sign in with {label}</ThemedText>
                <ThemedText style={styles.cardText}>
                  {support && !support.available
                    ? `${label} isn't set up on this phone.`
                    : 'Use your face or fingerprint instead of your password.'}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={enabled || askingPassword}
              onValueChange={onToggle}
              disabled={!support || saving}
              trackColor={{ false: '#E5E5EA', true: '#FF7A00' }}
              thumbColor="#FFF"
              ios_backgroundColor="#E5E5EA"
            />
          </View>

          {askingPassword && !enabled && (
            <View style={styles.passwordSection}>
              <ThemedText style={styles.passwordHint}>Enter your PeakPay password to turn on {label} sign-in.</ThemedText>
              <FloatingLabelInput
                label="Password"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                icon="lock-closed-outline"
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword(!showPassword)}
                autoFocus
              />
              <Button
                onPress={confirmEnable}
                isLoading={saving}
                disabled={saving}
                width={SCREEN_WIDTH - 48}
                height={56}
                backgroundColor="#FF7A00"
                borderRadius={16}
              >
                <ThemedText style={styles.buttonText}>Turn on {label}</ThemedText>
              </Button>
            </View>
          )}

          <ThemedText style={styles.note}>
            Your password is stored only on this phone, in its secure keychain, and is never shared. If you change your password, sign in with it once and {label} will keep working.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    gap: 12,
    ...Shadows.card,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF2E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 2 },
  cardText: { fontSize: 13, color: '#6E6E78', lineHeight: 18 },
  passwordSection: { marginBottom: 24, alignItems: 'center' },
  passwordHint: { fontSize: 14, color: '#4B4B55', marginBottom: 8, alignSelf: 'flex-start' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  note: { fontSize: 13, color: '#6E6E78', lineHeight: 20, textAlign: 'center' },
});
