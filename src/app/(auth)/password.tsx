import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { useSignupStore } from '@/store/useSignupStore';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const REQUIREMENT_CHECKS = [
  { id: 'length', text: 'Must contain at least 8 characters', regex: /.{8,}/ },
  { id: 'upper', text: 'Must contain an upper case letter', regex: /[A-Z]/ },
  { id: 'lower', text: 'Must contain a lower case letter', regex: /[a-z]/ },
  { id: 'special', text: 'Must contain a special character', regex: /[^A-Za-z0-9]/ },
  { id: 'number', text: 'Must contain a number', regex: /[0-9]/ },
];

export default function PasswordScreen() {
  const router = useRouter();
  const { form, setFormField } = useSignupStore();
  const [isPassVisible, setIsPassVisible] = useState(false);
  const [isConfirmPassVisible, setIsConfirmPassVisible] = useState(false);

  const requirements = useMemo(() => {
    return REQUIREMENT_CHECKS.map(req => ({
      ...req,
      met: req.regex.test(form.password)
    }));
  }, [form.password]);

  const allMet = useMemo(() => requirements.every(r => r.met), [requirements]);
  const isMatch = useMemo(() => form.confirmPassword === form.password && form.confirmPassword !== '', [form.password, form.confirmPassword]);
  const isFormValid = allMet && isMatch;

  const handleProceed = () => {
    if (isFormValid) {
      router.push('/(auth)/security-questions');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <ThemedText type="title" style={styles.title}>
                Create password
              </ThemedText>
            </View>
            <CircularProgress
              currentStep={3}
              totalSteps={4}
              progress={0.75}
              size={60}
            />
          </View>

          <ThemedText style={styles.description}>
            Create a strong password.
          </ThemedText>

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
                    size={24} 
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
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '700',
    color: '#000',
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontWeight: '400',
    maxWidth: '80%',
  },
  form: {
    marginTop: 20,
    gap: 14,
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
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 8,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
