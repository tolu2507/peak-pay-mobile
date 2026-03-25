import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { useKYCStore } from '@/store/useKYCStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PEP_OPTIONS = ["Yes, I am a PEP", "No, I am not a PEP", "Immediate family member is a PEP"];

export default function PepDetailsScreen() {
  const router = useRouter();
  const { pep, setPepField, nextStep } = useKYCStore();
  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  const handleProceed = () => {
    if (pep.isPep) {
      nextStep();
      Toast.show('PEP details saved', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      router.push('/kyc/bank-details');
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
                PEP details
              </ThemedText>
            </View>
            <CircularProgress
              currentStep={5}
              totalSteps={7}
              progress={5 / 7}
              size={60}
            />
          </View>

          <ScrollView
            style={styles.formContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <ThemedText style={styles.subtitle}>Are you a PEP?</ThemedText>
              <ThemedText style={styles.description}>
                A PEP (politically exposed person) is someone with an important government role, like a politician or someone in close contact with people in important government roles.
              </ThemedText>

              <View style={styles.dropdownContainer}>
                <ThemedText style={styles.fieldLabel}>Are you or any of your immediate family...?</ThemedText>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => bottomSheetRef.current?.expand()}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.dropdownValue, !pep.isPep && { color: '#AAA' }]}>
                    {pep.isPep || 'Select an option'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
              disabled={!pep.isPep}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={pep.isPep ? "#FF7A00" : "#F3F3F3"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: pep.isPep ? "#FFF" : "#AAA" }]}>Proceed</ThemedText>
            </Button>
          </View>
      </SafeAreaView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['40%', '40%']}
        enableBackdrop={true}
        backdropOpacity={0.7}
        backgroundColor="#FFF"
        borderRadius={32}
      >
        <ScrollView style={styles.optionsList}>
          <ThemedText style={styles.optionsHeader}>Select option</ThemedText>
          {PEP_OPTIONS.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.optionItem}
              onPress={() => {
                setPepField('isPep', opt);
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
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
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
});
