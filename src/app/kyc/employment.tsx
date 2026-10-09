import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { routeAfterKycStep } from '@/constants/kyc-routes';
import { NIGERIAN_STATES } from '@/constants/nigeria';
import { Button } from '@/shared/ui/base/button';
import { OtpInput } from '@/shared/ui/base/otp-input';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import type { EmploymentStatus } from '@/api/services/kyc.service';
import {
  employmentFields,
  isEmploymentFormComplete,
  needsWorkEmailVerification,
  useKYCStore,
  type EmploymentForm,
} from '@/store/useKYCStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Option = { value: string; label: string };

// Same options as the web; values are what the backend accepts.
const OPTIONS: Record<'employmentStatus' | 'sector' | 'industry' | 'payday' | 'state', Option[]> = {
  employmentStatus: [
    { value: 'employed', label: 'Employed' },
    { value: 'self_employed', label: 'Self-Employed' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'student', label: 'Student' },
    { value: 'retired', label: 'Retired' },
  ],
  sector: [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
    { value: 'non_profit', label: 'Non-Profit' },
  ],
  industry: [
    'Agriculture', 'Construction & Real Estate', 'Education', 'Finance & Banking',
    'Government', 'Healthcare', 'Hospitality', 'Legal & Professional Services',
    'Manufacturing', 'Media & Entertainment', 'Oil & Gas', 'Retail & Trade',
    'Technology', 'Telecommunications', 'Transport & Logistics', 'Other',
  ].map((name) => ({ value: name, label: name })),
  payday: Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
  state: NIGERIAN_STATES.map((name) => ({ value: name, label: name })),
};

type DropdownKey = keyof typeof OPTIONS;

// Question for each field; some depend on the employment status (as on web).
const employmentLabel = (field: keyof EmploymentForm, status: EmploymentStatus | ''): string => {
  const byStatus: Partial<Record<keyof EmploymentForm, Partial<Record<EmploymentStatus, string>>>> = {
    employerName: {
      employed: 'Where do you work?',
      self_employed: 'What is your business name?',
      student: 'Which school do you attend?',
      retired: 'Who pays your pension?',
    },
    industry: {
      employed: 'What industry do you work in?',
      self_employed: 'What industry is your business in?',
    },
    monthlyIncome: {
      employed: 'How much do you earn monthly?',
      self_employed: 'What is your average monthly income?',
      unemployed: 'How much do you receive monthly?',
      student: 'How much do you receive monthly?',
      retired: 'How much is your monthly pension?',
    },
    payday: {
      employed: 'What day of the month do you get paid?',
      retired: 'What day of the month is your pension paid?',
    },
    state: { employed: 'What state is your company located in?', self_employed: 'What state is your business in?' },
    city: { employed: 'Work city', self_employed: 'Business city (optional)' },
    address: {
      employed: 'What is your company address?',
      self_employed: 'What is your business address?',
    },
  };
  const fixed: Partial<Record<keyof EmploymentForm, string>> = {
    jobTitle: 'What is your job title?',
    sector: 'What sector do you work in?',
    sourceOfIncome: 'What is your main source of income?',
    workEmail: 'What is your work email?',
  };
  return (status && byStatus[field]?.[status]) || fixed[field] || '';
};

const WORK_EMAIL_RESEND_SECONDS = 60;

