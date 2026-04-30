'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function useIdCardData() {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>(null);
    const [templates, setTemplates] = useState<any[]>([]);
    const [issuedCards, setIssuedCards] = useState<any[]>([]);
    const [lostCards, setLostCards] = useState<any[]>([]);
    const [visitorCards, setVisitorCards] = useState<any[]>([]);
    const [busPasses, setBusPasses] = useState<any[]>([]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, t, f, st, sd, tpl, ic, lc, vc, bp] = await Promise.all([
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_teachers').select('*').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_details').select('*').limit(1).maybeSingle(),
            supabase.from('school_id_card_templates').select('*').order('template_name'),
            supabase.from('school_id_cards').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('school_id_card_losses').select('*').order('created_at', { ascending: false }).limit(200),
            supabase.from('school_visitor_cards').select('*').order('created_at', { ascending: false }).limit(200),
            supabase.from('school_bus_pass_cards').select('*').order('created_at', { ascending: false }),
        ]);
        setStudents(s.data || []);
        setStaff(t.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSchoolDetails(sd.data);
        setTemplates(tpl.data || []);
        setIssuedCards(ic.data || []);
        setLostCards(lc.data || []);
        setVisitorCards(vc.data || []);
        setBusPasses(bp.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = useCallback((id: number | null) => id ? forms.find(f => f.id === id)?.form_name || '-' : '-', [forms]);
    const getStreamName = useCallback((id: number | null) => id ? streams.find(s => s.id === id)?.stream_name || '-' : '-', [streams]);

    const generateCardNumber = (prefix: string = 'APS') => {
        const num = Math.floor(100000 + Math.random() * 900000);
        return `${prefix}-${new Date().getFullYear()}-${num}`;
    };

    const generateQRData = (person: any, type: string) => {
        return JSON.stringify({ type, id: person.id, name: `${person.first_name} ${person.last_name}`, adm: person.admission_no || person.admission_number || person.tsc_number || '', school: schoolDetails?.school_name || 'Alpha School' });
    };

    return {
        loading, students, staff, forms, streams, schoolDetails, templates, issuedCards,
        lostCards, visitorCards, busPasses, fetchAll, getFormName, getStreamName,
        generateCardNumber, generateQRData,
    };
}
