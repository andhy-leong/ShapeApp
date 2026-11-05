// Design system "Kinetic Noir" (voir maquette/kinetic_noir/DESIGN.md)

export const colors = {
  background: '#000000',
  surface: '#121414',
  card: '#1A1A1A',
  cardHigh: '#262626',
  border: '#262626',
  borderStrong: '#444933',
  lime: '#C3F400',
  limeDim: '#ABD600',
  onLime: '#161E00',
  text: '#FFFFFF',
  textMuted: '#C4C9AC',
  textDim: '#8E9379',
  warning: '#FF9500',
  danger: '#FF3B30',
  track: '#262626',
} as const;

export const fonts = {
  displayXBold: 'Lexend_800ExtraBold',
  displayBold: 'Lexend_700Bold',
  displaySemi: 'Lexend_600SemiBold',
  display: 'Lexend_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const radius = { sm: 4, md: 8, card: 16, media: 24, full: 9999 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, margin: 20 } as const;

export const type = {
  displayXl: { fontFamily: fonts.displayXBold, fontSize: 48, lineHeight: 52, letterSpacing: -1 },
  headlineLg: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  headlineMd: { fontFamily: fonts.displaySemi, fontSize: 24, lineHeight: 31 },
  bodyLg: { fontFamily: fonts.body, fontSize: 18, lineHeight: 28 },
  bodyMd: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.displaySemi, fontSize: 14, letterSpacing: 0.7, textTransform: 'uppercase' as const },
  labelSm: { fontFamily: fonts.displaySemi, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  stat: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 44 },
} as const;
