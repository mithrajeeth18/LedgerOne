const colors = {
  // Field Resilience Colors (Sunlight-Safe)
  background: '#f8faf3',
  onBackground: '#191c18',
  
  primary: '#002e0b',          // Deep forest green
  onPrimary: '#ffffff',
  primaryContainer: '#0b4619',
  onPrimaryContainer: '#7ab47b',
  
  secondary: '#5d5f5f',
  onSecondary: '#ffffff',
  
  surface: '#f8faf3',
  surfaceDim: '#d8dbd4',
  surfaceBright: '#f8faf3',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f4ed',
  surfaceContainer: '#ecefe7',
  surfaceContainerHigh: '#e7e9e2',
  surfaceContainerHighest: '#e1e3dc',
  onSurface: '#191c18',
  onSurfaceVariant: '#41493f',
  
  statusPaid: '#15803d',       // Forest Green
  statusPending: '#dc2626',    // High-intensity Red
  statusUnderpaid: '#b45309',  // Amber – "paid something, but not enough"
  statusInactive: '#94a3b8',
  
  borderHeavy: '#000000',
  outline: '#71796f',
  outlineVariant: '#c1c9bc',
  
  textPrimary: '#000000',      // Pure Black for sunlight safety
  textSecondary: '#475569',    // Mid-tone slate gray
  textMuted: '#6b7280',
  textInverse: '#ffffff',

  // Day grid mapping
  gridPaid: '#15803d',
  gridUnpaid: '#dc2626',
  gridSkipped: '#94a3b8',
  gridFuture: '#e2e8f0',
  gridLocked: '#cbd5e1',
  gridToday: '#ffffff',

  // Tab bar
  tabActive: '#002e0b',
  tabInactive: '#6b7280',
  tabBg: '#ffffff',

  // ─── Backward Compatibility Fallbacks/Aliases ───────────────────────
  white: '#ffffff',
  border: '#e1e3dc',           // Mapped to surfaceContainerHighest
  primaryPale: '#ecefe7',       // Mapped to surfaceContainer
  primaryLight: '#0b4619',      // Mapped to primaryContainer
  success: '#15803d',           // Mapped to statusPaid
  successBg: '#ecefe7',         // Mapped to surfaceContainer
  danger: '#dc2626',            // Mapped to statusPending
  dangerBg: '#ffdad6',          // Mapped to error-container equivalent
  warning: '#dc2626',
  warningBg: '#ffdad6',
  primaryMuted: '#71796f',
};

export default colors;
export type ColorsType = typeof colors;
