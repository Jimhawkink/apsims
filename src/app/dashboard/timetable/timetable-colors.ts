// ─── APSIMS ULTRA — Colors, Constants & Utilities ──────────────────
import type { Subject } from './timetable-types';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri'
};
export const DAY_EMOJI: Record<string, string> = {
  Monday: '🔵', Tuesday: '🟢', Wednesday: '🟡', Thursday: '🟠', Friday: '🔴'
};

// Premium 24-color palette for subjects — vibrant, accessible, distinct
export const SUBJECT_COLORS = [
  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', gradient: 'from-blue-100 to-blue-50' },
  { bg: '#dcfce7', text: '#166534', border: '#86efac', gradient: 'from-green-100 to-green-50' },
  { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', gradient: 'from-amber-100 to-amber-50' },
  { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4', gradient: 'from-pink-100 to-pink-50' },
  { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc', gradient: 'from-indigo-100 to-indigo-50' },
  { bg: '#fed7d7', text: '#9b2c2c', border: '#feb2b2', gradient: 'from-red-100 to-red-50' },
  { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', gradient: 'from-emerald-100 to-emerald-50' },
  { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd', gradient: 'from-violet-100 to-violet-50' },
  { bg: '#ffedd5', text: '#9a3412', border: '#fdba74', gradient: 'from-orange-100 to-orange-50' },
  { bg: '#cffafe', text: '#155e75', border: '#67e8f9', gradient: 'from-cyan-100 to-cyan-50' },
  { bg: '#fef9c3', text: '#854d0e', border: '#fde047', gradient: 'from-yellow-100 to-yellow-50' },
  { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe', gradient: 'from-purple-100 to-purple-50' },
  { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc', gradient: 'from-sky-100 to-sky-50' },
  { bg: '#fce4ec', text: '#880e4f', border: '#f48fb1', gradient: 'from-rose-100 to-rose-50' },
  { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7', gradient: 'from-green-100 to-emerald-50' },
  { bg: '#fff3e0', text: '#e65100', border: '#ffb74d', gradient: 'from-orange-100 to-amber-50' },
  { bg: '#f1f8e9', text: '#558b2f', border: '#aed581', gradient: 'from-lime-100 to-lime-50' },
  { bg: '#e8eaf6', text: '#283593', border: '#9fa8da', gradient: 'from-indigo-100 to-blue-50' },
  { bg: '#fbe9e7', text: '#bf360c', border: '#ffab91', gradient: 'from-orange-100 to-red-50' },
  { bg: '#e1f5fe', text: '#01579b', border: '#81d4fa', gradient: 'from-sky-100 to-blue-50' },
  { bg: '#f9fbe7', text: '#827717', border: '#e6ee9c', gradient: 'from-lime-100 to-yellow-50' },
  { bg: '#ede7f6', text: '#4a148c', border: '#b39ddb', gradient: 'from-purple-100 to-violet-50' },
  { bg: '#e0f7fa', text: '#006064', border: '#80deea', gradient: 'from-cyan-100 to-teal-50' },
  { bg: '#fce4ec', text: '#ad1457', border: '#f48fb1', gradient: 'from-pink-100 to-rose-50' },
];

export function getSubjectColor(subjectId: number, subjects: Subject[]) {
  const idx = subjects.findIndex(s => s.id === subjectId);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];
}

export const ROOM_TYPE_COLORS: Record<string, { bg: string; text: string; icon: string; gradient: string }> = {
  classroom:    { bg: '#dbeafe', text: '#1e40af', icon: '🏫', gradient: 'from-blue-500 to-indigo-600' },
  lab:          { bg: '#dcfce7', text: '#166534', icon: '🔬', gradient: 'from-green-500 to-emerald-600' },
  computer_lab: { bg: '#e0e7ff', text: '#3730a3', icon: '💻', gradient: 'from-indigo-500 to-purple-600' },
  library:      { bg: '#fef3c7', text: '#92400e', icon: '📚', gradient: 'from-amber-500 to-orange-600' },
  gym:          { bg: '#fce7f3', text: '#9d174d', icon: '🏃', gradient: 'from-pink-500 to-rose-600' },
  hall:         { bg: '#ede9fe', text: '#5b21b6', icon: '🎭', gradient: 'from-violet-500 to-purple-600' },
  workshop:     { bg: '#ffedd5', text: '#9a3412', icon: '🔧', gradient: 'from-orange-500 to-red-600' },
  field:        { bg: '#d1fae5', text: '#065f46', icon: '⚽', gradient: 'from-emerald-500 to-green-600' },
};

// Kenya MoE Subject Categories for CBC & 8-4-4
export const SUBJECT_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  core:       { label: 'Core', icon: '📖', color: '#3b82f6' },
  sciences:   { label: 'Sciences', icon: '🔬', color: '#10b981' },
  humanities:  { label: 'Humanities', icon: '🌍', color: '#f59e0b' },
  technical:  { label: 'Technical', icon: '⚙️', color: '#8b5cf6' },
  languages:  { label: 'Languages', icon: '🗣️', color: '#ec4899' },
  arts:       { label: 'Creative Arts', icon: '🎨', color: '#ef4444' },
  pe:         { label: 'PE & Sports', icon: '🏃', color: '#06b6d4' },
  cbc_learning: { label: 'CBC Learning Areas', icon: '📘', color: '#6366f1' },
};

// Period type styling
export const PERIOD_TYPE_STYLES: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  lesson:   { bg: 'bg-blue-50', text: 'text-blue-700', icon: '📖', label: 'Lesson' },
  break:    { bg: 'bg-amber-50', text: 'text-amber-700', icon: '☕', label: 'Break' },
  assembly: { bg: 'bg-purple-50', text: 'text-purple-700', icon: '🎤', label: 'Assembly' },
  games:    { bg: 'bg-green-50', text: 'text-green-700', icon: '⚽', label: 'Games' },
  lunch:    { bg: 'bg-orange-50', text: 'text-orange-700', icon: '🍽️', label: 'Lunch' },
  prep:     { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: '📝', label: 'Prep' },
};
