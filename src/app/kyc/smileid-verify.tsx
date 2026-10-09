import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { routeAfterKycStep } from '@/constants/kyc-routes';
import { smileCaptureToPayload } from '@/shared/smile-capture';
import { Toast } from '@/shared/ui/molecules/Toast';
import { useKYCStore } from '@/store/useKYCStore';
import { SmartSelfieParams, SmileIDSmartSelfieEnrollmentView } from '@smile_identity/react-native-expo';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// The SDK only captures the selfie and liveness frames; like the web, the
// images go to our backend, which runs Biometric KYC against the BVN.
const selfieParams: SmartSelfieParams = {
  allowNewEnroll: true,
  allowAgentMode: false,
  showAttribution: true,
  showInstructions: true,
  skipApiSubmission: true,
  useStrictMode: false,
};

export default function SmileIdVerificationScreen() {
  const router = useRouter();
  const { submitLiveness, pendingVerification, bvn, bvnInput } = useKYCStore();
  // A job already submitted for this BVN is checked again instead of
  // capturing a new selfie.
  const hasPendingJob = !!pendingVerification && pendingVerification.bvn === (bvnInput || bvn);
  const [isVerifying, setIsVerifying] = useState(hasPendingJob);
  const started = useRef(false);

  const verify = async (payload: string) => {
    setIsVerifying(true);
    try {
      const result = await submitLiveness(payload);
      if (result.verification_status !== 'verified') {
        Toast.show('Your verification is still processing. Please check again in a few minutes.', {
          type: 'info',
          position: 'top',
          backgroundColor: '#FF7A00',
        });
        router.back();
        return;
      }
      Toast.show('Identity verified successfully!', {
        type: 'success',
        position: 'top',
        backgroundColor: '#1E9F85',
      });
      router.replace(routeAfterKycStep('liveness') as any);
    } catch (error: any) {
      Toast.show(useKYCStore.getState().error || error?.message || 'Verification failed. Please try again.', {
        type: 'error',
        position: 'top',
        backgroundColor: '#FF3B30',
      });
      router.back();
    }
  };

  useEffect(() => {
    if (hasPendingJob && !started.current) {
      started.current = true;
      // submitLiveness ignores the payload when it resumes a pending job.
      verify('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuccess = async (result: unknown) => {
    if (started.current) return;
    started.current = true;
    setIsVerifying(true);
    let payload: string;
    try {
      payload = await smileCaptureToPayload(result);
    } catch (error: any) {
      handleError(error);
      return;
    }
    await verify(payload);
  };

  const handleError = (error: any) => {
    console.error('SmileID selfie capture error:', error);
    Toast.show('Verification failed. Please try again.', {
      type: 'error',
      position: 'top',
      backgroundColor: '#FF3B30',
    });
    // Go back to let user retry
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      {isVerifying ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E9F85" />
          <ThemedText style={styles.loadingText}>
            Comparing your selfie with your BVN photo...
          </ThemedText>
        </View>
      ) : (
        <SmileIDSmartSelfieEnrollmentView
          style={styles.smileIdView}
          params={selfieParams}
          onResult={(event: any) => {
            handleSuccess(event?.nativeEvent ?? event);
          }}
          onError={(event: any) => {
            handleError(event?.nativeEvent?.error ?? event);
          }}
        />
      )}
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
  smileIdView: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  configText: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',
  },
});
