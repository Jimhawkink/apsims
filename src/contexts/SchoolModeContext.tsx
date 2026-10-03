'use client';
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  APSIMS School Mode Context — Primary ↔ Secondary Engine    ║
 * ║  Section is 100% DB-driven — NO user toggling ever          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * userSection comes from school_users.school_section in the DB:
 *  'primary'   → only sees Primary Hub + shared modules + primary forms
 *  'secondary' → only sees Secondary modules + secondary forms
 *  'both'      → Admin/Principal — sees ALL modules + ALL forms
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type SchoolMode    = 'primary' | 'secondary';
export type SchoolSection = 'primary' | 'secondary' | 'both';

export interface SchoolForm {
    id:          number;
    form_name:   string;
    form_level:  number;
    section:     string;  // 'primary' | 'secondary'
    description?: string;
    is_active?:  boolean;
}

interface SchoolModeContextValue {
    /** Derived from userSection — 'both' maps to 'secondary' for pages needing a binary */
    mode: SchoolMode;
    /** User's section from DB */
    userSection: SchoolSection;
    /** Forms for the current section */
    forms: SchoolForm[];
    /** ALL forms regardless of section */
    allForms: SchoolForm[];
    /** Primary forms only */
    primaryForms: SchoolForm[];
    /** Secondary forms only */
    secondaryForms: SchoolForm[];
    /** No-op — section is DB-only, never toggled by users */
    switchMode: () => void;
    /** Internal — set by layout after DB login */
    setUserSection: (s: SchoolSection) => void;
    formsLoading: boolean;
}

const SchoolModeContext = createContext<SchoolModeContextValue>({
    mode:           'secondary',
    userSection:    'secondary',
    forms:          [],
    allForms:       [],
    primaryForms:   [],
    secondaryForms: [],
    switchMode:     () => {},
    setUserSection: () => {},
    formsLoading:   true,
});

export function SchoolModeProvider({
    children,
    userSection: initialSection = 'secondary',
}: {
    children: React.ReactNode;
    userSection?: SchoolSection;
}) {
    const [userSection, setUserSection] = useState<SchoolSection>(initialSection);
    const [allForms, setAllForms]       = useState<SchoolForm[]>([]);
    const [formsLoading, setFormsLoading] = useState(true);

    // When layout updates section from DB login, sync it
    useEffect(() => {
        setUserSection(initialSection);
    }, [initialSection]);

    // Load ALL forms from DB once
    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('school_forms')
                .select('*')
                .order('form_level');
            setAllForms(data || []);
            setFormsLoading(false);
        };
        load();
    }, []);

    const handleSetUserSection = useCallback((s: SchoolSection) => {
        setUserSection(s);
    }, []);

    const primaryForms   = allForms.filter(f => f.section === 'primary');
    const secondaryForms = allForms.filter(f => f.section !== 'primary');

    // 'both' (Admin/Principal) → ALL forms
    // 'primary' → only primary forms
    // 'secondary' → only secondary forms
    const forms =
        userSection === 'both'    ? allForms :
        userSection === 'primary' ? primaryForms :
                                    secondaryForms;

    // mode: binary derived from section ('both' → secondary for backward compat)
    const mode: SchoolMode = userSection === 'primary' ? 'primary' : 'secondary';

    return (
        <SchoolModeContext.Provider value={{
            mode,
            userSection,
            forms,
            allForms,
            primaryForms,
            secondaryForms,
            switchMode:     () => {}, // no-op — DB-driven only
            setUserSection: handleSetUserSection,
            formsLoading,
        }}>
            {children}
        </SchoolModeContext.Provider>
    );
}

/** Hook — use in any page to get section-filtered forms and mode */
export function useSchoolMode() {
    return useContext(SchoolModeContext);
}

/** Convenience hook alias */
export function useSchoolForms() {
    return useContext(SchoolModeContext);
}
