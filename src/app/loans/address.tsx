import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { AddressVerification, UploadFile } from '@/api/services/loan.service';
import { NIGERIAN_STATES } from '@/constants/nigeria';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { useLoanStore } from '@/store/useLoanStore';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const UTILITY_BILL_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const UTILITY_BILL_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const UTILITY_BILL_MAX_BYTES = 5 * 1024 * 1024;

const addressLine = (address: AddressVerification) =>
  [
    `${address.house_number} ${address.street}`.trim(),
    address.closest_landmark && `near ${address.closest_landmark}`,
    address.city,
    address.lga,
    address.state,
  ]
    .filter(Boolean)
    .join(', ');

// Why a previous address can't be used, shown above the form.
const resubmitReason = (address: AddressVerification | null) => {
  if (!address || !address.needs_new_address) return null;
  if (address.status === 'rejected') {
    return `Your previous address was not accepted${address.review_note ? `: ${address.review_note}` : '.'} Please submit it again with a valid utility bill.`;
  }
  if (address.status === 'expired') {
    return 'Your address verification has expired. We confirm addresses every 6 months, so please submit a recent utility bill.';
  }
  return null;
};

export default function AddressLoanScreen() {
  const router = useRouter();
  const {
    address,
    setAddressField,
    currentAddress,
    submitAddress,
    applyLoan,
    resetLoan,
    isLoading,
    error,
    fieldErrors,
  } = useLoanStore();
  const [file, setFile] = useState<UploadFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  // A verified or pending address on file is reused unless the user moved.
  const canReuseAddress = !!currentAddress && !currentAddress.needs_new_address;
  const showForm = !canReuseAddress || useNewAddress;

  const isFormValid = !showForm || !!(
    address.houseNumber.trim() &&
    address.houseAddress.trim() &&
    address.landmark.trim() &&
    address.state &&
    address.lga.trim() &&
    address.city.trim() &&
    file
  );

  const pickUtilityBill = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: UTILITY_BILL_TYPES, copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    const extension = asset.name.split('.').pop()?.toLowerCase() || '';
    if (!UTILITY_BILL_EXTENSIONS.includes(extension)) {
      setFileError('Upload a JPG, PNG or PDF file.');
      return;
    }
    if (asset.size && asset.size > UTILITY_BILL_MAX_BYTES) {
      setFileError('The utility bill must be 5MB or smaller.');
      return;
    }
    setFileError(null);
    setFile({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || (extension === 'pdf' ? 'application/pdf' : `image/${extension === 'jpg' ? 'jpeg' : extension}`),
    });
  };

  const handleProceed = async () => {
    if (!isFormValid) return;
    try {
      if (showForm && file) {
        await submitAddress(file);
        setUseNewAddress(false);
      }
      await applyLoan();
      resetLoan();
      Toast.show('Loan Application Submitted!', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      router.replace('/(tabs)');
    } catch {
      // The store holds the error, which is shown below.
    }
  };

  const fieldError = (name: string) =>
    fieldErrors[name] ? <ThemedText style={styles.errorText}>{fieldErrors[name]}</ThemedText> : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>


          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <ThemedText type="title" style={styles.title}>Enter Address</ThemedText>
            </View>
            <CircularProgress
              currentStep={2}
              totalSteps={2}
              progress={2 / 2}
              size={60}
            />
          </View>

          {!showForm && currentAddress && (
            <View style={styles.form}>
              <View style={styles.dropdownContainer}>
                <ThemedText style={styles.fieldLabel}>
                  Address on file · {currentAddress.status === 'verified' ? 'Verified' : 'Pending review'}
                </ThemedText>
                <View style={styles.dropdownTrigger}>
                  <ThemedText style={styles.dropdownValue}>{addressLine(currentAddress)}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.linkText} onPress={() => setUseNewAddress(true)}>
                I've moved — use a different address
              </ThemedText>
            </View>
          )}

          {showForm && (
          <View style={styles.form}>
            {!useNewAddress && resubmitReason(currentAddress) && (
              <ThemedText style={styles.errorText}>{resubmitReason(currentAddress)}</ThemedText>
            )}

            <FloatingLabelInput
              label="What is your house number?"
              placeholder="#"
              value={address.houseNumber}
              onChangeText={(val) => setAddressField('houseNumber', val)}
            />
            {fieldError('house_number')}

            <FloatingLabelInput
              label="What is your house address?"
              placeholder="Enter your address"
              value={address.houseAddress}
              onChangeText={(val) => setAddressField('houseAddress', val)}
            />
            {fieldError('street')}

            <FloatingLabelInput
              label="What is your closest landmark?"
              placeholder="Enter your address"
              value={address.landmark}
              onChangeText={(val) => setAddressField('landmark', val)}
            />
            {fieldError('closest_landmark')}

            <View style={styles.dropdownContainer}>
              <ThemedText style={styles.fieldLabel}>What state do you live in?</ThemedText>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => bottomSheetRef.current?.expand()}
              >
                <ThemedText style={[styles.dropdownValue, !address.state && { color: '#AAA' }]}>
                  {address.state || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            {fieldError('state')}

            <FloatingLabelInput
              label="What is your LGA?"
              placeholder="e.g. Ikeja"
              value={address.lga}
              onChangeText={(val) => setAddressField('lga', val)}
            />
            {fieldError('lga')}

            <FloatingLabelInput
              label="What city do you reside in?"
              placeholder="e.g. Lagos"
              value={address.city}
              onChangeText={(val) => setAddressField('city', val)}
            />
            {fieldError('city')}

            <View style={styles.dropdownContainer}>
              <ThemedText style={styles.fieldLabel}>Upload a recent utility bill (JPG, PNG or PDF, max 5MB)</ThemedText>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={pickUtilityBill}>
                <ThemedText style={[styles.dropdownValue, !file && { color: '#AAA' }]} numberOfLines={1}>
                  {file?.name || 'Choose file'}
                </ThemedText>
                <Ionicons name="cloud-upload-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            {fileError ? <ThemedText style={styles.errorText}>{fileError}</ThemedText> : fieldError('utility_bill')}
          </View>
          )}

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
              isLoading={isLoading}
              disabled={!isFormValid || isLoading}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={isFormValid ? "#FF7A00" : "#FAFAFA"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: isFormValid ? "#FFF" : "#AAA" }]}>Proceed</ThemedText>
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['50%']}
        enableBackdrop={true}
        backdropOpacity={0.7}
      >
        <ScrollView style={styles.optionsList}>
          <ThemedText style={styles.optionsHeader}>Select option</ThemedText>
          {NIGERIAN_STATES.map((state) => (
            <TouchableOpacity
              key={state}
              style={styles.optionItem}
              onPress={() => {
                setAddressField('state', state);
                bottomSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{state}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  linkText: {
    color: '#FF7A00',
    fontWeight: '600',
    marginTop: 8,
  },
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
  },
  titleContainer: {
    flex: 1,
    marginRight: 20,
    gap: 10
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  form: {
    marginTop: 20,
    gap: 16,
  },
  dropdownContainer: {
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginLeft: 4,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    ...Shadows.input,
  },
  dropdownValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionsList: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  optionsHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  optionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
});
