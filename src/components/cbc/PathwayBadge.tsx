'use client';

/** Default colors per pathway name. */
const PATHWAY_COLORS: Record<string, string> = {
  STEM: '#2563eb',
  'Social Sciences': '#7c3aed',
  'Arts & Sports Science': '#ea580c',
};

interface PathwayBadgeProps {
  pathwayName: string;
  colorHex?: string;
}

/**
 * Renders a colored pill badge for a CBC pathway.
 * STEM → blue, Social Sciences → purple, Arts & Sports Science → orange.
 * A custom colorHex overrides the defaults.
 */
export default function PathwayBadge({ pathwayName, colorHex }: PathwayBadgeProps) {
  const color = colorHex ?? PATHWAY_COLORS[pathwayName] ?? '#6366f1';

  // Derive a light background from the hex color (20% opacity approximation via hex alpha)
  const bgColor = color + '18'; // ~10% opacity

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border leading-none"
      style={{
        color,
        backgroundColor: bgColor,
        borderColor: color + '40',
      }}
    >
      {pathwayName}
    </span>
  );
}
