import React, { useState, useRef } from 'react';
import { StyleSheet, View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { useSignupStore } from '@/store/useSignupStore';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { Ionicons } from '@expo/vector-icons';
import { Toast } from '@/shared/ui/molecules/Toast';
import { Image } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SECURITY_QUESTIONS = [
  "What was your childhood nickname?",
  "What is the name of your first pet?",
  "In what city were you born?",
  "What was your dream job as a child?",
  "What is your mother's maiden name?"
];

export default function SecurityQuestionsScreen() {
  const router = useRouter();
  const { form, setFormField, register, isLoading } = useSignupStore();
  const [showCongratulations, setShowCongratulations] = useState(false);
  
  const bottomSheetRef1 = useRef<BottomSheetMethods>(null);
  const bottomSheetRef2 = useRef<BottomSheetMethods>(null);

  const isFormValid = 
    form.securityQuestion1 !== '' && 
    form.securityAnswer1 !== '' && 
    form.securityQuestion2 !== '' && 
    form.securityAnswer2 !== '';

  const handleProceed = async () => {
    if (isFormValid) {
      try {
        await register();
        setShowCongratulations(true);
        
        // After 3 seconds, redirect to login
        setTimeout(() => {
          setShowCongratulations(false);
          router.replace('/(auth)/login');
        }, 3000);
      } catch (error) {
        // Error handled by store/apiClient
      }
    }
  };

  const renderDropdownTrigger = (label: string, value: string, onSelect: (val: string) => void, ref: React.RefObject<BottomSheetMethods | null>) => (
    <View style={styles.dropdownContainer}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TouchableOpacity 
        style={styles.dropdownTrigger} 
        onPress={() => ref.current?.expand()}
        activeOpacity={0.7}
      >
        <ThemedText style={[styles.dropdownValue, !value && { color: '#AAA' }]}>
          {value || 'Select an option'}
        </ThemedText>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderBottomSheet = (ref: React.RefObject<BottomSheetMethods | null>, onSelect: (val: string) => void) => (
    <BottomSheet
      ref={ref}
      snapPoints={['45%', '45%']}
      enableBackdrop={true}
      backdropOpacity={0.7} // Darker backdrop as requested
      backgroundColor="#FFF"
      borderRadius={32}
    >
      <ScrollView style={styles.optionsList}>
        <ThemedText style={styles.optionsHeader}>Select a security question</ThemedText>
        {SECURITY_QUESTIONS.map((q, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={styles.optionItem}
            onPress={() => {
              onSelect(q);
              ref.current?.close();
            }}
          >
            <ThemedText style={styles.optionText}>{q}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </BottomSheet>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <ThemedText type="title" style={styles.title}>
                Set security questions
              </ThemedText>
            </View>
            <CircularProgress
              currentStep={4}
              totalSteps={4}
              progress={1.0}
              size={60}
            />
          </View>

          <ThemedText style={styles.description}>
            To keep your account safe, please set up security questions.
          </ThemedText>

          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={24} color="#FFCC00" />
            <ThemedText style={styles.warningText}>
              Please note that your answer is case sensitive.
            </ThemedText>
          </View>

          <View style={styles.form}>
            {renderDropdownTrigger(
              "Security Question 1", 
              form.securityQuestion1, 
              (val) => setFormField('securityQuestion1', val), 
              bottomSheetRef1
            )}
            
            <FloatingLabelInput
              label="Your Answer"
              placeholder="Answer here"
              value={form.securityAnswer1}
              onChangeText={(text) => setFormField('securityAnswer1', text)}
            />

            {renderDropdownTrigger(
              "Security Question 2", 
              form.securityQuestion2, 
              (val) => setFormField('securityQuestion2', val), 
              bottomSheetRef2
            )}

            <FloatingLabelInput
              label="Your Answer"
              placeholder="Answer here"
              value={form.securityAnswer2}
              onChangeText={(text) => setFormField('securityAnswer2', text)}
            />
          </View>

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
        </ScrollView>
      </SafeAreaView>

      {/* Render BottomSheets at root level */}
      {renderBottomSheet(bottomSheetRef1, (val) => setFormField('securityQuestion1', val))}
      {renderBottomSheet(bottomSheetRef2, (val) => setFormField('securityQuestion2', val))}

      {/* Congratulations Modal */}
      {showCongratulations && (
        <View style={styles.congratsOverlay}>
          <ThemedView style={styles.congratsContent}>
            <Image 
              source={require('@/assets/images/congratulations_trophy.png')} 
              style={styles.trophyImage}
              resizeMode="contain"
            />
            <ThemedText type="title" style={styles.congratsTitle}>
              Welcome to Peakpay, {form.firstName} {form.lastName}!
            </ThemedText>
            <ThemedText style={styles.congratsSubtitle}>
              Your account has been set up successfully.
            </ThemedText>
          </ThemedView>
        </View>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
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
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    color: '#000',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 18,
    fontWeight: '400',
    maxWidth: '80%',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'rgba(255, 122, 0, 0.05)',
    borderWidth: 1,
    borderColor: '#FFCC00',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 24,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  form: {
    marginTop: 24,
    gap: 16,
  },
  dropdownContainer: {
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
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
    fontSize: 12,
    color: '#333',
    fontWeight: '400',
  },
  optionsList: {
    padding: 24,
  },
  optionsHeader: {
    fontSize: 14,
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
    fontSize: 12,
    color: '#333',
    fontWeight: '400',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  congratsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratsContent: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  trophyImage: {
    width: 200,
    height: 200,
    marginBottom: 32,
  },
  congratsTitle: {
    fontSize: 24,
    textAlign: 'center',
    color: '#000',
    marginBottom: 12,
  },
  congratsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
