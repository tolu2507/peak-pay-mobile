import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { routeAfterKycStep } from '@/constants/kyc-routes';
import { ninLookupAgeMs, ninPollDelay, useKYCStore } from '@/store/useKYCStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NIN_SLOW_AFTER_SECONDS = 60;

export default function NINScreen() {
  const router = useRouter();
  const {
    ninInput: nin,
    setNinInput: setNin,
    verifyNin,
    fetchNinStatus,
    ninVerification,
    ninCheckedAt,
    isNinVerified,
    isLoading,
  } = useKYCStore();
  const [pollFailed, setPollFailed] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const status = ninVerification?.verification_status;
  const isPending = status === 'pending';
  const isFailed = status === 'rejected' || status === 'cancelled' || status === 'unverified';
  const pollStopped = isPending
    && ninPollDelay(ninLookupAgeMs(ninVerification, ninCheckedAt, ninCheckedAt)) === null;
  const elapsed = Math.floor(ninLookupAgeMs(ninVerification, ninCheckedAt, Math.max(now, ninCheckedAt)) / 1000);

  const goNext = () => router.replace(routeAfterKycStep('nin') as any);

  // Resume a lookup submitted earlier (e.g. before the app was closed).
  useEffect(() => {
    fetchNinStatus().catch(() => undefined);
  }, [fetchNinStatus]);

  // SmileID answers NIN lookups asynchronously: poll until it does, slowing
  // down and then stopping as the lookup ages (see NIN_POLL_SCHEDULE).
  useEffect(() => {
    if (!isPending || pollFailed) return;
    const delay = ninPollDelay(ninLookupAgeMs(ninVerification, ninCheckedAt, ninCheckedAt));
    if (delay === null) return;
    const timer = setTimeout(() => {
      fetchNinStatus().catch(() => setPollFailed(true));
    }, delay);
    return () => clearTimeout(timer);
  }, [isPending, pollFailed, ninVerification, ninCheckedAt, fetchNinStatus]);

  useEffect(() => {
    if (!isPending || pollStopped) return;
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, [isPending, pollStopped]);

  const handleProceed = async () => {
    if (isNinVerified || status === 'verified') {
      goNext();
      return;
    }
    if (isPending) {
      setIsRechecking(true);
      setPollFailed(false);
      try {
        await fetchNinStatus();
      } catch {
        setPollFailed(true);
      } finally {
        setIsRechecking(false);
      }
      return;
    }
    if (/^\d{11}$/.test(nin)) {
      setPollFailed(false);
      try {
        await verifyNin();
      } catch (error) {
        // Error shown by the store/apiClient toast
      }
    } else {
      Toast.show('Please enter a valid 11-digit NIN', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
    }
  };

  useEffect(() => {
    if (status !== 'verified') return;
    Toast.show('NIN verified successfully', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
    const timer = setTimeout(goNext, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const isVerified = isNinVerified || status === 'verified';
  const statusNote = isVerified
    ? 'Your NIN is verified.'
    : isPending
      ? pollFailed
        ? "We couldn't reach the server to check your status. Your NIN check is still running."
        : pollStopped
          ? "NIMC is taking longer than usual. We'll keep checking in the background, so you can come back later or check again now."
          : `Checking your NIN with NIMC... ${elapsed}s${elapsed >= NIN_SLOW_AFTER_SECONDS ? '. This is taking longer than usual.' : ''}`
      : isFailed
        ? `NIN verification failed. ${ninVerification?.reason || ''}`.trim()
        : null;
  const buttonLabel = isVerified ? 'Continue' : isPending ? 'Check again' : isFailed ? 'Try again' : 'Proceed';
  const canPress = isVerified || isPending || nin.length === 11;

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
                editable={!isPending && !isVerified}
              />
              {statusNote && (
                <ThemedText style={[styles.footerNote, { color: isFailed ? '#FF3B30' : isVerified ? '#1E9F85' : '#666' }]}>
                  {statusNote}
                </ThemedText>
              )}
              <ThemedText style={styles.footerNote}>
                Don’t know your NIN? <ThemedText style={styles.linkText}>Dial *346#</ThemedText>
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            onPress={handleProceed}
            isLoading={isLoading || isRechecking}
            disabled={!canPress || isLoading || isRechecking}
            width={SCREEN_WIDTH - 48}
            height={56}
            backgroundColor={canPress ? "#FF7A00" : "#F3F3F3"}
            borderRadius={16}
          >
            <ThemedText style={[styles.buttonText, { color: canPress ? "#FFF" : "#AAA" }]}>{buttonLabel}</ThemedText>
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