export default function EmploymentScreen() {
  const router = useRouter();
  const {
    employment,
    currentEmployment,
    isEmploymentLoaded,
    setEmploymentField,
    loadEmployment,
    saveEmployment,
    sendWorkEmailOtp,
    verifyWorkEmailOtp,
    isLoading,
  } = useKYCStore();
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otpKey, setOtpKey] = useState(0);

  const bottomSheetRef = useRef<BottomSheetMethods>(null);
  const otpSheetRef = useRef<BottomSheetMethods>(null);
  const maskEmail = (email: string) => {
    if (!email) return 'ad********com';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const maskedName = name.length > 2 ? name.substring(0, 2) + '*'.repeat(name.length - 2) : name;
    return `${maskedName}@${domain}`;
  };

  // Pre-fill the saved version; saving again creates a new version.
  useEffect(() => {
    if (!isEmploymentLoaded) void loadEmployment();
  }, [isEmploymentLoaded, loadEmployment]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const status = employment.employmentStatus;
  const fields = new Set(employmentFields(status));
  const label = (field: keyof EmploymentForm) => employmentLabel(field, status);
  const set = (field: keyof EmploymentForm) => (value: string) => setEmploymentField(field, value);
  const isFormValid = isEmploymentFormComplete(employment);
  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const showError = (fallback: string) =>
    Toast.show(useKYCStore.getState().error || fallback, { type: 'error', position: "top", backgroundColor: "#FF3B30" });

  const finish = async () => {
    await saveEmployment();
    Toast.show('Employment details saved', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
    router.push(routeAfterKycStep('employment') as any);
  };

  const handleProceed = async () => {
    try {
      // Employed users verify their work email first, unless the saved
      // version already holds this same verified email.
      if (needsWorkEmailVerification(employment, currentEmployment)) {
        await sendWorkEmailOtp();
        setTimer(WORK_EMAIL_RESEND_SECONDS);
        setOtpKey((key) => key + 1);
        otpSheetRef.current?.expand();
        Toast.show('OTP sent to your work email', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
        return;
      }
      await finish();
    } catch (error) {
      showError('Failed to save employment details');
    }
  };

  const handleOtpComplete = async (code: string) => {
    setIsVerifying(true);
    try {
      await verifyWorkEmailOtp(code);
      otpSheetRef.current?.close();
      await finish();
    } catch (error) {
      showError('Verification failed');
      setOtpKey((key) => key + 1);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      await sendWorkEmailOtp();
      setTimer(WORK_EMAIL_RESEND_SECONDS);
      setOtpKey((key) => key + 1);
    } catch {
      showError('Could not send the verification code');
    }
  };

  const openDropdown = (key: DropdownKey) => {
    setActiveDropdown(key);
    bottomSheetRef.current?.expand();
  };

  const renderDropdown = (labelText: string, value: string, key: DropdownKey) => (
    <View style={styles.dropdownContainer}>
      <ThemedText style={styles.fieldLabel}>{labelText}</ThemedText>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => openDropdown(key)}
        activeOpacity={0.7}
      >
        <ThemedText style={[styles.dropdownValue, !value && { color: '#AAA' }]}>
          {OPTIONS[key].find((o) => o.value === value)?.label || value || 'Select an option'}
        </ThemedText>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderInput = (field: keyof EmploymentForm, placeholder: string, extra?: Partial<React.ComponentProps<typeof FloatingLabelInput>>) => (
    <FloatingLabelInput
      label={label(field)}
      placeholder={placeholder}
      value={employment[field]}
      onChangeText={set(field)}
      {...extra}
    />
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
                Employment details
              </ThemedText>
            </View>
            <CircularProgress
              currentStep={4}
              totalSteps={7}
              progress={4 / 7}
              size={60}
            />
          </View>

          <ScrollView
            style={styles.formContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {!isEmploymentLoaded ? (
              <ActivityIndicator size="large" color="#FF7A00" style={{ marginTop: 40 }} />
            ) : (
            <View style={styles.form}>
              {renderDropdown("What is your employment status?", status, "employmentStatus")}

              {fields.has('employerName') && renderInput('employerName', 'Enter name')}
              {fields.has('jobTitle') && renderInput('jobTitle', 'e.g. Accountant')}
              {fields.has('sector') && renderDropdown(label('sector'), employment.sector, 'sector')}
              {fields.has('industry') && renderDropdown(label('industry'), employment.industry, 'industry')}
              {fields.has('sourceOfIncome') && renderInput('sourceOfIncome', 'e.g. Family support, allowance')}
              {fields.has('monthlyIncome') && renderInput('monthlyIncome', '₦ e.g. 200,000', {
                keyboardType: 'numeric',
                onChangeText: (val: string) => setEmploymentField('monthlyIncome', val.replace(/[^\d.,]/g, '')),
              })}
              {fields.has('payday') && renderDropdown(label('payday'), employment.payday, 'payday')}
              {fields.has('state') && renderDropdown(label('state'), employment.state, 'state')}
              {fields.has('city') && renderInput('city', 'Enter city')}
              {fields.has('address') && renderInput('address', 'Enter address')}
              {fields.has('workEmail') && renderInput('workEmail', 'name@company.com', {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
              })}
            </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
              disabled={!isFormValid || isLoading}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={isFormValid && !isLoading ? "#FF7A00" : "#F3F3F3"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: isFormValid && !isLoading ? "#FFF" : "#AAA" }]}>
                {isLoading ? 'Please wait...' : 'Proceed'}
              </ThemedText>
            </Button>
          </View>
      </SafeAreaView>

      {/* Options Dropdown */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['60%', '60%']}
        enableBackdrop={true}
        backdropOpacity={0.7}
        backgroundColor="#FFF"
        borderRadius={32}
      >
        <ScrollView style={styles.optionsList}>
          <ThemedText style={styles.optionsHeader}>Select option</ThemedText>
          {activeDropdown && OPTIONS[activeDropdown].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.optionItem}
              onPress={() => {
                setEmploymentField(activeDropdown, opt.value);
                bottomSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{opt.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>

      {/* OTP MODAL */}
      <BottomSheet
        ref={otpSheetRef}
        snapPoints={['40%']}
        enableBackdrop={true}
        backdropOpacity={0.7}
        backgroundColor="#FFF"
        borderRadius={32}
      >
        <View style={styles.otpContent}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={48} color="#007AFF" />
          </View>
          <ThemedText style={styles.otpTitle}>Verify your work email address</ThemedText>
          <ThemedText style={styles.otpSubtitle}>
            We have just sent a 6-digit code to your email address <ThemedText style={styles.emailText}>{maskEmail(employment.workEmail)}</ThemedText>. Enter it here.
          </ThemedText>

          <View style={styles.otpContainer}>
            <OtpInput
              key={otpKey}
              onInputFinished={handleOtpComplete}
              otpCount={6}
              inputWidth={(SCREEN_WIDTH - 80) / 6}
              inputHeight={55}
              inputBorderRadius={16}
              unfocusedBackgroundColor="#FFF"
              focusedBackgroundColor="#FFF"
              unfocusedBorderColor="#E0E0E0"
              focusedBorderColor="#FF7A00"
              textStyle={{ color: '#000', fontSize: 24 }}
            />

            {isVerifying ? (
              <ActivityIndicator color="#FF7A00" style={{ marginTop: 12 }} />
            ) : timer > 0 ? (
              <ThemedText style={styles.resendText}>Resend code in <ThemedText style={styles.timerText}>{formatTimer(timer)}</ThemedText></ThemedText>
            ) : (
              <ThemedText style={styles.resendText} onPress={handleResend}>Didn't get a code? <ThemedText style={styles.timerText}>Resend OTP</ThemedText></ThemedText>
            )}
          </View>
        </View>
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
  radioGroup: {
    marginTop: 12,
  },
  radioTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  radioOptions: {
    flexDirection: 'row',
    gap: 24,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
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
  otpContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  infoIcon: {
    marginBottom: 20,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  otpSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32, fontWeight: '400',
  },
  emailText: {
    color: '#000',
    fontWeight: '500',
    // textDecorationLine: 'underline',
  },
  otpContainer: {
    // marginBottom: 32,
    width: '100%',
    alignItems: 'center',
    position: "relative"
  },
  resendText: {
    fontSize: 12,
    color: '#666', fontWeight: '400', textAlign: "left",
    position: "absolute",
    bottom: 30,
    left: -20,
  },
  timerText: {
    fontWeight: '400',
    color: '#000', fontSize: 12,
  },
});
