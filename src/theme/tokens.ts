/**
 * Design tokens: human-configured 8px grid system, radii, and subtle elevation
 */

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  card: 26,
  sheet: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

/** Crisp card shadow for light canvas */
export const glassCardShadow = {
  shadowColor: '#0F1419',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 1,
};

/** Subtle micro shadow */
export const subtleShadow = {
  shadowColor: '#0F1419',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.03,
  shadowRadius: 3,
  elevation: 1,
};

/** Dark hero card elevation */
export const heroShadow = {
  shadowColor: '#0F1419',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 18,
  elevation: 6,
};

