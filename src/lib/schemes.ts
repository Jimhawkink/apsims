import { supabase } from './supabase';

// ════════════════════════════════════════════════════════════
// SCHEMES OF WORK — Supabase API Functions
// ════════════════════════════════════════════════════════════

// --- Types ---
export interface SchemeOfWork {
    id?: number;
    subject_id: number;
    form_id: number;
    term_id: number;
    teacher_id?: number | null;
    curriculum_type: 'CBC' | '8-4-4';
    strand_id?: number | null;
    sub_strand_id?: number | null;
    topic_id?: number | null;
    total_lessons?: number;
    total_weeks?: number;
    status?: string;
    approved_by?: string | null;
    approved_at?: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
    // Joined
    subject_name?: string;
    subject_code?: string;
    form_name?: string;
    term_name?: string;
    teacher_name?: string;
    strand_name?: string;
    sub_strand_name?: string;
    topic_name?: string;
}

export interface SchemeWeek {
    id?: number;
    scheme_id: number;
    week_number: number;
    week_title?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_holiday?: boolean;
    is_midterm?: boolean;
    notes?: string | null;
    created_at?: string;
}

export interface SchemeLesson {
    id?: number;
    week_id: number;
    scheme_id: number;
    lesson_number: number;
    lesson_title: string;
    sub_strand_id?: number | null;
    topic_id?: number | null;
    learning_outcomes?: string[];
    key_inquiry_questions?: string[];
    learning_activities?: string[];
    learning_resources?: string[];
    assessment_methods?: string[];
    core_competencies?: string[];
    values?: string[];
    links_to_other_subjects?: string[];
    community_service_learning?: string | null;
    non_formal_activity?: string | null;
    lesson_duration_minutes?: number;
    is_double_lesson?: boolean;
    is_completed?: boolean;
    completion_notes?: string | null;
    completed_at?: string | null;
    created_at?: string;
    updated_at?: string;
    // Joined
    sub_strand_name?: string;
    topic_name?: string;
}

export interface SchemeResource {
    id?: number;
    lesson_id: number;
    resource_type: string;
    resource_title: string;
    resource_details?: string | null;
    is_digital?: boolean;
    url?: string | null;
    created_at?: string;
}

export interface SchemeRemark {
    id?: number;
    scheme_id: number;
    week_id?: number | null;
    lesson_id?: number | null;
    remark_type?: string;
    remark_text: string;
    challenges?: string | null;
    improvements?: string | null;
    recorded_by?: string | null;
    created_at?: string;
}

// ════════════════════════════════════════════════════════════
// SCHEMES OF WORK (Headers)
// ════════════════════════════════════════════════════════════

export async function getSchemesOfWork(filters?: {
    subject_id?: number;
    form_id?: number;
    term_id?: number;
    status?: string;
    curriculum_type?: string;
}) {
    let query = supabase
        .from('school_schemes_of_work')
        .select(`
            *,
            school_subjects!inner(subject_name, subject_code),
            school_forms!inner(form_name),
            school_terms!inner(term_name),
            school_teachers(first_name, last_name),
            school_cbc_strands(strand_name),
            school_cbc_sub_strands(sub_strand_name),
            school_topics(topic_name)
        `)
        .order('created_at', { ascending: false });

    if (filters?.subject_id) query = query.eq('subject_id', filters.subject_id);
    if (filters?.form_id) query = query.eq('form_id', filters.form_id);
    if (filters?.term_id) query = query.eq('term_id', filters.term_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.curriculum_type) query = query.eq('curriculum_type', filters.curriculum_type);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((s: any) => ({
        ...s,
        subject_name: s.school_subjects?.subject_name,
        subject_code: s.school_subjects?.subject_code,
        form_name: s.school_forms?.form_name,
        term_name: s.school_terms?.term_name,
        teacher_name: s.school_teachers ? `${s.school_teachers.first_name} ${s.school_teachers.last_name}` : null,
        strand_name: s.school_cbc_strands?.strand_name,
        sub_strand_name: s.school_cbc_sub_strands?.sub_strand_name,
        topic_name: s.school_topics?.topic_name,
    })) as SchemeOfWork[];
}

