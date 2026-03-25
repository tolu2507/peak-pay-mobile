import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { Checkbox } from '@/shared/ui/organisms/check-box';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { useSignupStore } from '@/store/useSignupStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SignupScreen() {
  const router = useRouter();
  const {
    form,
    agreedTerms,
    agreedPrivacy,
    setFormField,
    setAgreedTerms,
    setAgreedPrivacy
  } = useSignupStore();

  const isFormValid = useMemo(() => {
    return (
      form.firstName.trim() !== '' &&
      form.lastName.trim() !== '' &&
      form.phone.trim() !== '' &&
      form.email.trim() !== '' &&
      agreedTerms &&
      agreedPrivacy
    );
  }, [form, agreedTerms, agreedPrivacy]);

  const handleProceed = () => {
    if (isFormValid) {
      router.push('/(auth)/verify');
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
              currentStep={1}
              totalSteps={4}
              progress={0.25}
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
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreedTerms(!agreedTerms)}
              activeOpacity={0.7}
            >
              <Checkbox showBorder={true} checked={agreedTerms} size={30} checkmarkColor="#FF7A00" />
              <ThemedText style={styles.checkboxText}>
                I have read and agree to Peakpay’s <ThemedText style={styles.linkText}>Terms and Conditions</ThemedText>
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreedPrivacy(!agreedPrivacy)}
              activeOpacity={0.7}
            >
              <Checkbox showBorder={true} checked={agreedPrivacy} size={30} checkmarkColor="#FF7A00" />
              <ThemedText style={styles.checkboxText}>
                I consent to Peakpay’s <ThemedText style={styles.linkText}>Privacy Policy</ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
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
    lineHeight: 24, fontWeight: '400', maxWidth: '80%'
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
});
