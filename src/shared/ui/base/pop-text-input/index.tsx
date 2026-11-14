import { Shadows } from '@/constants/theme';
import React, { forwardRef, useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// A TextInput that lifts, grows slightly and glows orange while focused.
// Drop-in for <TextInput>: pass the same style (e.g. loanStyles.input).

export const PopTextInput = forwardRef<TextInput, TextInputProps>(function PopTextInput(
  { style, onFocus, onBlur, placeholderTextColor = '#8E8E93', ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const lift = useSharedValue(0);

  const popStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lift.value, [0, 1], [0, -2]) },
      { scale: interpolate(lift.value, [0, 1], [1, 1.015]) },
    ],
  }));

  return (
    <Animated.View style={popStyle}>
      <TextInput
        ref={ref}
        {...props}
        placeholderTextColor={placeholderTextColor}
        maxFontSizeMultiplier={1.3}
        style={[style, focused && { borderColor: '#FF7A00', borderWidth: 1.5, ...Shadows.inputFocused }]}
        onFocus={(e) => {
          setFocused(true);
          lift.value = withSpring(1, { damping: 14, stiffness: 220, mass: 0.6 });
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          lift.value = withSpring(0, { damping: 18, stiffness: 220 });
          onBlur?.(e);
        }}
      />
    </Animated.View>
  );
});
