// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Premium — Global Design System
// Ultra-light bright theme. Kenya's #1 School App aesthetic.
// ═══════════════════════════════════════════════════════════════

export const T = {
    // ─── Backgrounds ─────────────────────────────────────────────
    bg: '#F8FAFF',           // Ultra-light blue-white main bg
    bgCard: '#FFFFFF',       // Pure white card
    bgSoft: '#F0F4FF',       // Soft blue tinted section bg
    bgGlass: 'rgba(255,255,255,0.85)', // Glassmorphism overlay

    // ─── Brand Gradients ─────────────────────────────────────────
    gradPrimary: ['#6366F1', '#4F46E5'] as [string, string],       // Indigo
    gradBlue:    ['#3B82F6', '#2563EB'] as [string, string],       // Blue
    gradGreen:   ['#10B981', '#059669'] as [string, string],       // Emerald
    gradTeal:    ['#14B8A6', '#0D9488'] as [string, string],       // Teal
    gradPurple:  ['#A855F7', '#7C3AED'] as [string, string],       // Purple
    gradOrange:  ['#F97316', '#EA580C'] as [string, string],       // Orange
    gradRed:     ['#EF4444', '#DC2626'] as [string, string],       // Red
    gradGold:    ['#F59E0B', '#D97706'] as [string, string],       // Amber
    gradPink:    ['#EC4899', '#DB2777'] as [string, string],       // Pink
    gradCyan:    ['#06B6D4', '#0891B2'] as [string, string],       // Cyan

    // ─── Solid Colors ────────────────────────────────────────────
    indigo:  '#4F46E5',
    blue:    '#2563EB',
    green:   '#059669',
    teal:    '#0D9488',
    purple:  '#7C3AED',
    orange:  '#EA580C',
    red:     '#DC2626',
    amber:   '#D97706',
    pink:    '#DB2777',
    cyan:    '#0891B2',

    // ─── Light tints (for chip backgrounds) ──────────────────────
    indigoLight: '#EEF2FF',
    blueLight:   '#DBEAFE',
    greenLight:  '#D1FAE5',
    tealLight:   '#CCFBF1',
    purpleLight: '#F3E8FF',
    orangeLight: '#FFEDD5',
    redLight:    '#FEE2E2',
    amberLight:  '#FEF3C7',
    pinkLight:   '#FCE7F3',
    cyanLight:   '#CFFAFE',

    // ─── Text ─────────────────────────────────────────────────────
    text:     '#0F172A',     // Rich dark navy
    textMd:   '#1E293B',     // Medium dark
    textSub:  '#475569',     // Slate
    textDim:  '#94A3B8',     // Muted

    // ─── Borders ─────────────────────────────────────────────────
    border:     '#E2E8F0',
    borderSoft: '#F1F5F9',

    // ─── Shadows ─────────────────────────────────────────────────
    shadow: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    shadowSm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    shadowMd: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    shadowLg: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 12,
    },

    // ─── Radius ──────────────────────────────────────────────────
    r4:  4,
    r8:  8,
    r12: 12,
    r16: 16,
    r20: 20,
    r24: 24,
    r32: 32,
};

// ─── Formatters ───────────────────────────────────────────────────
export const fmtKES = (n: number) =>
    `KES ${(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

export const fmtKESShort = (n: number) => {
    const v = n || 0;
    if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 10_000)    return `KES ${Math.floor(v / 1_000)}K`;
    return `KES ${v.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
};

export const fmtPct = (n: number) => `${Math.round(n || 0)}%`;

// ─── Status helpers ───────────────────────────────────────────────
export const gradeColor = (pct: number) =>
    pct >= 75 ? T.green : pct >= 50 ? T.amber : T.red;

export const gradeBg = (pct: number) =>
    pct >= 75 ? T.greenLight : pct >= 50 ? T.amberLight : T.redLight;

// ─── Common card style ────────────────────────────────────────────
export const cardStyle = {
    backgroundColor: T.bgCard,
    borderRadius: T.r20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    ...{
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
    },
};
