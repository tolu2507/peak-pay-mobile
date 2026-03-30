import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { OtpInput } from '@/shared/ui/base/otp-input';
import { Ionicons } from '@expo/vector-icons';
import { Toast } from '@/shared/ui/molecules/Toast';
import { useSignupStore } from '@/store/useSignupStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const maskEmail = (email: string) => {
  if (!email) return '***@***.com';
  const [user, domain] = email.split('@');
  const masked = user.slice(0, 2) + '****';
  return `${masked}@${domain}`;
};

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 4) return '****';
  return phone.slice(0, 4) + '****' + phone.slice(-3);
};

export default function VerifyScreen() {
  const router = useRouter();
  const { form, isLoading, verifyOtp, sendOtp } = useSignupStore();
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(116);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProceed = async () => {
    if (otp.length === 6) {
      try {
        await verifyOtp(otp);
        Toast.show('Email verified successfully!', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
        router.push('/(auth)/password');
      } catch (error: any) {
        Toast.show(error.response?.data?.message || 'Invalid OTP', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
      }
    } else {
      Toast.show('Please enter the 6-digit code', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      await sendOtp();
      setTimer(116);
      Toast.show('OTP resent successfully!', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
    } catch (error: any) {
      Toast.show(error.response?.data?.message || 'Failed to resend OTP', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <ThemedText type="title" style={styles.title}>
                Verify your email
              </ThemedText>
            </View>
            <CircularProgress
              currentStep={2}
              totalSteps={4}
              progress={0.5}
              size={60}
            />
          </View>

          <ThemedText style={styles.description}>
            We have just sent a 6-digit code to your email address <ThemedText style={styles.boldText}>{maskEmail(form.email)}</ThemedText>. Enter it here.
          </ThemedText>

          <View style={styles.otpContainer}>
            <OtpInput
              otpCount={6}
              onInputChange={(code) => setOtp(code)}
              inputWidth={(SCREEN_WIDTH - 80) / 6}
              inputHeight={60}
              inputBorderRadius={12}
              unfocusedBackgroundColor="#F9F9F9"
              focusedBackgroundColor="#FFF"
              unfocusedBorderColor="#E0E0E0"
              focusedBorderColor="#FF7A00"
              textStyle={{ color: '#000', fontSize: 24 }}
            />
          </View>

          <View style={styles.timerContainer}>
            <ThemedText style={styles.timerText}>
              Resend code in {formatTimer(timer)}
            </ThemedText>
          </View>

          <View style={styles.resendOptions}>
            <TouchableOpacity style={styles.resendButton} onPress={handleResend} disabled={timer > 0}>
              <Ionicons name="refresh-outline" size={24} color={timer > 0 ? '#CCC' : '#666'} />
              <ThemedText style={styles.resendLabel}>
                Didn't get a code? <ThemedText style={[styles.linkText, timer > 0 && { color: '#CCC' }]}>Resend OTP</ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
              isLoading={isLoading}
              disabled={otp.length !== 6 || isLoading}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={otp.length === 6 ? "#FF7A00" : "#F3F3F3"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: otp.length === 6 ? "#FFF" : "#AAA" }]}>Proceed</ThemedText>
            </Button>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  titleContainer: {
    flex: 1,
    marginRight: 20,
    marginBottom: 10
  },
  title: {
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '700',
    color: '#000',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    lineHeight: 24,
    fontWeight: '400',
    maxWidth: '80%'
  },
  boldText: {
    fontWeight: '700',
    color: '#333',
  },
  otpContainer: {
    marginTop: 40,
    alignItems: 'center',
    width: '100%',
  },
  timerContainer: {
    alignItems: "flex-start",
  },
  timerText: {
    fontSize: 12,
    color: '#666',
  },
  resendOptions: {
    marginTop: 12,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendLabel: {
    fontSize: 12,
    color: '#333',
    marginLeft: 12, fontWeight: '400',
  },
  linkText: {
    color: '#FF7A00',
    fontWeight: '500', fontSize: 12,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 40,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
