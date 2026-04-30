import { supabase } from './supabase';

// ════════════════════════════════════════════════════════════
// SCHEMES OF WORK — Ultra Complete Supabase API
// KICD/MoE Official Format · CBC + 8-4-4 · Clone · Approve · Export
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
    status?: string; // Draft | Active | HOD Review | Approved | Completed | Archived
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
            school_terms!inner(term_name, year),
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
            school_terms!inner(term_name, year, term_number),
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
// CLONE SCHEME
// ════════════════════════════════════════════════════════════

export async function cloneScheme(schemeId: number, newTermId: number, newCreatedBy: string) {
    // 1. Get original scheme
    const original = await getSchemeById(schemeId);
    const [origWeeks, origLessons] = await Promise.all([
        getSchemeWeeks(schemeId),
        getSchemeLessons(schemeId),
    ]);

    // 2. Create new scheme header
    const { id: _oldId, created_at: _ca, updated_at: _ua, subject_name: _sn, subject_code: _sc, form_name: _fn, term_name: _tn, teacher_name: _tchr, strand_name: _strn, sub_strand_name: _ssn, topic_name: _tpn, ...rest } = original as any;
    const newScheme = await createScheme({
        ...rest,
        term_id: newTermId,
        status: 'Draft',
        approved_by: null,
        approved_at: null,
        created_by: newCreatedBy,
    });

    // 3. Clone weeks
    const weekIdMap: Record<number, number> = {};
    for (const w of origWeeks) {
        const { id, created_at, ...wData } = w;
        const newW = await createSchemeWeeks([{ ...wData, scheme_id: newScheme.id! }]);
        if (newW[0]) weekIdMap[id!] = newW[0].id!;
    }

    // 4. Clone lessons
    const newLessons: Omit<SchemeLesson, 'id' | 'created_at' | 'updated_at'>[] = [];
    for (const l of origLessons) {
        const { id, created_at, updated_at, sub_strand_name, topic_name, ...lData } = l;
        newLessons.push({
            ...lData,
            scheme_id: newScheme.id!,
            week_id: weekIdMap[l.week_id] || l.week_id,
            is_completed: false,
            completion_notes: null,
            completed_at: null,
        });
    }
    if (newLessons.length > 0) await bulkCreateLessons(newLessons);

    return newScheme;
}

// ════════════════════════════════════════════════════════════
// HOD APPROVAL WORKFLOW
// ════════════════════════════════════════════════════════════

export async function submitForApproval(schemeId: number) {
    return updateScheme(schemeId, { status: 'HOD Review' });
}

export async function approveScheme(schemeId: number, approverName: string) {
    return updateScheme(schemeId, {
        status: 'Approved',
        approved_by: approverName,
        approved_at: new Date().toISOString(),
    });
}

