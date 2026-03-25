import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { OtpInput } from '@/shared/ui/base/otp-input';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { Toast } from '@/shared/ui/molecules/Toast';
import { useKYCStore } from '@/store/useKYCStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CreatePinScreen() {
  const router = useRouter();
    const { pin, confirmPin, setPin, setConfirmPin, createTransactionPin, isLoading } = useKYCStore();
  const [localLoading, setLocalLoading] = useState(false);

  const isComplete = pin.length === 4 && confirmPin.length === 4;

  const handleComplete = async () => {
    if (pin !== confirmPin) {
      Toast.show('PINs do not match', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
      return;
    }

    try {
      await createTransactionPin();
      Toast.show('KYC Verification Complete!', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      router.replace('/(tabs)');
    } catch (error) {
      // Error is handled by store/apiClient
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
              Create Transaction PIN
            </ThemedText>
          </View>
          <CircularProgress
            currentStep={7}
            totalSteps={7}
            progress={1}
            size={60}
          />
        </View>

        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <ThemedText style={styles.subtitle}>Create your Peakpay PIN</ThemedText>
            <ThemedText style={styles.description}>
              Please keep your PIN safe, it will be used to complete transactions on Peakpay.
            </ThemedText>

            <View style={styles.pinSection}>
              <ThemedText style={styles.fieldLabel}>PIN</ThemedText>
              <OtpInput
                otpCount={4}
                onInputChange={(val) => setPin(val)}
                unfocusedBackgroundColor="#FFF"
                unfocusedBorderColor="#F0F0F0"
                focusedBorderColor="#FF7A00"
                focusedBackgroundColor="#FFF"
                textStyle={{ color: '#000' }}
              />
            </View>

            <View style={styles.pinSection}>
              <ThemedText style={styles.fieldLabel}>Confirm PIN</ThemedText>
              <OtpInput
                otpCount={4}
                onInputChange={(val) => setConfirmPin(val)}
                unfocusedBackgroundColor="#FFF"
                unfocusedBorderColor="#F0F0F0"
                focusedBorderColor="#FF7A00"
                focusedBackgroundColor="#FFF"
                textStyle={{ color: '#000' }}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            onPress={handleComplete}
            isLoading={isLoading}
            disabled={!isComplete}
            width={SCREEN_WIDTH - 48}
            height={56}
            backgroundColor={isComplete ? "#FF7A00" : "#F3F3F3"}
            borderRadius={16}
          >
            <ThemedText style={[styles.buttonText, { color: isComplete ? "#FFF" : "#AAA" }]}>Complete</ThemedText>
          </Button>
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
  subtitle: {
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
    marginBottom: 32,
  },
  pinSection: {
    marginBottom: 24,
    width: '100%',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
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
