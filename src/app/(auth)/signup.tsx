import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { Checkbox } from '@/shared/ui/organisms/check-box';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { useLoginStore } from '@/store/useLoginStore';
import { useSignupStore } from '@/store/useSignupStore';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { Ionicons } from '@expo/vector-icons';
import { Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Same choices as the web signup.
const HEAR_ABOUT_OPTIONS = ['Friend', 'Social Media', 'Google', 'Other'];

const REQUIREMENT_CHECKS = [
  { id: 'length', text: 'Must contain at least 8 characters', regex: /.{8,}/ },
  { id: 'upper', text: 'Must contain an upper case letter', regex: /[A-Z]/ },
  { id: 'lower', text: 'Must contain a lower case letter', regex: /[a-z]/ },
  { id: 'special', text: 'Must contain a special character', regex: /[^A-Za-z0-9]/ },
  { id: 'number', text: 'Must contain a number', regex: /[0-9]/ },
];

export default function SignupScreen() {
  const router = useRouter();
  const {
    form,
    agreedTerms,
    agreedPrivacy,
    isLoading,
    setFormField,
    setAgreedTerms,
    setAgreedPrivacy,
    register,
  } = useSignupStore();

  const [isPassVisible, setIsPassVisible] = useState(false);
  const [isConfirmPassVisible, setIsConfirmPassVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const bottomSheetRef = useRef<BottomSheetMethods>(null);
  const hearSheetRef = useRef<BottomSheetMethods>(null);

  // Invite links open as peakpay://signup?ref=CODE.
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  useEffect(() => {
    if (typeof ref === 'string' && ref.trim()) setFormField('referralCode', ref.trim());
  }, [ref, setFormField]);

  const isDetailsValid = useMemo(() => {
    return (
      form.firstName.trim() !== '' &&
      form.lastName.trim() !== '' &&
      form.phone.trim() !== '' &&
      form.email.trim() !== '' &&
      form.howDidYouHear !== '' &&
      agreedTerms &&
      agreedPrivacy
    );
  }, [form.firstName, form.lastName, form.phone, form.email, form.howDidYouHear, agreedTerms, agreedPrivacy]);

  const requirements = useMemo(() => {
    return REQUIREMENT_CHECKS.map(req => ({
      ...req,
      met: req.regex.test(form.password)
    }));
  }, [form.password]);

  const allMet = useMemo(() => requirements.every(r => r.met), [requirements]);
  const isMatch = useMemo(() => form.confirmPassword === form.password && form.confirmPassword !== '', [form.password, form.confirmPassword]);
  const isPasswordValid = allMet && isMatch;

  const handleOpenPasswordModal = () => {
    if (isDetailsValid) {
      setCurrentStep(2);
      bottomSheetRef.current?.expand();
    }
  };

  const handleCreateAccount = async () => {
    if (isDetailsValid && isPasswordValid) {
      try {
        const res = await register();
        bottomSheetRef.current?.close();
        if (res?.alreadyVerified) {
          // An account with this email exists and is verified: log in instead.
          const login = useLoginStore.getState();
          login.setEmail(form.email);
          login.setNotice('An account with this email already exists. Please log in.');
          router.replace('/(auth)/login');
          return;
        }
        // New and existing-unverified users both get an email OTP.
        Toast.show('OTP sent to your email', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
        router.push('/(auth)/verify');
      } catch (error: any) {
        // The API client already shows the server's message.
        console.log(error);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <ThemedText type="title" style={styles.title}>
                Create an account to access simple financial solutions
              </ThemedText>
            </View>
            <CircularProgress
              currentStep={currentStep}
              totalSteps={2}
              progress={currentStep === 1 ? 0.5 : 1.0}
              size={60}
            />
          </View>

          <ThemedText style={styles.description}>
            Create an account to access simple financial solutions. Please ensure the details entered are accurate.
          </ThemedText>

          <View style={styles.form}>
            <FloatingLabelInput
              label="First Name"
              placeholder="e.g John"
              value={form.firstName}
              onChangeText={(text) => setFormField('firstName', text)}
              icon="person-outline"
            />

            <FloatingLabelInput
              label="Middle Name (optional)"
              placeholder="e.g Tunde"
              value={form.middleName}
              onChangeText={(text) => setFormField('middleName', text)}
              icon="person-outline"
            />

            <FloatingLabelInput
              label="Last Name"
              placeholder="e.g Adesanya"
              value={form.lastName}
              onChangeText={(text) => setFormField('lastName', text)}
              icon="person-outline"
            />

            <FloatingLabelInput
              label="Phone Number"
              placeholder="e.g 0812 345 6789"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(text) => setFormField('phone', text)}
              icon="call-outline"
            />

            <FloatingLabelInput
              label="Email Address"
              placeholder="e.g sample@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(text) => setFormField('email', text)}
              icon="mail-outline"
            />

            <View>
              <ThemedText style={styles.fieldLabel}>How did you hear about us?</ThemedText>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => hearSheetRef.current?.expand()}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.dropdownValue, !form.howDidYouHear && { color: '#AAA' }]}>
                  {form.howDidYouHear || 'Select an option'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <FloatingLabelInput
              label="Referral Code (optional)"
              placeholder="e.g 123456"
              autoCapitalize="characters"
              value={form.referralCode}
              onChangeText={(text) => setFormField('referralCode', text)}
              icon="gift-outline"
            />
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreedTerms(!agreedTerms)}
              activeOpacity={0.7}
            >
              <Checkbox showBorder={true} checked={agreedTerms} size={30} checkmarkColor="#FF7A00" />
              <ThemedText style={styles.checkboxText}>
                I have read and agree to Peakpay’s <ThemedText style={styles.linkText} onPress={(e) => { e.stopPropagation(); router.push('/legal?url=https://www.mypeakpay.com/privacy&title=Terms%20and%20Conditions'); }}>Terms and Conditions</ThemedText>
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreedPrivacy(!agreedPrivacy)}
              activeOpacity={0.7}
            >
              <Checkbox showBorder={true} checked={agreedPrivacy} size={30} checkmarkColor="#FF7A00" />
              <ThemedText style={styles.checkboxText}>
                I consent to Peakpay’s <ThemedText style={styles.linkText} onPress={(e) => { e.stopPropagation(); router.push('/legal?url=https://www.mypeakpay.com/privacy&title=Privacy%20Policy'); }}>Privacy Policy</ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Button
              onPress={handleOpenPasswordModal}
              disabled={!isDetailsValid}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={isDetailsValid ? "#FF7A00" : "#F3F3F3"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: isDetailsValid ? "#FFF" : "#AAA" }]}>Proceed</ThemedText>
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['75%', '75%']}
        enableBackdrop={true}
        backdropOpacity={0.7}
        backgroundColor="#FFF"
        borderRadius={32}
        onClose={() => setCurrentStep(1)}
      >
        <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.bottomSheetTitle}>Create password</ThemedText>
          <ThemedText style={styles.bottomSheetDesc}>Create a strong password.</ThemedText>
          
          <View style={styles.form}>
            <FloatingLabelInput
              label="Create Password"
              placeholder="Enter a strong password"
              secureTextEntry={!isPassVisible}
              value={form.password}
              onChangeText={(text) => setFormField('password', text)}
              icon="lock-closed-outline"
              rightIcon={isPassVisible ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setIsPassVisible(!isPassVisible)}
            />

            <View style={styles.requirements}>
              {requirements.map((req) => (
                <View key={req.id} style={styles.requirementRow}>
                  <Ionicons 
                    name={req.met ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={req.met ? "#1E9F85" : "#FF3B30"} 
                  />
                  <ThemedText style={[styles.requirementText, { color: req.met ? '#333' : '#666' }]}>
                    {req.text}
                  </ThemedText>
                </View>
              ))}
            </View>

            <FloatingLabelInput
              label="Confirm Password"
              placeholder="Re-enter password"
              secureTextEntry={!isConfirmPassVisible}
              value={form.confirmPassword}
              onChangeText={(text) => setFormField('confirmPassword', text)}
              icon="lock-closed-outline"
              rightIcon={isConfirmPassVisible ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setIsConfirmPassVisible(!isConfirmPassVisible)}
            />
          </View>

          <View style={styles.bottomSheetFooter}>
            <Button
              onPress={handleCreateAccount}
              isLoading={isLoading}
              disabled={!isPasswordValid || isLoading}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={isPasswordValid ? "#FF7A00" : "#F3F3F3"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: isPasswordValid ? "#FFF" : "#AAA" }]}>Create Account</ThemedText>
            </Button>
          </View>
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        ref={hearSheetRef}
        snapPoints={['40%', '40%']}
        enableBackdrop={true}
        backdropOpacity={0.7}
        backgroundColor="#FFF"
        borderRadius={32}
      >
        <ScrollView style={styles.bottomSheetScroll}>
          <ThemedText style={styles.bottomSheetTitle}>How did you hear about us?</ThemedText>
          {HEAR_ABOUT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.optionItem}
              onPress={() => {
                setFormField('howDidYouHear', option);
                hearSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{option}</ThemedText>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  titleContainer: {
    flex: 1,
    marginRight: 20,
    marginBottom: 10
  },
  title: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '700',
    color: '#000',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24, 
    fontWeight: '400', 
    maxWidth: '80%'
  },
  form: {
    marginTop: 20,
    gap: 14
  },
  checkboxContainer: {
    marginTop: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  linkText: {
    color: '#FF7A00',
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomSheetScroll: {
    padding: 24,
  },
  bottomSheetTitle: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    color: '#000',
  },
  bottomSheetDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  requirements: {
    marginTop: 8,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
    color: '#000',
  },
  optionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  bottomSheetFooter: {
    marginTop: 32,
    marginBottom: 40,
    alignItems: 'center',
  },
});