export async function rejectScheme(schemeId: number) {
    return updateScheme(schemeId, { status: 'Draft' });
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

export async function getSchoolDetails() {
    const { data, error } = await supabase
        .from('school_details')
        .select('*')
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data;
}

// ════════════════════════════════════════════════════════════
// SMART AUTO-GENERATE FROM SYLLABUS
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
    let firstStrandId: number | null = strandId || null;
    let firstTopicId: number | null = null;

    // Subject name to learning area name mapping (subject_name -> learning_area_name)
    const subjectToArea: Record<string, string> = {
        'Mathematics': 'Mathematics', 'English': 'English', 'Kiswahili': 'Kiswahili',
        'Integrated Science': 'Integrated Science', 'Social Studies': 'Social Studies',
        'Health Education': 'Health Education', 'Pre-Technical Studies': 'Pre-Technical Studies',
        'Creative Arts & Sports': 'Creative Arts & Sports', 'Religious Education': 'Religious Education',
        'Life Skills Education': 'Life Skills Education',
        'Agriculture': 'Pre-Technical Studies', 'Home Science': 'Pre-Technical Studies',
        'Physics': 'Integrated Science', 'Chemistry': 'Integrated Science', 'Biology': 'Integrated Science',
        'History & Government': 'Social Studies', 'Geography': 'Social Studies',
        'Business Studies': 'Pre-Technical Studies', 'Computer Studies': 'Pre-Technical Studies',
        'Art & Design': 'Creative Arts & Sports', 'Music': 'Creative Arts & Sports',
        'Physical Education': 'Creative Arts & Sports',
        'Christian Religious Education': 'Religious Education', 'Islamic Religious Education': 'Religious Education',
        'Hindu Religious Education': 'Religious Education',
    };

    if (curriculumType === 'CBC') {
        // Smart mapping: find learning area matching subject
        const { data: subj } = await supabase.from('school_subjects').select('subject_name').eq('id', subjectId).single();
        const subjectName = subj?.subject_name || '';
        const areaName = subjectToArea[subjectName] || subjectName;

        const { data: la } = await supabase
            .from('school_cbc_learning_areas')
            .select('id')
            .ilike('area_name', `%${areaName}%`)
            .maybeSingle();

        if (la || strandId) {
            const strandFilter = strandId ? [strandId] :
                la ? (await supabase.from('school_cbc_strands').select('id, strand_name').eq('learning_area_id', la.id).order('sort_order')).data?.map(s => s.id) || [] : [];

            // Store first strand id for the scheme header
            if (!firstStrandId && strandFilter.length > 0) firstStrandId = strandFilter[0];

            if (strandFilter.length > 0) {
                const { data: ss } = await supabase
                    .from('school_cbc_sub_strands')
                    .select('*')
                    .in('strand_id', strandFilter)
                    .eq('is_active', true)
                    .order('sort_order');
                contentItems = ss || [];
            }
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
        if (contentItems.length > 0) firstTopicId = contentItems[0].id;
    }

    // 2b. Update scheme header with strand/topic if found
    if (firstStrandId || firstTopicId) {
        await supabase.from('school_schemes_of_work').update({
            strand_id: firstStrandId,
            topic_id: firstTopicId,
        }).eq('id', scheme.id!);
    }

    // 3. Distribute content items sequentially across teaching weeks
    // Each topic/strand gets a block of consecutive weeks before moving to the next
    const teachingWeeks = weeksCount - 1; // minus mid-term
    const itemCount = Math.max(contentItems.length, 1);
    const weeksPerItem = Math.max(1, Math.floor(teachingWeeks / itemCount));
    // Build a map: weekNumber -> contentItem (sequential blocks)
    const weekContentMap = new Map<number, any>();
    let teachingWeekIdx = 0;
    for (let i = 0; i < itemCount; i++) {
        const startWeek = i * weeksPerItem + 1;
        for (let w = startWeek; w < startWeek + weeksPerItem && teachingWeekIdx < teachingWeeks; w++) {
            // Skip mid-term week
            const actualWeek = w >= Math.ceil(weeksCount / 2) ? w + 1 : w;
            if (actualWeek > weeksCount) break;
            weekContentMap.set(actualWeek, contentItems[i]);
            teachingWeekIdx++;
        }
    }
    // Fill any remaining weeks with the last item
    for (let w = 1; w <= weeksCount; w++) {
        if (!weekContentMap.has(w) && w !== Math.ceil(weeksCount / 2)) {
            weekContentMap.set(w, contentItems[itemCount - 1]);
        }
    }

    // 3b. Create weeks
    const weeks: Omit<SchemeWeek, 'id' | 'created_at'>[] = [];
    const midTermWeek = Math.ceil(weeksCount / 2);
    for (let w = 1; w <= weeksCount; w++) {
        const isMid = w === midTermWeek;
        const item = weekContentMap.get(w);
        weeks.push({
            scheme_id: scheme.id!,
            week_number: w,
            week_title: isMid ? 'Mid-Term Break' : (item?.sub_strand_name || item?.topic_name || `Week ${w}`),
            is_holiday: false,
            is_midterm: isMid,
        });
    }
    const createdWeeks = await createSchemeWeeks(weeks);

    // 4. Create lessons for each non-midterm week — KICD 9-column format
    // Subject-category-aware content pools
    const subjectName = (await supabase.from('school_subjects').select('subject_name').eq('id', subjectId).single()).data?.subject_name || '';
    const sn = subjectName.toLowerCase();
    const isScience = /physics|chemistry|biology|agriculture|home\s*science|integrated\s*science|science/i.test(sn);
    const isMath = /mathematic|maths/i.test(sn);
    const isLanguage = /english|kiswahili|french|german|arabic|music|language|literature/i.test(sn);
    const isHumanities = /religious|religion|cre|ire|hre|history|government|geography|social\s*stud|life\s*skill|citizenship/i.test(sn);
    const isTech = /pre-technical|technical|business|computer|entrepreneurship/i.test(sn);
    const isArts = /creative\s*art|art\s*&\s*design|physical\s*edu|sports|drama|theatre/i.test(sn);

    const ACTIVITY_POOL = isScience ? [
        ['Think-pair-share', 'Teacher demonstration', 'Observation'],
        ['Group discussion', 'Hypothesis formulation', 'Note-taking'],
        ['Brainstorming', 'Concept mapping', 'Video observation'],
        ['Laboratory experiment', 'Practical investigation', 'Data collection'],
        ['Guided practice', 'Problem solving', 'Experiment write-up'],
        ['Peer teaching', 'Jigsaw reading', 'Research presentation'],
        ['Field study', 'Specimen collection', 'Data analysis'],
        ['Debate', 'Panel discussion', 'Socratic seminar'],
        ['Drawing & labelling', 'Model making', 'Chart interpretation'],
        ['Written exercise', 'Oral drill', 'Comprehension passage'],
    ] : isMath ? [
        ['Think-pair-share', 'Teacher demonstration', 'Mental maths'],
        ['Group discussion', 'Problem solving', 'Note-taking'],
        ['Brainstorming', 'Concept mapping', 'Video observation'],
        ['Guided practice', 'Individual practice', 'Peer tutoring'],
        ['Mathematical investigation', 'Discovery learning', 'Data collection'],
        ['Peer teaching', 'Jigsaw reading', 'Research presentation'],
        ['Project work', 'Real-world application', 'Data analysis'],
        ['Debate', 'Panel discussion', 'Socratic seminar'],
        ['Drawing & labelling', 'Model making', 'Graph plotting'],
        ['Written exercise', 'Oral drill', 'Revision quiz'],
    ] : isLanguage ? [
        ['Think-pair-share', 'Teacher read-aloud', 'Listening comprehension'],
        ['Group discussion', 'Role play', 'Note-taking'],
        ['Brainstorming', 'Concept mapping', 'Video observation'],
        ['Guided reading', 'Silent reading', 'Peer reading'],
        ['Creative writing', 'Essay writing', 'Letter writing'],
        ['Peer teaching', 'Jigsaw reading', 'Research presentation'],
        ['Oral presentation', 'Debate', 'Dramatization'],
        ['Grammar drill', 'Vocabulary building', 'Spelling practice'],
        ['Drawing & labelling', 'Comprehension passage', 'Summary writing'],
        ['Written exercise', 'Oral drill', 'Dictation'],
    ] : isHumanities ? [
        ['Think-pair-share', 'Q&A session', 'Teacher exposition'],
        ['Group discussion', 'Case study analysis', 'Note-taking'],
        ['Brainstorming', 'Concept mapping', 'Video observation'],
        ['Role play', 'Simulation', 'Storytelling'],
        ['Source analysis', 'Document study', 'Map work'],
        ['Peer teaching', 'Jigsaw reading', 'Research presentation'],
        ['Guided practice', 'Problem solving', 'Project work'],
        ['Debate', 'Panel discussion', 'Socratic seminar'],
        ['Drawing & labelling', 'Model making', 'Chart interpretation'],
        ['Written exercise', 'Oral drill', 'Comprehension passage'],
    ] : isArts ? [
        ['Think-pair-share', 'Teacher demonstration', 'Observation'],
        ['Group discussion', 'Appreciation', 'Note-taking'],
        ['Brainstorming', 'Concept mapping', 'Video observation'],
        ['Practical activity', 'Performance', 'Rehearsal'],
        ['Drawing & painting', 'Sculpture', 'Craft work'],
        ['Peer teaching', 'Jigsaw reading', 'Research presentation'],
        ['Guided practice', 'Creative expression', 'Portfolio development'],
        ['Debate', 'Critique session', 'Socratic seminar'],
        ['Model making', 'Chart interpretation', 'Exhibition'],
        ['Written exercise', 'Oral drill', 'Reflection journal'],
    ] : [ // Tech / default
        ['Think-pair-share', 'Q&A session', 'Teacher demonstration'],
        ['Group discussion', 'Case study analysis', 'Note-taking'],
        ['Brainstorming', 'Concept mapping', 'Video observation'],
        ['Practical activity', 'Hands-on practice', 'Simulation'],
        ['Project work', 'Entrepreneurship activity', 'Data collection'],
        ['Peer teaching', 'Jigsaw reading', 'Research presentation'],
        ['Guided practice', 'Problem solving', 'Design thinking'],
        ['Debate', 'Panel discussion', 'Socratic seminar'],
        ['Drawing & labelling', 'Model making', 'Chart interpretation'],
        ['Written exercise', 'Oral drill', 'Comprehension passage'],
    ];

    const RESOURCE_POOL = isScience ? [
        ['Textbook', 'Charts', 'Specimens'],
        ['Reference book', 'Wall charts', 'Samples'],
        ['Video clips', 'Digital simulation', 'Internet resources'],
        ['Worksheet', 'Exercise book', 'Graph paper'],
        ['Laboratory apparatus', 'Chemicals/reagents', 'Safety gear'],
        ['Past papers', 'Revision guide', 'Marking scheme'],
        ['Microscope', 'Slides', 'Dissection kit'],
        ['Calculator', 'Measuring instruments', 'Data loggers'],
        ['Bunsen burner', 'Beakers', 'Test tubes'],
        ['Chalkboard', 'Projector', 'Handouts'],
    ] : isMath ? [
        ['Textbook', 'Charts', 'Graph paper'],
        ['Reference book', 'Wall charts', 'Number cards'],
        ['Video clips', 'Digital simulation', 'Internet resources'],
        ['Worksheet', 'Exercise book', 'Graph paper'],
        ['Calculator', 'Mathematical sets', 'Rulers'],
        ['Past papers', 'Revision guide', 'Marking scheme'],
        ['Geometrical instruments', 'Protractor', 'Compass'],
        ['Number line', 'Place value charts', 'Fraction strips'],
        ['Counters', 'Beads', 'Abacus'],
        ['Chalkboard', 'Projector', 'Handouts'],
    ] : isLanguage ? [
        ['Textbook', 'Charts', 'Flash cards'],
        ['Reader/Novel', 'Dictionary', 'Thesaurus'],
        ['Video clips', 'Audio recordings', 'Internet resources'],
        ['Worksheet', 'Exercise book', 'Writing paper'],
        ['Past papers', 'Revision guide', 'Marking scheme'],
        ['Sentence strips', 'Word cards', 'Phonics charts'],
        ['Story books', 'Poetry anthology', 'Newspapers'],
        ['Grammar book', 'Composition book', 'Journal'],
        ['Chalkboard', 'Projector', 'Handouts'],
        ['Realia', 'Pictures', 'Posters'],
    ] : isHumanities ? [
        ['Textbook', 'Charts', 'Maps'],
        ['Reference book', 'Wall maps', 'Globe'],
        ['Video clips', 'Documentary', 'Internet resources'],
        ['Worksheet', 'Exercise book', 'Source documents'],
        ['Past papers', 'Revision guide', 'Marking scheme'],
        ['Atlas', 'Globe', 'Topographical maps'],
        ['Bible/Quran', 'Religious texts', 'Commentary'],
        ['Timeline', 'Artifacts', 'Photographs'],
        ['Chalkboard', 'Projector', 'Handouts'],
        ['Pictures', 'Posters', 'Realia'],
    ] : isArts ? [
        ['Textbook', 'Charts', 'Pictures'],
        ['Drawing paper', 'Crayons', 'Paint'],
        ['Video clips', 'Audio recordings', 'Internet resources'],
        ['Worksheet', 'Exercise book', 'Sketch pad'],
        ['Past papers', 'Revision guide', 'Marking scheme'],
        ['Musical instruments', 'Score sheets', 'CD player'],
        ['Clay', 'Cardboard', 'Scissors'],
        ['Sports equipment', 'Playing field', 'First aid kit'],
        ['Chalkboard', 'Projector', 'Handouts'],
        ['Costumes', 'Props', 'Stage'],
    ] : [ // Tech / default
        ['Textbook', 'Charts', 'Realia'],
        ['Reference book', 'Wall maps', 'Specimens'],
        ['Video clips', 'Digital simulation', 'Internet resources'],
        ['Worksheet', 'Exercise book', 'Graph paper'],
        ['Computer', 'Software', 'Printer'],
        ['Past papers', 'Revision guide', 'Marking scheme'],
        ['Tools', 'Materials', 'Safety equipment'],
        ['Calculator', 'Business forms', 'Ledgers'],
        ['Chalkboard', 'Projector', 'Handouts'],
        ['Drawing instruments', 'Tracing paper', 'Templates'],
    ];
    const ASSESS_POOL = isScience ? [
        ['Observation schedule', 'Oral questions', 'Checklist'],
        ['Written exercise', 'Take-home assignment', 'Marking scheme'],
        ['Practical assessment', 'Lab report', 'Skill rating'],
        ['Oral quiz', 'Written test', 'Peer assessment'],
        ['Project evaluation', 'Rubric scoring', 'Experiment assessment'],
        ['Self-assessment', 'Group assessment', 'Rating scale'],
    ] : isMath ? [
        ['Observation schedule', 'Oral questions', 'Checklist'],
        ['Written exercise', 'Take-home assignment', 'Marking scheme'],
        ['Mental maths test', 'Problem-solving test', 'Skill rating'],
        ['Oral quiz', 'Written test', 'Peer assessment'],
        ['Project evaluation', 'Rubric scoring', 'Portfolio review'],
        ['Self-assessment', 'Group assessment', 'Rating scale'],
    ] : isLanguage ? [
        ['Observation schedule', 'Oral questions', 'Checklist'],
        ['Written exercise', 'Take-home assignment', 'Marking scheme'],
        ['Oral presentation', 'Reading aloud', 'Listening comprehension'],
        ['Oral quiz', 'Written test', 'Peer assessment'],
        ['Essay assessment', 'Rubric scoring', 'Portfolio review'],
        ['Self-assessment', 'Group assessment', 'Dictation'],
    ] : isHumanities ? [
        ['Observation schedule', 'Oral questions', 'Checklist'],
        ['Written exercise', 'Take-home assignment', 'Marking scheme'],
        ['Essay writing', 'Source analysis', 'Document review'],
        ['Oral quiz', 'Written test', 'Peer assessment'],
        ['Project evaluation', 'Rubric scoring', 'Portfolio review'],
        ['Self-assessment', 'Group assessment', 'Rating scale'],
    ] : isArts ? [
        ['Observation schedule', 'Oral questions', 'Checklist'],
        ['Written exercise', 'Take-home assignment', 'Marking scheme'],
        ['Practical assessment', 'Performance review', 'Skill rating'],
        ['Oral quiz', 'Written test', 'Peer assessment'],
        ['Project evaluation', 'Rubric scoring', 'Portfolio review'],
        ['Self-assessment', 'Group assessment', 'Exhibition assessment'],
    ] : [ // Tech / default
        ['Observation schedule', 'Oral questions', 'Checklist'],
        ['Written exercise', 'Take-home assignment', 'Marking scheme'],
        ['Practical assessment', 'Project assessment', 'Skill rating'],
        ['Oral quiz', 'Written test', 'Peer assessment'],
        ['Project evaluation', 'Rubric scoring', 'Portfolio review'],
        ['Self-assessment', 'Group assessment', 'Rating scale'],
    ];
    const COMPETENCY_POOL = [
        ['Communication & Collaboration', 'Critical Thinking & Problem Solving'],
        ['Creativity & Imagination', 'Self-Efficacy'],
        ['Digital Literacy', 'Learning to Learn'],
        ['Citizenship', 'Critical Thinking & Problem Solving'],
        ['Communication & Collaboration', 'Creativity & Imagination'],
    ];
    const VALUE_POOL = [
        ['Love', 'Responsibility'], ['Respect', 'Unity'], ['Peace', 'Integrity'],
        ['Patriotism', 'Responsibility'], ['Love', 'Respect'],
    ];
    const OUTCOME_TEMPLATES = [
        (t: string, ln: number, _p: number) => {
            const O = [
                `define key terms used in ${t}`, `describe the main features of ${t}`,
                `identify characteristics of ${t}`, `outline the background of ${t}`,
                `explain the principles of ${t}`, `give examples of ${t}`,
                `illustrate how ${t} operates`, `demonstrate understanding of ${t}`,
                `analyse the components of ${t}`, `classify different types of ${t}`,
                `compare and contrast aspects of ${t}`, `evaluate the significance of ${t}`,
                `critically examine ${t}`, `discuss the impact of ${t}`,
                `differentiate perspectives on ${t}`, `justify the importance of ${t}`,
                `apply knowledge of ${t} to new situations`, `propose solutions related to ${t}`,
                `relate ${t} to real-life contexts`, `synthesize information about ${t}`,
                `appraise the relevance of ${t}`, `draw conclusions about ${t}`,
                `recommend improvements for ${t}`, `summarize key points about ${t}`,
                `trace the origin and development of ${t}`, `interpret data or evidence related to ${t}`,
                `predict outcomes related to ${t}`, `construct arguments about ${t}`,
                `assess the validity of claims about ${t}`, `formulate hypotheses about ${t}`,
                `design approaches to investigate ${t}`, `select appropriate methods for studying ${t}`,
                `organize information about ${t} logically`, `represent ${t} using diagrams or models`,
                `verify claims about ${t} using evidence`, `debate different viewpoints on ${t}`,
                `reflect on personal understanding of ${t}`, `communicate findings about ${t} clearly`,
                `collaborate with others to explore ${t}`, `create original work inspired by ${t}`,
            ];
            const i = ((ln - 1) * 7) % O.length; // stride 7 (coprime to 40) for max spread
            return [O[i], O[(i + 1) % O.length]];
        },
    ];
    const INQUIRY_TEMPLATES = [
        (t: string, ln: number, _p: number) => {
            const Q = [
                `What is ${t}?`, `Why is ${t} important?`,
                `How is ${t} defined?`, `Where is ${t} found?`,
                `How does ${t} work?`, `What are the effects of ${t}?`,
                `What happens when ${t} changes?`, `What are the steps in ${t}?`,
                `What factors affect ${t}?`, `How is ${t} applied in everyday life?`,
                `What are the strengths of ${t}?`, `What are the limitations of ${t}?`,
                `What are the advantages and disadvantages of ${t}?`, `How can we improve ${t}?`,
                `What challenges are associated with ${t}?`, `What alternatives exist for ${t}?`,
                `What is the relationship between ${t} and other concepts?`, `How does ${t} connect to real life?`,
                `What innovations exist in ${t}?`, `How can ${t} be adapted?`,
                `How do we measure or evaluate ${t}?`, `What have we learned about ${t}?`,
                `Why should we care about ${t}?`, `What questions remain about ${t}?`,
                `Who contributed to the development of ${t}?`, `When did ${t} become significant?`,
                `What evidence supports claims about ${t}?`, `How would you test ideas about ${t}?`,
                `What patterns do you notice in ${t}?`, `What would happen if ${t} did not exist?`,
                `How do different communities view ${t}?`, `What role does ${t} play in society?`,
                `How has understanding of ${t} changed over time?`, `What biases might affect how we see ${t}?`,
                `What are the ethical considerations in ${t}?`, `How can technology enhance ${t}?`,
                `What assumptions underlie ${t}?`, `How does ${t} interact with the environment?`,
                `What are the future prospects for ${t}?`, `How can individuals contribute to ${t}?`,
            ];
            const i = ((ln - 1) * 7) % Q.length;
            return [Q[i], Q[(i + 1) % Q.length]];
        },
    ];

    const allLessons: Omit<SchemeLesson, 'id' | 'created_at' | 'updated_at'>[] = [];
    let lessonNum = 1;
    for (const week of createdWeeks) {
        if (week.is_midterm) continue;
        const weekItem = weekContentMap.get(week.week_number) || contentItems[0];
        const title = weekItem?.sub_strand_name || weekItem?.topic_name || week.week_title || 'Topic';
        const wIdx = (week.week_number - 1) % ACTIVITY_POOL.length;

        for (let l = 1; l <= lessonsPerWeek; l++) {
            const phaseNames = [
                'Introduction & Exploration', 'Practice & Application', 'Assessment & Review',
                'Deepening Understanding', 'Creative Application', 'Extension & Reflection',
                'Consolidation', 'Critical Analysis', 'Synthesis & Evaluation',
            ];
            const phase = phaseNames[(lessonNum - 1) % phaseNames.length];
            const lIdx = (l - 1);
            const idx = (lessonNum - 1); // unique global index — no repeats

            // Rich varied content per lesson (unique across all weeks)
            const outcomeTpl = OUTCOME_TEMPLATES[0];
            const inquiryTpl = INQUIRY_TEMPLATES[0];
            const outcomes = outcomeTpl(title, lessonNum, lIdx).map(o => `By the end of the lesson, the learner should be able to ${o}`);
            const inquiries = inquiryTpl(title, lessonNum, lIdx);
            const activities = ACTIVITY_POOL[idx % ACTIVITY_POOL.length];
            const resources = RESOURCE_POOL[idx % RESOURCE_POOL.length];
            const assessments = ASSESS_POOL[idx % ASSESS_POOL.length];
            const competencies = COMPETENCY_POOL[idx % COMPETENCY_POOL.length];
            const values = VALUE_POOL[idx % VALUE_POOL.length];
            const csl = l === 2 ? `Community project related to ${title}` : null;
            const nonFormal = l === 1 ? `Club activity or debate on ${title}` : null;
            const links = l === 3 ? [`Mathematics (calculations in ${title})`, `English (terminology in ${title})`] : [];

            allLessons.push({
                week_id: week.id!,
                scheme_id: scheme.id!,
                lesson_number: lessonNum++,
                lesson_title: `${title} — ${phase}`,
                sub_strand_id: curriculumType === 'CBC' ? (weekItem?.id || null) : null,
                topic_id: curriculumType === '8-4-4' ? (weekItem?.id || null) : null,
                learning_outcomes: outcomes,
                key_inquiry_questions: inquiries,
                learning_activities: activities,
                learning_resources: resources,
                assessment_methods: assessments,
                core_competencies: competencies,
                values: values,
                links_to_other_subjects: links,
                community_service_learning: csl,
                non_formal_activity: nonFormal,
                lesson_duration_minutes: 40,
                is_double_lesson: false,
                is_completed: false,
                completion_notes: null,
                completed_at: null,
            });
        }
    }
    if (allLessons.length > 0) await bulkCreateLessons(allLessons);

    return scheme;
}
