'use client';

interface EducationSystemBadgeProps {
  system: 'CBC_Senior_School' | '8-4-4';
}

/**
 * Small inline pill badge indicating the education system.
 * Green "CBC" for CBC_Senior_School, gray "8-4-4" for 8-4-4.
 * Used in form dropdowns and student list rows across the app.
 */
export default function EducationSystemBadge({ system }: EducationSystemBadgeProps) {
  if (system === 'CBC_Senior_School') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 leading-none">
        CBC
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 leading-none">
      8-4-4
    </span>
  );
}
