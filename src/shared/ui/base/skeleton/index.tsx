import { Shadows } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DimensionValue, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Shimmering placeholders shown while a screen loads. Wrap a group in
// <SkeletonGroup> so every block shimmers in step; a lone <Skeleton> runs
// its own animation.

const BASE = '#ECEDEF';
const HIGHLIGHT = 'rgba(255,255,255,0.75)';

const ProgressContext = createContext<SharedValue<number> | null>(null);

function useShimmer() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [progress]);
  return progress;
}

export function SkeletonGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const progress = useShimmer();
  return (
    <ProgressContext.Provider value={progress}>
      <View style={style} accessibilityRole="progressbar" accessibilityLabel="Loading">
        {children}
      </View>
    </ProgressContext.Provider>
  );
}

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  circle?: number;
  style?: StyleProp<ViewStyle>;
};

function ShimmerBlock({ progress, width, height, radius, style }: SkeletonProps & { progress: SharedValue<number> }) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: -w + progress.value * w * 2 }],
  }));
  return (
    <View onLayout={onLayout} style={[{ width, height, borderRadius: radius, backgroundColor: BASE, overflow: 'hidden' }, style]}>
      {w > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
          <LinearGradient
            colors={['transparent', HIGHLIGHT, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

function StandaloneSkeleton(props: SkeletonProps) {
  const progress = useShimmer();
  return <ShimmerBlock progress={progress} {...props} />;
}

export function Skeleton({ width = '100%', height = 14, radius = 8, circle, style }: SkeletonProps) {
  const progress = useContext(ProgressContext);
  const size = circle ? { width: circle, height: circle, radius: circle / 2 } : { width, height, radius };
  if (progress) return <ShimmerBlock progress={progress} {...size} style={style} />;
  return <StandaloneSkeleton {...size} style={style} />;
}

// ---- Ready-made layouts -------------------------------------------------

/** A few lines of text, the last one shorter. */
export function SkeletonText({ lines = 3, lineHeight = 12, gap = 10 }: { lines?: number; lineHeight?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 && lines > 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}

/** A white raised card holding a title and some lines. */
export function SkeletonCard({ lines = 3, style }: { lines?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="45%" height={16} />
      <View style={{ height: 14 }} />
      <SkeletonText lines={lines} />
    </View>
  );
}

/** The big balance/hero card at the top of the home and loans tabs. */
export function SkeletonHero({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, { padding: 20 }, style]}>
      <Skeleton width="35%" height={12} />
      <View style={{ height: 12 }} />
      <Skeleton width="65%" height={32} radius={10} />
      <View style={{ height: 20 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton width="48%" height={44} radius={14} />
        <Skeleton width="48%" height={44} radius={14} />
      </View>
    </View>
  );
}

/** A list row: icon, two lines, amount on the right. */
export function SkeletonRow({ avatar = 40 }: { avatar?: number }) {
  return (
    <View style={styles.row}>
      <Skeleton circle={avatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="35%" height={11} />
      </View>
      <Skeleton width={64} height={14} />
    </View>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={{ gap: 4 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

/** Label + input pairs, for forms waiting on saved data. */
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <View style={{ gap: 20 }}>
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i} style={{ gap: 8 }}>
          <Skeleton width="30%" height={12} />
          <Skeleton height={56} radius={12} />
        </View>
      ))}
    </View>
  );
}

/** Label/value pairs like a loan summary. */
export function SkeletonDetails({ rows = 5 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.detail, i === rows - 1 && { borderBottomWidth: 0 }]}>
          <Skeleton width="35%" height={13} />
          <Skeleton width="28%" height={13} />
        </View>
      ))}
    </View>
  );
}

/** A full generic screen: hero card, a card and a list. */
export function ScreenSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonGroup style={[{ gap: 20 }, style]}>
      <SkeletonHero />
      <SkeletonCard lines={2} />
      <SkeletonList rows={3} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2F2F4',
    ...Shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
});
