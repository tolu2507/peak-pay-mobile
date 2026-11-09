import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

// Inter, as on the web and in Figma. Phones need one font file per weight:
// asking for fontWeight 600 on "Inter" falls back to the system font on
// Android, so each weight maps to its own family name instead.

export const INTER_FONTS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
};

type Weight = NonNullable<TextStyle['fontWeight']>;

const FAMILY_BY_WEIGHT: Record<string, keyof typeof INTER_FONTS> = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  regular: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  medium: 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  semibold: 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_800ExtraBold',
  heavy: 'Inter_800ExtraBold',
  black: 'Inter_800ExtraBold',
};

export const interFamily = (weight?: Weight | null) =>
  FAMILY_BY_WEIGHT[String(weight ?? '400').toLowerCase()] ?? 'Inter_400Regular';

// Replaces fontWeight with the matching Inter file. Styles that name another
// font (e.g. the monospace code style) are left alone.
export function withInter(style: StyleProp<TextStyle>): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily && !flat.fontFamily.startsWith('Inter')) return flat;
  const { fontWeight, ...rest } = flat;
  return { ...rest, fontFamily: interFamily(fontWeight) };
}
