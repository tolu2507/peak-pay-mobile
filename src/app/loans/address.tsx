import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { useLoanStore } from '@/store/useLoanStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OPTIONS = {
  state: ["Lagos", "Abuja", "Oyo", "Kano", "Rivers"],
  lga: ["Ikeja", "Alimosho", "Eti-Osa", "Oshodi", "Surulere"],
  city: ["Ikeja", "Lekki", "Victoria Island", "Ajah", "Yaba"],
  maritalStatus: ["Single", "Married", "Divorced", "Widowed"]
};

export default function AddressLoanScreen() {
  const router = useRouter();
  const { address, setAddressField, loanDetails, setApplied } = useLoanStore(); // Updated destructuring
  const [activeDropdown, setActiveDropdown] = useState<keyof typeof OPTIONS | null>(null);
  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  const isFormValid = address.houseNumber && address.houseAddress &&
    address.state && address.lga && address.city &&
    address.maritalStatus;

  const handleProceed = () => {
    if (isFormValid) {
      setApplied(loanDetails.amount);
      Toast.show('Loan Application Submitted!', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      router.replace('/(tabs)');
    }
  };

  const openDropdown = (key: keyof typeof OPTIONS) => {
    setActiveDropdown(key);
    bottomSheetRef.current?.expand();
  };

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

          <View style={styles.form}>
            <FloatingLabelInput
              label="What is your house number?"
              placeholder="#"
              value={address.houseNumber}
              onChangeText={(val) => setAddressField('houseNumber', val)}
            />

            <FloatingLabelInput
              label="What is your house address?"
              placeholder="Enter your address"
              value={address.houseAddress}
              onChangeText={(val) => setAddressField('houseAddress', val)}
            />

            <FloatingLabelInput
              label="What is your closest landmark?"
              placeholder="Enter your address"
              value={address.landmark}
              onChangeText={(val) => setAddressField('landmark', val)}
            />

            <View style={styles.dropdownContainer}>
              <ThemedText style={styles.fieldLabel}>What state do you live in?</ThemedText>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openDropdown('state')}
              >
                <ThemedText style={[styles.dropdownValue, !address.state && { color: '#AAA' }]}>
                  {address.state || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.dropdownContainer}>
              <ThemedText style={styles.fieldLabel}>What is your LGA?</ThemedText>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openDropdown('lga')}
              >
                <ThemedText style={[styles.dropdownValue, !address.lga && { color: '#AAA' }]}>
                  {address.lga || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.dropdownContainer}>
              <ThemedText style={styles.fieldLabel}>What city do you reside in?</ThemedText>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openDropdown('city')}
              >
                <ThemedText style={[styles.dropdownValue, !address.city && { color: '#AAA' }]}>
                  {address.city || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.dropdownContainer}>
              <ThemedText style={styles.fieldLabel}>What is your marital status?</ThemedText>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openDropdown('maritalStatus')}
              >
                <ThemedText style={[styles.dropdownValue, !address.maritalStatus && { color: '#AAA' }]}>
                  {address.maritalStatus || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
              disabled={!isFormValid}
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
          {activeDropdown && OPTIONS[activeDropdown].map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.optionItem}
              onPress={() => {
                setAddressField(activeDropdown as any, opt);
                bottomSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{opt}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
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
