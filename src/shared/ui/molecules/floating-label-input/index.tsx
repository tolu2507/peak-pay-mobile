import { Shadows } from '@/constants/theme';
import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TextInputProps, 
  Animated as RNAnimated, 
  Platform 
} from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSpring,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface FloatingLabelInputProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  value,
  icon,
  rightIcon,
  onRightIconPress,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useSharedValue(value ? 1 : 0);
  // 0 at rest, 1 while focused: drives the lift-and-pop.
  const focusLift = useSharedValue(0);

  // Keep the label up when the value is filled in from outside (saved data).
  React.useEffect(() => {
    if (value && animatedValue.value === 0) animatedValue.value = withTiming(1, { duration: 200 });
  }, [value]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    animatedValue.value = withTiming(1, { duration: 200 });
    focusLift.value = withSpring(1, { damping: 14, stiffness: 220, mass: 0.6 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusLift.value = withSpring(0, { damping: 18, stiffness: 220 });
    if (!value) {
      animatedValue.value = withTiming(0, { duration: 200 });
    }
    onBlur?.(e);
  };

  const labelStyle = useAnimatedStyle(() => {
    return {
      top: interpolate(animatedValue.value, [0, 1], [18, -10], Extrapolation.CLAMP),
      left: interpolate(animatedValue.value, [0, 1], [icon ? 44 : 16, 12], Extrapolation.CLAMP),
      fontSize: interpolate(animatedValue.value, [0, 1], [14, 12], Extrapolation.CLAMP),
      color: interpolateColor_custom(animatedValue.value, [0, 1], ['#6E6E78', '#FF7A00']), 
      backgroundColor: animatedValue.value > 0.5 ? '#FFF' : 'transparent',
      paddingHorizontal: animatedValue.value > 0.5 ? 4 : 0,
    };
  });

  // Helper for color interpolation since reanimated interpolateColor is best in useAnimatedStyle
  const labelColorStyle = useAnimatedStyle(() => {
    return {
      color: isFocused ? '#FF7A00' : '#6E6E78',
    };
  });

  const popStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(focusLift.value, [0, 1], [0, -2]) },
      { scale: interpolate(focusLift.value, [0, 1], [1, 1.015]) },
    ],
  }));

  return (
    <Animated.View style={[styles.container, isFocused && styles.containerFocused, popStyle]}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={20} 
          color={isFocused ? '#FF7A00' : '#6E6E78'} 
          style={styles.icon} 
        />
      )}
      
      <Animated.Text style={[styles.label, labelStyle, labelColorStyle]}>
        {label}
      </Animated.Text>

      <TextInput
        {...props}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={styles.input}
        placeholder="" // Keep empty for floating label
      />

      {rightIcon && (
        <Ionicons 
          name={rightIcon} 
          size={20} 
          color="#6E6E78" 
          onPress={onRightIconPress}
          style={styles.rightIcon} 
        />
      )}
    </Animated.View>
  );
};

// Simple helper since reanimated 3.x interpolateColor exists
import { interpolateColor } from 'react-native-reanimated';
import { interFamily } from '@/constants/fonts';
const interpolateColor_custom = interpolateColor;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E8EC',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#FFF',
    ...Shadows.input,
  },
  containerFocused: {
    borderColor: '#FF7A00',
    borderWidth: 1.5,
    // A brand-coloured glow lifts the active field off the page.
    ...Shadows.inputFocused,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    position: 'absolute',
    fontFamily: interFamily('600'),
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: interFamily('400'),
    color: '#0B0B0F',
    textAlignVertical: 'center',
    paddingTop: Platform.OS === 'ios' ? 0 : 2,
  },
  rightIcon: {
    marginLeft: 8,
  },
});
