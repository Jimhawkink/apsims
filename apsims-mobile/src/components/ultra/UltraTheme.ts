// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Theme — Premium Light Design System
// Matches the web app's cutting-edge aesthetic for mobile
// ═══════════════════════════════════════════════════════════════

export const COLORS = {
  // Primary palette
  purple: '#6c5ce7',
  purpleLight: '#a78bfa',
  green: '#059669',
  greenLight: '#34d399',
  blue: '#2563eb',
  blueLight: '#60a5fa',
  amber: '#d97706',
  amberLight: '#fbbf24',
  pink: '#db2777',
  pinkLight: '#f472b6',
  cyan: '#0891b2',
  cyanLight: '#22d3ee',
  red: '#ef4444',
  redLight: '#f87171',
  indigo: '#6366f1',
  
  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  
  // Neutrals (light theme)
  bg: '#f8fafc',
  card: '#ffffff',
  cardHover: '#fafbff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textLight: '#cbd5e1',
  
  // Chart colors
  chart: ['#6c5ce7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0891b2', '#ef4444'],
  chartSoft: ['rgba(108,92,231,0.7)', 'rgba(59,130,246,0.7)', 'rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(236,72,153,0.7)', 'rgba(139,92,246,0.7)'],
};

export const GRADIENTS = {
  purple: ['#6c5ce7', '#a78bfa'],
  green: ['#059669', '#34d399'],
  blue: ['#2563eb', '#60a5fa'],
  amber: ['#d97706', '#fbbf24'],
  pink: ['#db2777', '#f472b6'],
  cyan: ['#0891b2', '#22d3ee'],
  red: ['#dc2626', '#f87171'],
  indigo: ['#4f46e5', '#818cf8'],
  emerald: ['#059669', '#10b981'],
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  }),
};

export const CARD = {
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  accent: (color: string) => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: color,
  }),
};

export const FONTS = {
  xs: { fontSize: 9, lineHeight: 12 },
  sm: { fontSize: 11, lineHeight: 15 },
  base: { fontSize: 13, lineHeight: 18 },
  lg: { fontSize: 15, lineHeight: 20 },
  xl: { fontSize: 18, lineHeight: 24 },
  '2xl': { fontSize: 22, lineHeight: 28 },
  '3xl': { fontSize: 28, lineHeight: 34 },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
};

// Format currency (KES)
export const fmt = (n: number): string => {
  if (n >= 1000000) return `Ksh ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `Ksh ${(n / 1000).toFixed(0)}K`;
  return `Ksh ${n.toLocaleString()}`;
};

export const fmtFull = (n: number): string => `Ksh ${n.toLocaleString()}`;

export const fmtPct = (n: number): string => `${Math.round(n)}%`;

// Status badge colors
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#dcfce7', text: '#16a34a' },
  Inactive: { bg: '#fef2f2', text: '#dc2626' },
  Critical: { bg: '#fef2f2', text: '#dc2626' },
  Overdue: { bg: '#fef9c3', text: '#ca8a04' },
  'Notice Sent': { bg: '#dbeafe', text: '#2563eb' },
  Posted: { bg: '#dcfce7', text: '#16a34a' },
  Pending: { bg: '#fef9c3', text: '#ca8a04' },
  Credited: { bg: '#dcfce7', text: '#16a34a' },
  Queued: { bg: '#f3e8ff', text: '#7c3aed' },
};
