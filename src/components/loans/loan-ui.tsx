import { ThemedText } from '@/components/themed-text';
import { interFamily } from '@/constants/fonts';
import { LOAN_STEPS } from '@/constants/loan';
import { Shadows } from '@/constants/theme';
import { Button } from '@/shared/ui/base/button';
import { CircularProgress } from '@/shared/ui/molecules/circular-progress';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';

// Pieces shared by the loan screens, styled like the existing Apply for Loan
// and Enter Address screens.

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const ORANGE = '#FF7A00';
export const GREEN = '#1E9F85';

export function LoanHeader({ title, step, onBack }: { title: string; step?: number; onBack?: () => void }) {
  const router = useRouter();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')));
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={back} style={styles.backBtn} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <ThemedText type="title" style={styles.title}>{title}</ThemedText>
      </View>
      {step !== undefined && (
        <CircularProgress currentStep={step} totalSteps={LOAN_STEPS} progress={step / LOAN_STEPS} size={60} />
      )}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  isLoading = false,
  width = SCREEN_WIDTH - 48,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  width?: number;
}) {
  const enabled = !disabled && !isLoading;
  return (
    <Button
      onPress={onPress}
      isLoading={isLoading}
      disabled={!enabled}
      width={width}
      height={56}
      backgroundColor={enabled || isLoading ? ORANGE : '#FAFAFA'}
      borderRadius={16}
    >
      <ThemedText style={[styles.buttonText, { color: enabled ? '#FFF' : '#AAA' }]}>{label}</ThemedText>
    </Button>
  );
}

export function OutlineButton({
  label,
  onPress,
  disabled = false,
  width = SCREEN_WIDTH - 48,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  width?: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.outline, { width }, disabled && { opacity: 0.5 }]}>
      <ThemedText style={styles.outlineText}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

export function TextLink({ label, onPress, color = ORANGE, disabled = false }: { label: string; onPress: () => void; color?: string; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <ThemedText style={[styles.link, { color: disabled ? '#AAA' : color }]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

export function Notice({ text, tone = 'warning' }: { text: string; tone?: 'warning' | 'error' | 'success' | 'info' }) {
  const palette = {
    warning: { border: ORANGE, bg: '#FFF', icon: 'alert-circle-outline' as const, color: ORANGE },
    error: { border: '#FFD6D3', bg: '#FFF4F3', icon: 'alert-circle-outline' as const, color: '#FF3B30' },
    success: { border: '#CDEDE6', bg: '#EEF9F6', icon: 'checkmark-circle-outline' as const, color: GREEN },
    info: { border: '#F0F0F0', bg: '#F3F4F6', icon: 'information-circle-outline' as const, color: '#4B4B55' },
  }[tone];
  return (
    <View style={[styles.notice, { borderColor: palette.border, backgroundColor: palette.bg }]}>
      <Ionicons name={palette.icon} size={20} color={palette.color} />
      <ThemedText style={styles.noticeText}>{text}</ThemedText>
    </View>
  );
}

export function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={styles.checkRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? GREEN : '#BBB'} />
      <ThemedText style={styles.checkLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

export function DetailRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <View>
      {rows.map(([label, value], index) => (
        <View key={label} style={[styles.detailItem, index === rows.length - 1 && { borderBottomWidth: 0 }]}>
          <ThemedText style={styles.detailLabel}>{label}</ThemedText>
          <ThemedText style={styles.detailValue}>{value}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export const loanStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  form: { marginTop: 20, gap: 16 },
  body: { fontSize: 14, lineHeight: 21, color: '#4B4B55' },
  heading: { fontSize: 16, fontWeight: '700', color: '#000' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8, marginLeft: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E7E8EC',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    fontSize: 14,
    fontFamily: interFamily('400'),
    color: '#000',
    ...Shadows.input,
  },
  card: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, gap: 6 },
  errorText: { color: '#FF3B30', fontSize: 12, marginTop: 4 },
  hint: { fontSize: 12, color: '#4B4B55', marginTop: 6 },
  footer: { marginTop: 32, alignItems: 'center', gap: 12 },
  optionsList: { paddingHorizontal: 24, paddingTop: 8 },
  optionsHeader: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 20 },
  optionItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  optionText: { fontSize: 14, color: '#333' },
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  backBtn: { marginTop: 10, marginBottom: 10, marginLeft: -8, marginRight: 8 },
  titleContainer: { flex: 1, marginRight: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#000' },
  buttonText: { fontSize: 14, fontWeight: '700' },
  outline: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { fontSize: 14, fontWeight: '700', color: ORANGE },
  link: { fontSize: 14, fontWeight: '600' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#000', fontWeight: '500' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkLabel: { flex: 1, fontSize: 13, lineHeight: 19, color: '#333' },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: { fontSize: 14, color: '#4B4B55', flexShrink: 1 },
  detailValue: { fontSize: 14, color: '#000', fontWeight: '700', textAlign: 'right', flexShrink: 1 },
});
