import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { routeAfterKycStep } from '@/constants/kyc-routes';
import { Button } from '@/shared/ui/base/button';
import { OtpInput } from '@/shared/ui/base/otp-input';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { useKYCStore } from '@/store/useKYCStore';
import { useSignupStore } from '@/store/useSignupStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PhoneVerificationScreen() {
  const router = useRouter();
  const { phone, phoneDialCode, isPhoneVerified, setPhone, sendPhoneOtp, verifyPhoneOtp, isLoading } = useKYCStore();
  const { form: signupForm } = useSignupStore();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpKey, setOtpKey] = useState(0);

  // Start from the number given at signup.
  useEffect(() => {
    if (!phone && signupForm.phone) setPhone(signupForm.phone.replace(/\D/g, '').replace(/^(234|0)/, ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSend = phone.replace(/\D/g, '').length >= 9;
  const goNext = () => router.replace(routeAfterKycStep('phone') as any);

  const showError = (fallback: string) =>
    Toast.show(useKYCStore.getState().error || fallback, { type: 'error', position: "top", backgroundColor: "#FF3B30" });

  const handleSend = async () => {
    try {
      await sendPhoneOtp();
      setOtp('');
      setOtpKey((key) => key + 1);
      setOtpSent(true);
      Toast.show('Code sent to your phone', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
    } catch {
      showError('Failed to send OTP');
    }
  };

  const handleVerify = async () => {
    try {
      await verifyPhoneOtp(otp);
      Toast.show('Phone number verified', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      goNext();
    } catch {
      showError('OTP verification failed');
    }
  };

  const canPress = isPhoneVerified || (otpSent ? otp.length === 6 : canSend);
  const buttonLabel = isPhoneVerified ? 'Continue' : otpSent ? 'Verify' : 'Send code';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Phone Number
            </ThemedText>
          </View>
          <CircularProgress
            currentStep={1}
            totalSteps={9}
            progress={1 / 9}
            size={60}
          />
        </View>

        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <ThemedText style={styles.sectionTitle}>Verify your phone number</ThemedText>
            <ThemedText style={styles.description}>
              {isPhoneVerified
                ? `${phoneDialCode} ${phone} has been verified.`
                : "We'll send a 6-digit code to this number by SMS."}
            </ThemedText>

            <View style={styles.form}>
              <FloatingLabelInput
                label={`Phone Number (${phoneDialCode})`}
                placeholder="e.g 0812 345 6789"
                keyboardType="phone-pad"
                value={phone}
                editable={!isPhoneVerified}
                onChangeText={(val) => {
                  setPhone(val);
                  setOtpSent(false);
                }}
                icon="call-outline"
              />

              {otpSent && !isPhoneVerified && (
                <>
                  <ThemedText style={styles.footerNote}>Enter the 6-digit code sent to your phone</ThemedText>
                  <OtpInput
                    key={otpKey}
                    otpCount={6}
                    onInputChange={setOtp}
                    inputWidth={(SCREEN_WIDTH - 80) / 6}
                    inputHeight={55}
                    inputBorderRadius={12}
                    unfocusedBackgroundColor="#F9F9F9"
                    focusedBackgroundColor="#FFF"
                    unfocusedBorderColor="#E0E0E0"
                    focusedBorderColor="#FF7A00"
                    textStyle={{ color: '#000', fontSize: 24 }}
                  />
                  <ThemedText style={styles.footerNote}>
                    Didn't get a code? <ThemedText style={styles.linkText} onPress={isLoading ? undefined : handleSend}>Resend code</ThemedText>
                  </ThemedText>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            onPress={isPhoneVerified ? goNext : otpSent ? handleVerify : handleSend}
            isLoading={isLoading}
            disabled={!canPress || isLoading}
            width={SCREEN_WIDTH - 48}
            height={56}
            backgroundColor={canPress ? "#FF7A00" : "#F3F3F3"}
            borderRadius={16}
          >
            <ThemedText style={[styles.buttonText, { color: canPress ? "#FFF" : "#AAA" }]}>{buttonLabel}</ThemedText>
          </Button>
          {!isPhoneVerified && (
            // Same temporary fallback as the web while SMS delivery is unreliable.
            <ThemedText style={[styles.footerNote, { textAlign: 'center', marginTop: 16 }]} onPress={goNext}>
              Skip for now
            </ThemedText>
          )}
        </View>
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
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    fontWeight: '400',
    maxWidth: '90%',
  },
  form: {
    marginTop: 32,
  },
  footerNote: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  linkText: {
    color: '#1E9F85',
    fontWeight: '600',
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
});
