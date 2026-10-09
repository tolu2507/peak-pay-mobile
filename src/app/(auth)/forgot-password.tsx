import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/shared/ui/base/button';
import { OtpInput } from '@/shared/ui/base/otp-input';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { DarkIcon } from '@/assets/svg/darkicon';
import AuthService from '@/api/services/auth.service';
import OtpService from '@/api/services/otp.service';
import { useLoginStore } from '@/store/useLoginStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RESEND_SECONDS = 120;

const REQUIREMENT_CHECKS = [
  { id: 'length', text: 'Must contain at least 8 characters', regex: /.{8,}/ },
  { id: 'upper', text: 'Must contain an upper case letter', regex: /[A-Z]/ },
  { id: 'lower', text: 'Must contain a lower case letter', regex: /[a-z]/ },
  { id: 'special', text: 'Must contain a special character', regex: /[^A-Za-z0-9]/ },
  { id: 'number', text: 'Must contain a number', regex: /[0-9]/ },
];

// Two stages, as on the web: send a code to the email, then enter the code
// with a new password (/auth/password/reset/).
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpKey, setOtpKey] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPassVisible, setIsPassVisible] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const requirements = useMemo(
    () => REQUIREMENT_CHECKS.map((req) => ({ ...req, met: req.regex.test(newPassword) })),
    [newPassword],
  );
  const isPasswordValid = requirements.every((r) => r.met) && newPassword === confirmPassword;
  const canSubmit = codeSent ? otp.length === 6 && isPasswordValid : email.trim() !== '';

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const sendCode = async () => {
    const identifier = email.trim();
    if (!identifier) return;
    setIsLoading(true);
    setError(null);
    try {
      await OtpService.sendOtp({ otp_type: 'email', otp_action_type: 'forget_password', identifier });
      setCodeSent(true);
      setOtp('');
      setOtpKey((key) => key + 1);
      setTimer(RESEND_SECONDS);
    } catch (sendError: any) {
      setError(sendError?.message || 'We could not send a code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.resetPassword({ identifier: email.trim(), otp_code: otp, new_password: newPassword });
      const login = useLoginStore.getState();
      login.setEmail(email.trim());
      login.setNotice('Your password has been updated. Log in with your new password.');
      router.replace('/(auth)/login');
    } catch (resetError: any) {
      setError(
        resetError?.response?.status === 404
          ? 'Password reset is not available on the server yet. Please try again later.'
          : resetError?.message || 'We could not update your password. Check your code and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.logo}>
              <DarkIcon />
            </View>
          </View>

          <ThemedText type="title" style={styles.title}>
            {codeSent ? 'Create a new password' : 'Forgot password?'}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {codeSent
              ? `Enter the 6-digit code sent to ${email.trim()} and choose a new password.`
              : "Enter the email address on your account and we'll send you a verification code."}
          </ThemedText>

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <View style={styles.form}>
            {!codeSent ? (
              <FloatingLabelInput
                label="Email Address"
                placeholder="e.g sample@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                icon="mail-outline"
              />
            ) : (
              <>
                <OtpInput
                  key={otpKey}
                  otpCount={6}
                  onInputChange={setOtp}
                  inputWidth={(SCREEN_WIDTH - 80) / 6}
                  inputHeight={60}
                  inputBorderRadius={12}
                  unfocusedBackgroundColor="#F9F9F9"
                  focusedBackgroundColor="#FFF"
                  unfocusedBorderColor="#E0E0E0"
                  focusedBorderColor="#FF7A00"
                  textStyle={{ color: '#000', fontSize: 24 }}
                />
                <ThemedText style={styles.helper}>
                  {timer > 0 ? (
                    `Resend code in ${formatTime(timer)}`
                  ) : (
                    <>Didn't get a code? <ThemedText style={styles.linkText} onPress={isLoading ? undefined : sendCode}>Resend OTP</ThemedText></>
                  )}
                </ThemedText>

                <FloatingLabelInput
                  label="New Password"
                  placeholder="Enter a strong password"
                  secureTextEntry={!isPassVisible}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  icon="lock-closed-outline"
                  rightIcon={isPassVisible ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setIsPassVisible(!isPassVisible)}
                />
                <View>
                  {requirements.map((req) => (
                    <View key={req.id} style={styles.requirementRow}>
                      <Ionicons
                        name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={req.met ? '#1E9F85' : '#FF3B30'}
                      />
                      <ThemedText style={[styles.requirementText, { color: req.met ? '#333' : '#666' }]}>
                        {req.text}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                <FloatingLabelInput
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  secureTextEntry={!isPassVisible}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  icon="lock-closed-outline"
                />
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Button
              onPress={codeSent ? resetPassword : sendCode}
              isLoading={isLoading}
              disabled={!canSubmit || isLoading}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={canSubmit ? '#FF7A00' : '#F3F3F3'}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: canSubmit ? '#FFF' : '#AAA' }]}>
                {codeSent ? 'Reset Password' : 'Send Code'}
              </ThemedText>
            </Button>

            <View style={styles.signupContainer}>
              <ThemedText style={styles.signupText}>
                Remember your password? <ThemedText style={styles.linkText} onPress={() => router.replace('/(auth)/login')}>Log In</ThemedText>
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
  },
  backBtn: {
    marginLeft: -8,
  },
  logo: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    overflow: 'hidden',
  },
  form: {
    marginTop: 20,
    gap: 14,
  },
  helper: {
    fontSize: 12,
    color: '#666',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 8,
  },
  footer: {
    marginTop: 60,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  signupContainer: {
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    color: '#FF7A00',
    fontWeight: '600',
  },
});
