import { ThemedView } from '@/components/themed-view';
import { Toast } from '@/shared/ui/molecules/Toast';
import { useKYCStore } from '@/store/useKYCStore';
import { BiometricKYCParams, ConsentInformationParams, IdInfoParams, SmileIDBiometricKYCView } from '@smile_identity/react-native-expo';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';

// SmileID Expo SDK - uncomment after installing @smile_identity/react-native-expo
// import { SmileIDBiometricKYCView } from '@smile_identity/react-native-expo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SmileIdVerificationScreen() {
  const router = useRouter();
  const { smileIdConfig, nextStep, bvn, verifyBvn } = useKYCStore();
  const [isComplete, setIsComplete] = useState(false);

  const idInfoParams: IdInfoParams = {
    country: 'NG',
    idType: 'BVN',
    idNumber: bvn,
    entered: true,
  };

  const consentInformationParams: ConsentInformationParams = {
    consentGrantedDate: new Date().toISOString(),
    personalDetails: false,
    contactInformation: false,
    documentInformation: false
  };

  // Build the BiometricKYC params from the config returned by the backend
  const biometricKYCParams: BiometricKYCParams = {
    allowNewEnroll: false,
    allowAgentMode: true,
    showAttribution: true,
    showInstructions: true,
    skipApiSubmission: false,
    useStrictMode: false,
    extraPartnerParams: {
      'custom_param_1': 'value1',
      'custom_param_2': 'value2'
    },
    consentInformation: consentInformationParams, // Optional consent information
    idInfo: idInfoParams
  };

  const handleSuccess = async (result: any) => {
    console.log('SmileID Biometric KYC Success:', result);
    setIsComplete(true);
    await verifyBvn();
    nextStep();
    Toast.show('Identity verified successfully!', {
      type: 'success',
      position: 'top',
      backgroundColor: '#1E9F85',
    });
    // Navigate to next-of-kin (skipping old camera step)
    router.replace('/kyc/next-of-kin');
  };

  const handleError = (error: any) => {
    console.error('SmileID Biometric KYC Error:', error);
    Toast.show('Verification failed. Please try again.', {
      type: 'error',
      position: 'top',
      backgroundColor: '#FF3B30',
    });
    // Go back to let user retry
    router.back();
  };

  // If no config from backend, show error
  // if (!smileIdConfig) {
  //   return (
  //     <ThemedView style={styles.container}>
  //       <SafeAreaView style={styles.safeArea}>
  //         <View style={styles.errorContainer}>
  //           <ThemedText style={styles.errorText}>
  //             Verification configuration not found. Please go back and try again.
  //           </ThemedText>
  //         </View>
  //       </SafeAreaView>
  //     </ThemedView>
  //   );
  // }

  return (
    <ThemedView style={styles.container}>
      {/*
        ============================================================
        SMILE ID BIOMETRIC KYC VIEW
        ============================================================
        
        Uncomment the SmileIDBiometricKYCView below after installing
        @smile_identity/react-native-expo:
        
        npx expo install @smile_identity/react-native-expo
        
        Then uncomment the import at the top of this file as well.
        ============================================================
      */}


      <SmileIDBiometricKYCView
        style={styles.smileIdView}
        params={biometricKYCParams}
        onResult={(event) => {
          handleSuccess(event.nativeEvent.result);
        }}
        onError={(event) => {
          handleError(event.nativeEvent.error);
        }}
      />


      {/* Placeholder while SDK is not installed - remove this once SmileID is working */}
      {/* <SafeAreaView style={styles.safeArea}>
        <View style={styles.placeholderContainer}>
          <ThemedText style={styles.placeholderTitle}>SmileID Biometric KYC</ThemedText>
          <ThemedText style={styles.placeholderText}>
            The SmileID SDK view will render here once{'\n'}
            @smile_identity/react-native-expo is installed.
          </ThemedText>
          <ThemedText style={styles.configText}>
            Config received: {JSON.stringify(smileIdConfig, null, 2)}
          </ThemedText>
        </View>
      </SafeAreaView> */}
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
