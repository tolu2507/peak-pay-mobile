import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/shared/ui/base/button';
import { OtpInput } from '@/shared/ui/base/otp-input';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import { Toast } from '@/shared/ui/molecules/Toast';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { useKYCStore } from '@/store/useKYCStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OPTIONS = {
  status: ["Salary Earner", "Self Employed", "Unemployed", "Student"],
  sector: ["Technology", "Healthcare", "Finance", "Education", "Other"],
  industry: ["Software", "Banking", "Retail", "Manufacturing", "Other"],
  state: ["Lagos", "Abuja", "Oyo", "Kano", "Rivers", "Other"]
};

export default function EmploymentScreen() {
  const router = useRouter();
  const { employment, setEmploymentField, nextStep } = useKYCStore();
  const [activeDropdown, setActiveDropdown] = useState<keyof typeof OPTIONS | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');

  const bottomSheetRef = useRef<BottomSheetMethods>(null);
  const otpSheetRef = useRef<BottomSheetMethods>(null);
  const maskEmail = (email: string) => {
    if (!email) return 'ad********com';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const maskedName = name.length > 2 ? name.substring(0, 2) + '*'.repeat(name.length - 2) : name;
    return `${maskedName}@${domain}`;
  };

  const isSalaryEarner = employment.status === "Salary Earner";
  const isSelfEmployed = employment.status === "Self Employed";

  const isFormValid = () => {
    if (isSalaryEarner) {
      return employment.workPlace && employment.sector && employment.industry &&
        employment.monthlyIncome && employment.payDay && employment.state && employment.workEmail;
    }
    if (isSelfEmployed) {
      return employment.sourceOfIncome && employment.monthlyIncome && employment.paidByCompany !== null;
    }
    return false;
  };

  const handleProceed = () => {
    if (isSalaryEarner) {
      otpSheetRef.current?.expand();
    } else {
      nextStep();
      Toast.show('Employment details saved', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      router.push('/kyc/pep-details');
    }
  };

  const handleOtpComplete = (code: string) => {
    setOtp(code);
    setTimeout(() => {
      otpSheetRef.current?.close();
      Toast.show('Employment verified!', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      nextStep();
      router.push('/kyc/pep-details');
    }, 1000);
  };

  const openDropdown = (key: keyof typeof OPTIONS) => {
    setActiveDropdown(key);
    bottomSheetRef.current?.expand();
  };

  const renderDropdown = (label: string, value: string, key: keyof typeof OPTIONS) => (
    <View style={styles.dropdownContainer}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => openDropdown(key)}
        activeOpacity={0.7}
      >
        <ThemedText style={[styles.dropdownValue, !value && { color: '#AAA' }]}>
          {value || 'Select an option'}
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
            <View style={styles.form}>
              {renderDropdown("What is your employment status?", employment.status, "status")}

              {isSalaryEarner && (
                <>
                  <FloatingLabelInput
                    label="Where do you work?"
                    placeholder="Enter answer"
                    value={employment.workPlace}
                    onChangeText={(val) => setEmploymentField('workPlace', val)}
                  />
                  {renderDropdown("What sector do you work in?", employment.sector, "sector")}
                  {renderDropdown("Which industry do you work in?", employment.industry, "industry")}
                  <FloatingLabelInput
                    label="How much do you earn monthly?"
                    placeholder="₦Enter answer"
                    keyboardType="numeric"
                    value={employment.monthlyIncome}
                    onChangeText={(val) => setEmploymentField('monthlyIncome', val)}
                  />
                  <FloatingLabelInput
                    label="What date do you get paid every month?"
                    placeholder="Enter answer"
                    keyboardType="numeric"
                    maxLength={2}
                    value={employment.payDay}
                    onChangeText={(val) => setEmploymentField('payDay', val)}
                  />
                  {renderDropdown("What state is your company located in?", employment.state, "state")}
                  <FloatingLabelInput
                    label="What is your work email?"
                    placeholder="Enter answer"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={employment.workEmail}
                    onChangeText={(val) => setEmploymentField('workEmail', val)}
                  />
                </>
              )}

              {isSelfEmployed && (
                <>
                  <FloatingLabelInput
                    label="What is your source of income?"
                    placeholder="Business"
                    value={employment.sourceOfIncome}
                    onChangeText={(val) => setEmploymentField('sourceOfIncome', val)}
                  />
                  <FloatingLabelInput
                    label="How much do you earn monthly?"
                    placeholder="₦2,000,000"
                    keyboardType="numeric"
                    value={employment.monthlyIncome}
                    onChangeText={(val) => setEmploymentField('monthlyIncome', val)}
                  />
                  <View style={styles.radioGroup}>
                    <ThemedText style={styles.radioTitle}>Do you get paid by your company?</ThemedText>
                    <View style={styles.radioOptions}>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setEmploymentField('paidByCompany', true)}
                      >
                        <Ionicons name={employment.paidByCompany === true ? "radio-button-on" : "radio-button-off"} size={24} color="#FF7A00" />
                        <ThemedText style={styles.radioText}>Yes</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setEmploymentField('paidByCompany', false)}
                      >
                        <Ionicons name={employment.paidByCompany === false ? "radio-button-on" : "radio-button-off"} size={24} color="#FF7A00" />
                        <ThemedText style={styles.radioText}>No</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              onPress={handleProceed}
              disabled={!isFormValid()}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor={isFormValid() ? "#FF7A00" : "#F3F3F3"}
              borderRadius={16}
            >
              <ThemedText style={[styles.buttonText, { color: isFormValid() ? "#FFF" : "#AAA" }]}>Proceed</ThemedText>
            </Button>
          </View>
      </SafeAreaView>

      {/* Options Dropdown */}
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
          {activeDropdown && OPTIONS[activeDropdown].map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.optionItem}
              onPress={() => {
                setEmploymentField(activeDropdown as any, opt);
                bottomSheetRef.current?.close();
              }}
            >
              <ThemedText style={styles.optionText}>{opt}</ThemedText>
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
              onInputFinished={handleOtpComplete}
              otpCount={6}
              onInputChange={(code) => setOtp(code)}
              inputWidth={(SCREEN_WIDTH - 80) / 6}
              inputHeight={55}
              inputBorderRadius={16}
              unfocusedBackgroundColor="#FFF"
              focusedBackgroundColor="#FFF"
              unfocusedBorderColor="#E0E0E0"
              focusedBorderColor="#FF7A00"
              textStyle={{ color: '#000', fontSize: 24 }}
            />

            <ThemedText style={styles.resendText}>Resend code in <ThemedText style={styles.timerText}>01:56</ThemedText></ThemedText>
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
