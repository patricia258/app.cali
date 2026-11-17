import { caliPalette } from './cali-palette.ts';

// Email clients read the resolved hex values in inline styles and bgcolor attributes.
export const emailColors = {
  page: caliPalette.sand.lighter,
  surface: caliPalette.neutral.lightest,
  surfaceSoft: caliPalette.sand.lightest,
  text: caliPalette.neutral.darker,
  textSecondary: caliPalette.neutral.dark,
  textMuted: caliPalette.neutral.base,
  line: caliPalette.sand.light,
  lineSoft: caliPalette.neutral.lighter,
  brand: caliPalette.burgundy.base,
  brandLine: caliPalette.burgundy.dark,
  onBrand: caliPalette.neutral.lightest,
  accentText: caliPalette.gold.dark,
  warning: caliPalette.gold.base,
  warningSurface: caliPalette.gold.lightest,
  warningTitle: caliPalette.gold.dark,
  warningText: caliPalette.gold.darker,
  danger: caliPalette.red.dark,
  dangerSurface: caliPalette.red.lightest,
  dangerText: caliPalette.red.darker,
  success: caliPalette.green.dark,
  successSurface: caliPalette.green.lightest,
} as const;
