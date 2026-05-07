'use client';

/** Hardcoded fallback colors when rubricConfig is empty or missing the level. */
const FALLBACK_COLORS: Record<string, { color: string; bg: string }> = {
  EE: { color: '#15803d', bg: '#f0fdf4' },
  ME: { color: '#1d4ed8', bg: '#eff6ff' },
  AE: { color: '#b45309', bg: '#fffbeb' },
  BE: { color: '#b91c1c', bg: '#fef2f2' },
};

interface RubricLevelBadgeProps {
  level: 'EE' | 'ME' | 'AE' | 'BE' | null;
  rubricConfig: any[];
  size?: 'sm' | 'md';
}

/**
 * Renders a colored pill badge for a CBC rubric level (EE/ME/AE/BE).
 * Colors are read from rubricConfig; falls back to hardcoded values if config is empty.
 * Renders "Not Assessed" in gray when level is null.
 */
export default function RubricLevelBadge({
  level,
  rubricConfig,
  size = 'sm',
}: RubricLevelBadgeProps) {
  if (level === null || level === undefined) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold border border-gray-200 bg-gray-100 text-gray-400 ${
          size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'
        }`}
      >
        Not Assessed
      </span>
    );
  }

  // Look up color from rubricConfig
  const configEntry = rubricConfig?.find((c: any) => c.level_code === level);
  const colorHex = configEntry?.color_hex ?? FALLBACK_COLORS[level]?.color ?? '#6b7280';
  const bgHex = configEntry?.bg_hex ?? FALLBACK_COLORS[level]?.bg ?? '#f3f4f6';

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border leading-none ${
        size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'
      }`}
      style={{
        color: colorHex,
        backgroundColor: bgHex,
        borderColor: colorHex + '40',
      }}
    >
      {level}
    </span>
  );
}
