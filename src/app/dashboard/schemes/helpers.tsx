export const CORE_COMPETENCIES = ['Communication & Collaboration', 'Critical Thinking & Problem Solving', 'Creativity & Imagination', 'Citizenship', 'Self-Efficacy', 'Digital Literacy', 'Learning to Learn'];
export const CBC_VALUES = ['Love', 'Responsibility', 'Respect', 'Unity', 'Peace', 'Patriotism', 'Integrity'];
export const RESOURCE_TYPES = ['Textbook', 'Worksheet', 'Digital Resource', 'Apparatus', 'Chart', 'Realia', 'Video', 'Reference Book', 'Past Papers', 'Manipulatives'];
export const ASSESSMENT_METHODS = ['Observation', 'Oral Questions', 'Written Exercise', 'Practical Assessment', 'Project', 'Portfolio', 'Rubric', 'Peer Assessment', 'Self-Assessment', 'Test'];

export const C: Record<string, { bg: string; text: string; head: string }> = {
    subject: { bg: '#eef2ff', text: '#4338ca', head: '#c7d2fe' },
    form: { bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
    term: { bg: '#fffbeb', text: '#b45309', head: '#fde68a' },
    status: { bg: '#ecfdf5', text: '#059669', head: '#a7f3d0' },
    cbc: { bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
    lessons: { bg: '#eff6ff', text: '#1d4ed8', head: '#bfdbfe' },
    teacher: { bg: '#f8fafc', text: '#475569', head: '#e2e8f0' },
    actions: { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    week: { bg: '#fff7ed', text: '#c2410c', head: '#fed7aa' },
    approved: { bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
    review: { bg: '#fefce8', text: '#a16207', head: '#fde68a' },
};

export const STATUS_MAP: Record<string, { bg: string; text: string; border: string; label: string }> = {
    Draft: { bg: '#fefce8', text: '#a16207', border: '#fde68a', label: '📝 Draft' },
    Active: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: '✅ Active' },
    'HOD Review': { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', label: '🔍 HOD Review' },
    Approved: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: '✅ Approved' },
    Completed: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', label: '🏁 Completed' },
    Archived: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe', label: '📦 Archived' },
};

export function statusBadge(status: string) {
    const s = STATUS_MAP[status] || STATUS_MAP.Draft;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: s.bg, color: s.text, borderColor: s.border }}>{s.label}</span>;
}

export function curriculumBadge(type: string) {
    return type === 'CBC'
        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: '#faf5ff', color: '#7c3aed', borderColor: '#e9d5ff' }}>🇰🇪 CBC</span>
        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>📖 8-4-4</span>;
}