export async function getSchemeById(id: number) {
    const { data, error } = await supabase
        .from('school_schemes_of_work')
        .select(`
            *,
            school_subjects!inner(subject_name, subject_code),
            school_forms!inner(form_name),
            school_terms!inner(term_name),
            school_teachers(first_name, last_name),
            school_cbc_strands(strand_name),
            school_cbc_sub_strands(sub_strand_name),
            school_topics(topic_name)
        `)
        .eq('id', id)
        .single();
    if (error) throw error;
    return {
        ...data,
        subject_name: data.school_subjects?.subject_name,
        subject_code: data.school_subjects?.subject_code,
        form_name: data.school_forms?.form_name,
        term_name: data.school_terms?.term_name,
        teacher_name: data.school_teachers ? `${data.school_teachers.first_name} ${data.school_teachers.last_name}` : null,
        strand_name: data.school_cbc_strands?.strand_name,
        sub_strand_name: data.school_cbc_sub_strands?.sub_strand_name,
        topic_name: data.school_topics?.topic_name,
    } as SchemeOfWork;
}

export async function createScheme(scheme: Omit<SchemeOfWork, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
        .from('school_schemes_of_work')
        .insert(scheme)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateScheme(id: number, updates: Partial<SchemeOfWork>) {
    const { data, error } = await supabase
        .from('school_schemes_of_work')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteScheme(id: number) {
    const { error } = await supabase.from('school_schemes_of_work').delete().eq('id', id);
    if (error) throw error;
}

// ════════════════════════════════════════════════════════════
// SCHEME WEEKS
// ════════════════════════════════════════════════════════════

export async function getSchemeWeeks(schemeId: number) {
    const { data, error } = await supabase
        .from('school_scheme_weeks')
        .select('*')
        .eq('scheme_id', schemeId)
        .order('week_number', { ascending: true });
    if (error) throw error;
    return data as SchemeWeek[];
}

export async function createSchemeWeeks(weeks: Omit<SchemeWeek, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
        .from('school_scheme_weeks')
        .insert(weeks)
        .select();
    if (error) throw error;
    return data;
}

export async function updateSchemeWeek(id: number, updates: Partial<SchemeWeek>) {
    const { data, error } = await supabase
        .from('school_scheme_weeks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ════════════════════════════════════════════════════════════
// SCHEME LESSONS
// ════════════════════════════════════════════════════════════

export async function getSchemeLessons(schemeId: number) {
    const { data, error } = await supabase
        .from('school_scheme_lessons')
        .select(`
            *,
            school_cbc_sub_strands(sub_strand_name),
            school_topics(topic_name)
        `)
        .eq('scheme_id', schemeId)
        .order('lesson_number', { ascending: true });
    if (error) throw error;
    return (data || []).map((l: any) => ({
        ...l,
        sub_strand_name: l.school_cbc_sub_strands?.sub_strand_name,
        topic_name: l.school_topics?.topic_name,
    })) as SchemeLesson[];
}

export async function getWeekLessons(weekId: number) {
    const { data, error } = await supabase
        .from('school_scheme_lessons')
        .select(`
            *,
            school_cbc_sub_strands(sub_strand_name),
            school_topics(topic_name)
        `)
        .eq('week_id', weekId)
        .order('lesson_number', { ascending: true });
    if (error) throw error;
    return (data || []).map((l: any) => ({
        ...l,
        sub_strand_name: l.school_cbc_sub_strands?.sub_strand_name,
        topic_name: l.school_topics?.topic_name,
    })) as SchemeLesson[];
}

export async function createSchemeLesson(lesson: Omit<SchemeLesson, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
        .from('school_scheme_lessons')
        .insert(lesson)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateSchemeLesson(id: number, updates: Partial<SchemeLesson>) {
    const { data, error } = await supabase
        .from('school_scheme_lessons')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteSchemeLesson(id: number) {
    const { error } = await supabase.from('school_scheme_lessons').delete().eq('id', id);
    if (error) throw error;
}

export async function bulkCreateLessons(lessons: Omit<SchemeLesson, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase
        .from('school_scheme_lessons')
        .insert(lessons)
        .select();
    if (error) throw error;
    return data;
}

// ════════════════════════════════════════════════════════════
// SCHEME RESOURCES
// ════════════════════════════════════════════════════════════

export async function getLessonResources(lessonId: number) {
    const { data, error } = await supabase
        .from('school_scheme_resources')
        .select('*')
        .eq('lesson_id', lessonId);
    if (error) throw error;
    return data as SchemeResource[];
}

export async function createSchemeResource(resource: Omit<SchemeResource, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('school_scheme_resources')
        .insert(resource)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteSchemeResource(id: number) {
    const { error } = await supabase.from('school_scheme_resources').delete().eq('id', id);
    if (error) throw error;
}

// ════════════════════════════════════════════════════════════
// SCHEME REMARKS
// ════════════════════════════════════════════════════════════

export async function getSchemeRemarks(schemeId: number) {
    const { data, error } = await supabase
        .from('school_scheme_remarks')
        .select('*')
        .eq('scheme_id', schemeId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data as SchemeRemark[];
}

export async function createSchemeRemark(remark: Omit<SchemeRemark, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('school_scheme_remarks')
        .insert(remark)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ════════════════════════════════════════════════════════════
// REFERENCE DATA HELPERS
// ════════════════════════════════════════════════════════════

export async function getSubjects() {
    const { data, error } = await supabase
        .from('school_subjects')
        .select('*')
        .eq('is_active', true)
        .order('subject_name');
    if (error) throw error;
    return data;
}

export async function getForms() {
    const { data, error } = await supabase
        .from('school_forms')
        .select('*')
        .order('form_level');
    if (error) throw error;
    return data;
}

export async function getTerms() {
    const { data, error } = await supabase
        .from('school_terms')
        .select('*')
        .order('year', { ascending: false });
    if (error) throw error;
    return data;
}

export async function getTeachers() {
    const { data, error } = await supabase
        .from('school_teachers')
        .select('id, first_name, last_name, tsc_number, subjects')
        .eq('status', 'Active')
        .order('last_name');
    if (error) throw error;
    return data;
}

export async function getStrands(learningAreaId?: number) {
    let query = supabase
        .from('school_cbc_strands')
        .select('*, school_cbc_learning_areas!inner(area_name)')
        .eq('is_active', true)
        .order('sort_order');
    if (learningAreaId) query = query.eq('learning_area_id', learningAreaId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function getSubStrands(strandId?: number) {
    let query = supabase
        .from('school_cbc_sub_strands')
        .select('*, school_cbc_strands!inner(strand_name)')
        .eq('is_active', true)
        .order('sort_order');
    if (strandId) query = query.eq('strand_id', strandId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function getTopics(subjectId?: number, formId?: number) {
    let query = supabase
        .from('school_topics')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
    if (subjectId) query = query.eq('subject_id', subjectId);
    if (formId) query = query.eq('form_id', formId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function getLearningAreas() {
    const { data, error } = await supabase
        .from('school_cbc_learning_areas')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
    if (error) throw error;
    return data;
}

// ════════════════════════════════════════════════════════════
// AUTO-GENERATE SCHEME FROM SYLLABUS
// ════════════════════════════════════════════════════════════

export async function autoGenerateScheme(params: {
    subjectId: number;
    formId: number;
    termId: number;
    curriculumType: 'CBC' | '8-4-4';
    teacherId?: number;
    createdBy?: string;
    strandId?: number;
    weeksCount?: number;
    lessonsPerWeek?: number;
}) {
    const { subjectId, formId, termId, curriculumType, teacherId, createdBy, strandId, weeksCount = 14, lessonsPerWeek = 3 } = params;

    // 1. Create the scheme header
    const scheme = await createScheme({
        subject_id: subjectId,
        form_id: formId,
        term_id: termId,
        teacher_id: teacherId || null,
        curriculum_type: curriculumType,
        strand_id: strandId || null,
        sub_strand_id: null,
        topic_id: null,
        total_lessons: weeksCount * lessonsPerWeek,
        total_weeks: weeksCount,
        status: 'Draft',
        created_by: createdBy || null,
    });

    // 2. Get syllabus content based on curriculum type
    let contentItems: any[] = [];
    if (curriculumType === 'CBC') {
        // Get sub-strands for this strand (or all strands for the subject's learning area)
        let strandFilter = strandId;
        if (!strandFilter) {
            // Try to find learning area matching this subject
            const { data: la } = await supabase
                .from('school_cbc_learning_areas')
                .select('id')
                .ilike('area_name', `%${(await supabase.from('school_subjects').select('subject_name').eq('id', subjectId).single()).data?.subject_name || ''}%`)
                .maybeSingle();
            if (la) {
                const { data: strands } = await supabase
                    .from('school_cbc_strands')
                    .select('id')
                    .eq('learning_area_id', la.id);
                if (strands?.length) {
                    const { data: ss } = await supabase
                        .from('school_cbc_sub_strands')
                        .select('*')
                        .in('strand_id', strands.map(s => s.id))
                        .eq('is_active', true)
                        .order('sort_order');
                    contentItems = ss || [];
                }
            }
        } else {
            const { data: ss } = await supabase
                .from('school_cbc_sub_strands')
                .select('*')
                .eq('strand_id', strandFilter)
                .eq('is_active', true)
                .order('sort_order');
            contentItems = ss || [];
        }
    } else {
        // 8-4-4: Get topics for this subject and form
        const { data: topics } = await supabase
            .from('school_topics')
            .select('*')
            .eq('subject_id', subjectId)
            .eq('form_id', formId)
            .eq('is_active', true)
            .order('sort_order');
        contentItems = (topics || []).map(t => ({ ...t, sub_strand_name: t.topic_name }));
    }

    // 3. Create weeks
    const weeks: Omit<SchemeWeek, 'id' | 'created_at'>[] = [];
    for (let w = 1; w <= weeksCount; w++) {
        const isMidterm = w === Math.ceil(weeksCount / 2);
        const item = contentItems[(w - 1) % contentItems.length];
        weeks.push({
            scheme_id: scheme.id,
            week_number: w,
            week_title: isMidterm ? 'Mid-Term Break' : (item?.sub_strand_name || item?.topic_name || `Week ${w}`),
            is_holiday: false,
            is_midterm: isMidterm,
        });
    }
    const createdWeeks = await createSchemeWeeks(weeks);

    // 4. Create lessons for each week
    const allLessons: Omit<SchemeLesson, 'id' | 'created_at' | 'updated_at'>[] = [];
    let lessonNum = 1;
    for (const week of createdWeeks) {
        if (week.is_midterm) continue;
        const weekItem = contentItems[(week.week_number - 1) % contentItems.length];
        for (let l = 1; l <= lessonsPerWeek; l++) {
            const lessonTitles = ['Introduction & Exploration', 'Practice & Application', 'Assessment & Review'];
            allLessons.push({
                week_id: week.id!,
                scheme_id: scheme.id!,
                lesson_number: lessonNum++,
                lesson_title: `${weekItem?.sub_strand_name || week.week_title || 'Topic'} — ${lessonTitles[l - 1] || `Lesson ${l}`}`,
                sub_strand_id: curriculumType === 'CBC' ? (weekItem?.id || null) : null,
                topic_id: curriculumType === '8-4-4' ? (weekItem?.id || null) : null,
                learning_outcomes: [`By the end of the lesson, the learner should be able to: understand ${weekItem?.sub_strand_name || 'the topic'}`],
                key_inquiry_questions: [`What is ${weekItem?.sub_strand_name || 'this topic'}?`, `How does it apply in real life?`],
                learning_activities: ['Group discussion', 'Teacher demonstration', 'Practice exercises'],
                learning_resources: ['Textbook', 'Charts', 'Exercise book'],
                assessment_methods: ['Observation', 'Oral questions', 'Written exercise'],
                core_competencies: ['Communication', 'Critical Thinking'],
                values: ['Responsibility', 'Integrity'],
                links_to_other_subjects: [],
                lesson_duration_minutes: 40,
            });
        }
    }
    if (allLessons.length > 0) {
        await bulkCreateLessons(allLessons);
    }

    return scheme;
}
