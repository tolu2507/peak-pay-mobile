import { ThemedText } from '@/components/themed-text';
import { Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInLeft,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Mobile version of the web's EligibilityReviewCard: shown while the address
// and bank statement are being reviewed.

const ORANGE = '#FF7A00';
const GREEN = '#2EB086';
const STEPS = ['Address', 'Bank statement', 'Eligibility review'];

function PulseRing({ delay }: { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + t.value }],
    opacity: 0.7 * (1 - t.value),
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

function BouncingDot({ delay }: { delay: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withSequence(withTiming(-5, { duration: 400 }), withTiming(0, { duration: 400 })), -1));
  }, [delay, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function EligibilityReviewCard() {
  const reduce = useReducedMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    float.value = withRepeat(withSequence(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
    ), -1);
  }, [reduce, float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 * float.value }, { rotate: `${(float.value - 0.5) * 8}deg` }],
  }));

  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.springify().damping(18)} style={styles.card}>
      <View style={styles.hero}>
        {!reduce && [0, 800, 1600].map((d) => <PulseRing key={d} delay={d} />)}
        <Animated.View style={floatStyle}>
          <LinearGradient colors={[ORANGE, '#FFB347']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
            <Ionicons name="document-text-outline" size={34} color="#FFF" />
          </LinearGradient>
        </Animated.View>
      </View>

      <ThemedText style={styles.title}>We&apos;re reviewing your eligibility</ThemedText>
      <ThemedText style={styles.body}>
        Thank you for submitting your address and bank statement. We&apos;re reviewing your eligibility and will
        notify you by email once your eligible amount is ready.
      </ThemedText>

      <View style={styles.tracker} accessibilityLabel="Eligibility progress">
        {STEPS.map((label, index) => {
          const done = index < STEPS.length - 1;
          return (
            <Animated.View
              key={label}
              entering={reduce ? undefined : FadeInLeft.delay(400 + index * 220).springify()}
              style={styles.step}
            >
              {done ? (
                <View style={[styles.stepIcon, { backgroundColor: GREEN }]}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </View>
              ) : (
                <View style={[styles.stepIcon, { backgroundColor: '#FFF4E5' }]}>
                  <View style={styles.stepCurrent} />
                </View>
              )}
              <ThemedText style={done ? styles.stepDone : styles.stepActive}>{label}</ThemedText>
              {!done && (
                <View style={styles.dots} accessibilityLabel="In progress">
                  {[0, 150, 300].map((d) => <BouncingDot key={d} delay={d} />)}
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.mail}>
        <View style={styles.mailIcon}>
          <Ionicons name="mail-outline" size={20} color={GREEN} />
        </View>
        <ThemedText style={styles.mailText}>
          Keep an eye on your inbox — we&apos;ll email you as soon as it&apos;s ready.
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: '#F2F2F4',
    ...Shadows.card,
  },
  hero: { alignSelf: 'center', width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: 'rgba(255,122,0,0.4)',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#0B0B0F', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, color: '#4B4B55', textAlign: 'center' },
  tracker: { backgroundColor: '#FBFBFB', borderRadius: 16, padding: 16, gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepCurrent: { width: 12, height: 12, borderRadius: 6, backgroundColor: ORANGE },
  stepDone: { fontSize: 14, color: '#6E6E78', textDecorationLine: 'line-through' },
  stepActive: { fontSize: 14, color: '#0B0B0F', fontWeight: '700' },
  dots: { marginLeft: 'auto', flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE },
  mail: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E6F4F1', borderRadius: 16, padding: 14 },
  mailIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  mailText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#004D3C', fontWeight: '600' },
});
