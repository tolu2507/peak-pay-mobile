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

  const handleFocus = (e: any) => {
    setIsFocused(true);
    animatedValue.value = withTiming(1, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
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
      color: interpolateColor_custom(animatedValue.value, [0, 1], ['#999', '#FF7A00']), 
      backgroundColor: animatedValue.value > 0.5 ? '#FFF' : 'transparent',
      paddingHorizontal: animatedValue.value > 0.5 ? 4 : 0,
    };
  });

  // Helper for color interpolation since reanimated interpolateColor is best in useAnimatedStyle
  const labelColorStyle = useAnimatedStyle(() => {
    return {
      color: isFocused ? '#FF7A00' : '#999',
    };
  });

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={20} 
          color={isFocused ? '#FF7A00' : '#999'} 
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
          color="#999" 
          onPress={onRightIconPress}
          style={styles.rightIcon} 
        />
      )}
    </View>
  );
};

// Simple helper since reanimated 3.x interpolateColor exists
import { interpolateColor } from 'react-native-reanimated';
const interpolateColor_custom = interpolateColor;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#FFF',
  },
  containerFocused: {
    borderColor: '#FF7A00',
  },
  icon: {
    marginRight: 8,
  },
  label: {
    position: 'absolute',
    fontWeight: '600',
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#000',
    textAlignVertical: 'center',
    paddingTop: Platform.OS === 'ios' ? 0 : 2,
  },
  rightIcon: {
    marginLeft: 8,
  },
});
