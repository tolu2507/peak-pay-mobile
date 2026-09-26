import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { useKYCStore } from '@/store/useKYCStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NINScreen() {
  const router = useRouter();
  const { nin, setNin, nextStep, verifyNin, isLoading } = useKYCStore();

  const handleProceed = async () => {
    if (nin.length === 11) {
      try {
        await verifyNin();
        // We only move to the next step when verification passes
        nextStep();
        Toast.show('NIN verified successfully', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
        // Proceed to next-of-kin now that NIN is done
        router.push('/kyc/next-of-kin');
      } catch (error) {
        // Error handled by store/apiClient
        Toast.show('NIN verification failed', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
      }
    } else {
      Toast.show('Please enter a valid 11-digit NIN', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
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
              NIN Information
            </ThemedText>
          </View>
          <CircularProgress
            currentStep={2} // Updated step counter (assuming BVN was 1, and this is 2)
            totalSteps={7}
            progress={2 / 7}
            size={60}
          />
        </View>

        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <ThemedText style={styles.sectionTitle}>Enter your 11-digit NIN</ThemedText>
            <ThemedText style={styles.description}>
              We are required to verify your identity by CBN regulations.
            </ThemedText>

            <View style={styles.form}>
              <FloatingLabelInput
                label="NIN"
                placeholder="Enter your 11-digit NIN"
                keyboardType="numeric"
                maxLength={11}
                value={nin}
                onChangeText={setNin}
              />
              <ThemedText style={styles.footerNote}>
                Don’t know your NIN? <ThemedText style={styles.linkText}>Dial *346#</ThemedText>
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            onPress={handleProceed}
            isLoading={isLoading}
            disabled={nin.length !== 11 || isLoading}
            width={SCREEN_WIDTH - 48}
            height={56}
            backgroundColor={nin.length === 11 ? "#FF7A00" : "#F3F3F3"}
            borderRadius={16}
          >
            <ThemedText style={[styles.buttonText, { color: nin.length === 11 ? "#FFF" : "#AAA" }]}>Proceed</ThemedText>
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
