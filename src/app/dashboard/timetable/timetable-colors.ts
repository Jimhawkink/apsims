// ─── ASC Timetable Colors & Constants ─────────────────────────────
import type { Subject } from './timetable-types';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri'
};

export const SUBJECT_COLORS = [
  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  { bg: '#fed7d7', text: '#9b2c2c', border: '#feb2b2' },
  { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
  { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },
  { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },
  { bg: '#fce4ec', text: '#880e4f', border: '#f48fb1' },
  { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  { bg: '#fff3e0', text: '#e65100', border: '#ffb74d' },
  { bg: '#f1f8e9', text: '#558b2f', border: '#aed581' },
  { bg: '#e8eaf6', text: '#283593', border: '#9fa8da' },
];

export function getSubjectColor(subjectId: number, subjects: Subject[]) {
  const idx = subjects.findIndex(s => s.id === subjectId);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];
}

export const ROOM_TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  classroom: { bg: '#dbeafe', text: '#1e40af', icon: '🏫' },
  lab: { bg: '#dcfce7', text: '#166534', icon: '🔬' },
  computer_lab: { bg: '#e0e7ff', text: '#3730a3', icon: '💻' },
  library: { bg: '#fef3c7', text: '#92400e', icon: '📚' },
  gym: { bg: '#fce7f3', text: '#9d174d', icon: '🏃' },
  hall: { bg: '#ede9fe', text: '#5b21b6', icon: '🎭' },
};
