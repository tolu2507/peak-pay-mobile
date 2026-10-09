import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { useKYCStore } from '@/store/useKYCStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { routeAfterKycStep } from '@/constants/kyc-routes';
import { Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Values the backend accepts (same list as the web).
const RELATIONS = [
  { value: "spouse", label: "Spouse" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "uncle", label: "Uncle" },
  { value: "aunt", label: "Aunt" },
  { value: "cousin", label: "Cousin" },
  { value: "guardian", label: "Guardian" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

const relationLabel = (value: string) =>
  RELATIONS.find((r) => r.value === value.toLowerCase())?.label ?? value;

export default function NextOfKinScreen() {
  const router = useRouter();
  const { nextOfKin, setNextOfKinField, loadNextOfKin, saveNextOfKin, isLoading } = useKYCStore();

  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  // Pre-fill a saved next of kin so it's updated rather than duplicated.
  useEffect(() => {
    void loadNextOfKin();
  }, [loadNextOfKin]);

  const isFormValid =
    nextOfKin.firstName.trim() !== '' &&
    nextOfKin.lastName.trim() !== '' &&
    nextOfKin.phone.trim() !== '' &&
    nextOfKin.relation.trim() !== '';

  const handleProceed = async () => {
    if (isFormValid) {
      try {
        await saveNextOfKin();
        Toast.show('Next of kin details saved', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
        router.push(routeAfterKycStep('nextOfKin') as any);
      } catch (error: any) {
        Toast.show(useKYCStore.getState().error || 'Failed to save next of kin details', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
      }
    }
  };

  const renderDropdown = (label: string, value: string, onSelect: (val: string) => void) => (
    <View style={styles.dropdownContainer}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => bottomSheetRef.current?.expand()}
        activeOpacity={0.7}
      >
        <ThemedText style={[styles.dropdownValue, !value && { color: '#AAA' }]}>
          {value ? relationLabel(value) : 'Select an option'}
        </ThemedText>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color="#000" />
              </TouchableOpacity>
              <ThemedText type="title" style={styles.title}>
                Next of kin details
              </ThemedText>
            </View>
            <CircularProgress
              currentStep={3}
              totalSteps={7}
              progress={3 / 7}
              size={60}
            />
          </View>

          <ScrollView
            style={styles.formContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              <FloatingLabelInput
                label="What is the first name of your next of kin?"
                placeholder="Enter answer"
                value={nextOfKin.firstName}
                onChangeText={(text) => setNextOfKinField('firstName', text)}
              />

              <FloatingLabelInput
                label="What is the last name of your next of kin?"
                placeholder="Enter answer"
                value={nextOfKin.lastName}
                onChangeText={(text) => setNextOfKinField('lastName', text)}
              />

              <FloatingLabelInput
                label="What is the phone number of your next of kin?"
                placeholder="Enter answer"
                keyboardType="phone-pad"
                value={nextOfKin.phone}
                onChangeText={(text) => setNextOfKinField('phone', text)}
              />

              {renderDropdown(
                "What is your relation with your next of kin?",
                nextOfKin.relation,
                (val) => setNextOfKinField('relation', val)
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
              isLoading={isLoading}
              disabled={!isFormValid}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={isFormValid ? "#FF7A00" : "#F3F3F3"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: isFormValid ? "#FFF" : "#AAA" }]}>Proceed</ThemedText>
            </Button>
          </View>
      </SafeAreaView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['60%', '60%']}
        enableBackdrop={true}
        backdropOpacity={0.7}
        backgroundColor="#FFF"
        borderRadius={32}
      >
        <ScrollView style={styles.optionsList}>
          <ThemedText style={styles.optionsHeader}>Select relation</ThemedText>
          {RELATIONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={styles.optionItem}
              onPress={() => {
                setNextOfKinField('relation', r.value);
                bottomSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{r.label}</ThemedText>
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
  optionsList: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
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
    fontWeight: '400',
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
