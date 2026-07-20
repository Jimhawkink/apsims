'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export const methodColors: Record<string, string> = {
    'Cash': 'bg-green-100 text-green-700', 'M-Pesa': 'bg-emerald-100 text-emerald-700',
    'Bank Transfer': 'bg-blue-100 text-blue-700', 'Cheque': 'bg-amber-100 text-amber-700',
    'Imported': 'bg-gray-100 text-gray-600',
};
export const getMethodColor = (m: string) => Object.entries(methodColors).find(([k]) => m?.includes(k))?.[1] || 'bg-purple-100 text-purple-700';

// ── Vote Heads: now fetched from school_vote_heads table ──
// Use the useVoteHeads() hook in components instead of a static array
export interface VoteHead {
    id: number;
    code: string;
    name: string;
    category: 'fee' | 'discount' | 'credit' | 'expense';
    sort_order: number;
    is_active: boolean;
    description: string | null;
}

/**
 * Hook that fetches live vote heads from the database.
 * Returns active vote head names (for dropdowns) + full objects for advanced use.
 * Falls back to empty array if table is empty or unavailable.
 */
export function useVoteHeads() {
    const [voteHeads, setVoteHeads] = useState<VoteHead[]>([]);
    const [loadingVoteHeads, setLoadingVoteHeads] = useState(true);

    const fetchVoteHeads = useCallback(async () => {
        setLoadingVoteHeads(true);
        const { data, error } = await supabase
            .from('school_vote_heads')
            .select('*')
            .eq('is_active', true)
            .order('sort_order')
            .order('name');
        if (!error) setVoteHeads(data || []);
        setLoadingVoteHeads(false);
    }, []);

    useEffect(() => { fetchVoteHeads(); }, [fetchVoteHeads]);

    // Simple name array for <select> dropdowns
    const voteHeadNames: string[] = voteHeads.map(v => v.name);

    return { voteHeads, voteHeadNames, loadingVoteHeads, fetchVoteHeads };
}

export function useFeeData() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [f, st, s, p, fs, t] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
            supabase.from('school_fee_structures').select('*'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
        ]);
        setForms(f.data || []); setStreams(st.data || []); setStudents(s.data || []);
        setPayments(p.data || []); setStructures(fs.data || []); setTerms(t.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const currentTerm = terms.find(t => t.is_current);
    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';

    const getStudentFees = (studentId: number, formId?: number) => {
        const studentPays = payments.filter(p => p.student_id === studentId);
        const totalPaid = studentPays.reduce((s, p) => s + Number(p.amount || 0), 0);

        // Filter structures by form (include general + form-specific)
        const applicableFees = formId
            ? structures.filter(f => !f.form_id || f.form_id === formId)
            : structures;

        // Filter by current year — if no current year data, use most recent year
        const currentYear = new Date().getFullYear();
        let yearFiltered = applicableFees.filter(f => !f.year || f.year === currentYear);
        if (yearFiltered.length === 0 && applicableFees.length > 0) {
            // Fall back to most recent year available
            const maxYear = Math.max(...applicableFees.map(f => f.year || 0));
            yearFiltered = applicableFees.filter(f => !f.year || f.year === maxYear);
        }

        const termFees = yearFiltered.filter(f => currentTerm ? (!f.term_id || f.term_id === currentTerm.id) : true);
        const termTotal = termFees.reduce((s, f) => s + Number(f.amount || 0), 0);
        const annualTotal = yearFiltered.reduce((s, f) => s + Number(f.amount || 0), 0);
        return {
            totalPaid, termTotal, termBalance: Math.max(0, termTotal - totalPaid),
            annualTotal, annualBalance: Math.max(0, annualTotal - totalPaid),
            arrears: totalPaid < termTotal ? termTotal - totalPaid : 0,
            overpayment: totalPaid > annualTotal ? totalPaid - annualTotal : 0,
        };
    };

    return { forms, streams, students, payments, structures, terms, loading, fetchAll, currentTerm, getFormName, getStreamName, getStudentFees };
}
