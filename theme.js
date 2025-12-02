// theme.js
export const colors = {
  primary: '#6D5FFD',      // brand purple
  accent: '#22C55E',       // success green
  danger: '#EF4444',       // error red
  warning: '#F59E0B',
  bg: '#0D1117',           // dark background
  card: '#111827',         // card surface
  softBorder: '#1F2937',
  charcoal: '#E5E7EB',
  muted: '#9CA3AF',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '800', color: colors.charcoal },
  h2: { fontSize: 22, fontWeight: '700', color: colors.charcoal },
  body: { fontSize: 16, color: colors.charcoal },
  muted: { fontSize: 14, color: colors.muted },
};
