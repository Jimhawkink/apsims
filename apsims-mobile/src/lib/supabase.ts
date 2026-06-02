import { createClient } from '@supabase/supabase-js';

// ============================================================
// ULTRA APSIMS MOBILE APP — SUPABASE CONFIGURATION
// Same Supabase instance as the AlphaSchool web app
// ============================================================

const SUPABASE_URL = 'https://enlqpifpxuecxxozyiak.supabase.co';
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVubHFwaWZweHVlY3h4b3p5aWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMjUzNjgsImV4cCI6MjA4MTYwMTM2OH0.-z3-2Mf3SkkZR3ZryOGyG-60jWERX9YLKIee048OziE';

// AlphaSchool Web API — for KCB STK Push
const SCHOOL_API_BASE = 'https://apsims.vercel.app';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// TYPES
// ============================================================

export interface UserSession {
    portal_user_id: number;
    username: string;
    full_name: string;
    user_type: 'teacher' | 'parent' | 'student' | 'principal' | 'bursar';
    linked_teacher_id: number | null;
    linked_student_id: number | null;
    student_name?: string;
    student_admission?: string;
    student_form?: string;
    student_form_id?: number;
    student_stream_id?: number;
    student_stream_name?: string;
    student_form_level?: number;
    teacher_name?: string;
    teacher_tsc?: string;
    loggedInAt: number;
}

export interface SubjectCard {
    subject_id: number;
    subject_name: string;
    form_id: number;
    form_name: string;
    stream_id: number;
    stream_name: string;
    total_students: number;
    marks_entered: number;
    percentage: number;
}

export interface TimetableEntry {
    id: number;
    day_of_week: string;
    period_id: number;
    period_name: string;
    start_time: string;
    end_time: string;
    period_type: string;
    subject_name: string | null;
    form_name: string | null;
    stream_name: string | null;
    room: string | null;
    is_double: boolean;
}

export interface ExamMark {
    id: number;
    student_id: number;
    student_name: string;
    admission_number: string;
    subject_id: number;
    exam_type: string;
    score: number | null;
    grade: string | null;
    term_id: number;
}

export interface FeePayment {
    id: number;
    student_id: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    mpesa_code: string | null;
    reference_number: string | null;
    receipt_number: string | null;
    created_at: string;
}

export interface DisciplineRecord {
    id: number;
    student_id: number;
    description: string;
    category: string;
    severity: string;
    action_taken: string;
    status: string;
    incident_date: string;
    created_at: string;
}

export interface HomeworkItem {
    id: number;
    title: string;
    description: string;
    subject_name: string;
    due_date: string;
    teacher_name: string;
    status: string;
    created_at: string;
}

// ============================================================
// AUTH — Username + Password Login
// ============================================================

export async function loginUser(username: string, password: string): Promise<UserSession | null> {
    try {
        // Fetch portal user by username
        const { data, error } = await supabase
            .from('school_portal_users')
            .select(`
                id, username, full_name, user_type, password_hash,
                linked_student_id, linked_teacher_id,
                school_students(
                    id, first_name, last_name, admission_number, form_id, stream_id,
                    school_forms(id, form_name, form_level),
                    school_streams(id, stream_name)
                ),
                school_teachers(id, first_name, last_name, tsc_number)
            `)
            .ilike('username', username.trim())
            .eq('is_active', true)
            .single();

        if (error || !data) return null;

        // Password verification — mobile side (bcrypt not available in RN, so we use plain comparison)
        // For production, this should call an API endpoint. For now, support plaintext match.
        const storedHash = data.password_hash || '';
        const isBcrypt = storedHash.startsWith('$2');

        if (isBcrypt) {
            // Call server-side validation endpoint
            try {
                const res = await fetch(`${SCHOOL_API_BASE}/api/auth/portal-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username.trim(), password }),
                });
                const result = await res.json();
                if (!res.ok || !result.success) return null;
            } catch {
                return null;
            }
        } else {
            // Legacy plaintext comparison
            if (password !== storedHash) return null;
        }

        const student = (data as any).school_students;
        const teacher = (data as any).school_teachers;

        return {
            portal_user_id: data.id,
            username: data.username,
            full_name: data.full_name || data.username,
            user_type: data.user_type as 'teacher' | 'parent' | 'student' | 'principal' | 'bursar',
            linked_teacher_id: data.linked_teacher_id,
            linked_student_id: data.linked_student_id,
            student_name: student ? `${student.first_name} ${student.last_name}` : undefined,
            student_admission: student?.admission_number,
            student_form: student?.school_forms?.form_name,
            student_form_id: student?.form_id,
            student_stream_id: student?.stream_id,
            student_stream_name: student?.school_streams?.stream_name,
            student_form_level: student?.school_forms?.form_level,
            teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : undefined,
            teacher_tsc: teacher?.tsc_number,
            loggedInAt: Date.now(),
        };
    } catch (err: any) {
        console.error('loginUser exception:', err);
        return null;
    }
}

// ============================================================
// TEACHER — Subject Cards (marks status)
// ============================================================

export async function getTeacherSubjectCards(teacherId: number): Promise<SubjectCard[]> {
    try {
        const { data: assignments, error: assignErr } = await supabase
            .from('school_subject_teachers')
            .select(`
                id, subject_id, teacher_id, form_id, stream_id,
                school_subjects(id, subject_name),
                school_forms(id, form_name)
            `)
            .eq('teacher_id', teacherId);

        if (assignErr || !assignments || assignments.length === 0) return [];

        // Get current term once
        const term = await getCurrentTerm();
        const termId = term?.id || 0;

        const cards: SubjectCard[] = [];

        for (const a of assignments) {
            const subj = (a as any).school_subjects;
            const form = (a as any).school_forms;
            if (!subj) continue;

            const assignmentStreamId: number | null = (a as any).stream_id || null;

            // Determine which forms to cover
            const formIds: number[] = a.form_id ? [a.form_id] : [];
            if (formIds.length === 0) {
                // All forms — get distinct form IDs that have active students
                const { data: formStudents } = await supabase
                    .from('school_students')
                    .select('form_id')
                    .eq('status', 'Active');
                const uniqueFormIds = [...new Set((formStudents || []).map((s: any) => s.form_id).filter(Boolean))];
                formIds.push(...uniqueFormIds);
            }

            for (const fid of formIds) {
                let formName = form?.form_name || '';
                if (!formName) {
                    const { data: fData } = await supabase
                        .from('school_forms').select('form_name').eq('id', fid).single();
                    formName = fData?.form_name || 'Unknown';
                }

                if (assignmentStreamId) {
                    // ── Specific stream assigned ──────────────────────────────
                    const { data: students } = await supabase
                        .from('school_students')
                        .select('id')
                        .eq('form_id', fid)
                        .eq('stream_id', assignmentStreamId)
                        .eq('status', 'Active');

                    const studentIds = (students || []).map((s: any) => s.id);
                    const total = studentIds.length;

                    // Count distinct students with marks for current term
                    let entered = 0;
                    if (studentIds.length > 0 && termId > 0) {
                        const { data: marksData } = await supabase
                            .from('school_exam_marks')
                            .select('student_id')
                            .eq('subject_id', a.subject_id)
                            .eq('term_id', termId)
                            .in('student_id', studentIds);
                        entered = new Set((marksData || []).map((m: any) => m.student_id)).size;
                    }

                    // Get stream name
                    const { data: streamData } = await supabase
                        .from('school_streams').select('stream_name').eq('id', assignmentStreamId).single();
                    const streamName = streamData?.stream_name || 'Unknown';

                    cards.push({
                        subject_id: a.subject_id,
                        subject_name: subj.subject_name,
                        form_id: fid,
                        form_name: formName,
                        stream_id: assignmentStreamId,
                        stream_name: streamName,
                        total_students: total,
                        marks_entered: entered,
                        percentage: total > 0 ? Math.round((entered / total) * 100) : 0,
                    });
                } else {
                    // ── All streams — ONE card for the whole form ─────────────
                    const { data: students } = await supabase
                        .from('school_students')
                        .select('id')
                        .eq('form_id', fid)
                        .eq('status', 'Active');

                    const studentIds = (students || []).map((s: any) => s.id);
                    const total = studentIds.length;

                    let entered = 0;
                    if (studentIds.length > 0 && termId > 0) {
                        const { data: marksData } = await supabase
                            .from('school_exam_marks')
                            .select('student_id')
                            .eq('subject_id', a.subject_id)
                            .eq('term_id', termId)
                            .in('student_id', studentIds);
                        entered = new Set((marksData || []).map((m: any) => m.student_id)).size;
                    }

                    cards.push({
                        subject_id: a.subject_id,
                        subject_name: subj.subject_name,
                        form_id: fid,
                        form_name: formName,
                        stream_id: 0, // 0 = all streams
                        stream_name: 'All Streams',
                        total_students: total,
                        marks_entered: entered,
                        percentage: total > 0 ? Math.round((entered / total) * 100) : 0,
                    });
                }
            }
        }

        return cards;
    } catch (err: any) {
        console.error('getTeacherSubjectCards error:', err.message);
        return [];
    }
}

// ============================================================
// TEACHER — Timetable
// ============================================================

export async function getTeacherTimetable(teacherId: number): Promise<TimetableEntry[]> {
    try {
        const { data, error } = await supabase
            .from('school_timetable_entries')
            .select(`
                id, day_of_week, period_id, room, is_double,
                school_timetable_periods(id, period_name, start_time, end_time, period_type),
                school_subjects(id, subject_name),
                school_forms(id, form_name),
                school_streams(id, stream_name)
            `)
            .eq('teacher_id', teacherId)
            .order('day_of_week')
            .order('period_id');

        if (error || !data) return [];

        return data.map((e: any) => ({
            id: e.id,
            day_of_week: e.day_of_week,
            period_id: e.period_id,
            period_name: e.school_timetable_periods?.period_name || '',
            start_time: e.school_timetable_periods?.start_time || '',
            end_time: e.school_timetable_periods?.end_time || '',
            period_type: e.school_timetable_periods?.period_type || 'lesson',
            subject_name: e.school_subjects?.subject_name || null,
            form_name: e.school_forms?.form_name || null,
            stream_name: e.school_streams?.stream_name || null,
            room: e.room,
            is_double: e.is_double,
        }));
    } catch (err: any) {
        console.error('getTeacherTimetable error:', err.message);
        return [];
    }
}

// ============================================================
// TEACHER — Marks Entry (get students + marks for a subject)
// ============================================================

export async function getStudentsForMarksEntry(
    subjectId: number, formId: number, streamId: number
): Promise<ExamMark[]> {
    try {
        // Build query — if streamId is 0 or falsy, load ALL streams for this form
        let query = supabase
            .from('school_students')
            .select('id, first_name, last_name, admission_number, stream_id')
            .eq('form_id', formId)
            .eq('status', 'Active')
            .order('first_name');

        if (streamId && streamId > 0) {
            query = query.eq('stream_id', streamId);
        }

        const { data: students } = await query;
        if (!students || students.length === 0) return [];

        // Get existing marks for these students + subject (all exam types — we'll filter by exam type in the screen)
        const studentIds = students.map(s => s.id);
        const { data: marks } = await supabase
            .from('school_exam_marks')
            .select('*')
            .eq('subject_id', subjectId)
            .in('student_id', studentIds);

        // Use the most recent mark per student as default display
        const marksMap = new Map<number, any>();
        (marks || []).forEach((m: any) => {
            const existing = marksMap.get(m.student_id);
            if (!existing || m.id > existing.id) {
                marksMap.set(m.student_id, m);
            }
        });

        return students.map(s => {
            const mark = marksMap.get(s.id);
            return {
                id: mark?.id || 0,
                student_id: s.id,
                student_name: `${s.first_name} ${s.last_name}`,
                admission_number: s.admission_number || '',
                subject_id: subjectId,
                exam_type: mark?.exam_type || '',
                score: null, // scores are loaded per exam type in the screen
                grade: mark?.grade || null,
                term_id: mark?.term_id || 0,
            };
        });
    } catch (err: any) {
        console.error('getStudentsForMarksEntry error:', err.message);
        return [];
    }
}

export async function saveMarks(marks: {
    student_id: number;
    subject_id: number;
    score: number;
    exam_type: string;
    term_id: number;
    grade: string;
}[]): Promise<{ success: boolean; error?: string }> {
    try {
        for (const mark of marks) {
            // Use maybeSingle() — returns null (not an error) when no row exists
            const { data: existing, error: fetchErr } = await supabase
                .from('school_exam_marks')
                .select('id')
                .eq('student_id', mark.student_id)
                .eq('subject_id', mark.subject_id)
                .eq('exam_type', mark.exam_type)
                .eq('term_id', mark.term_id)
                .maybeSingle();

            if (fetchErr) {
                console.error('saveMarks fetch error:', fetchErr.message);
                return { success: false, error: fetchErr.message };
            }

            if (existing) {
                const { error: updateErr } = await supabase
                    .from('school_exam_marks')
                    .update({ score: mark.score, grade: mark.grade, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
                if (updateErr) {
                    console.error('saveMarks update error:', updateErr.message);
                    return { success: false, error: updateErr.message };
                }
            } else {
                const { error: insertErr } = await supabase
                    .from('school_exam_marks')
                    .insert([{
                        student_id: mark.student_id,
                        subject_id: mark.subject_id,
                        score: mark.score,
                        exam_type: mark.exam_type,
                        term_id: mark.term_id,
                        grade: mark.grade,
                    }]);
                if (insertErr) {
                    console.error('saveMarks insert error:', insertErr.message);
                    return { success: false, error: insertErr.message };
                }
            }
        }
        return { success: true };
    } catch (err: any) {
        console.error('saveMarks error:', err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================
// PARENT — Fees
// ============================================================

export async function getStudentFeePayments(studentId: number): Promise<FeePayment[]> {
    try {
        const { data, error } = await supabase
            .from('school_fee_payments')
            .select('*')
            .eq('student_id', studentId)
            .order('payment_date', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err: any) {
        console.error('getStudentFeePayments error:', err.message);
        return [];
    }
}

export async function getStudentFeeStructures(formId: number): Promise<any[]> {
    try {
        const currentYear = new Date().getFullYear();
        // Try current year first
        const { data, error } = await supabase
            .from('school_fee_structures')
            .select('*')
            .eq('form_id', formId)
            .eq('year', currentYear);
        if (error) throw error;

        // If no data for current year, fall back to any year for this form
        if (!data || data.length === 0) {
            const { data: fallback } = await supabase
                .from('school_fee_structures')
                .select('*')
                .eq('form_id', formId)
                .order('year', { ascending: false })
                .limit(20);
            return fallback || [];
        }

        return data;
    } catch (err: any) {
        console.error('getStudentFeeStructures error:', err.message);
        return [];
    }
}

// ============================================================
// PARENT — Discipline
// ============================================================

export async function getStudentDiscipline(studentId: number): Promise<DisciplineRecord[]> {
    try {
        const { data, error } = await supabase
            .from('school_discipline_records')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err: any) {
        console.error('getStudentDiscipline error:', err.message);
        return [];
    }
}

// ============================================================
// PARENT — Academics (exam results)
// ============================================================

export async function getStudentResults(studentId: number): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('school_exam_marks')
            .select('*, school_subjects(subject_name)')
            .eq('student_id', studentId)
            .order('id', { ascending: false })
            .limit(100);

        if (error) throw error;
        return data || [];
    } catch (err: any) {
        console.error('getStudentResults error:', err.message);
        return [];
    }
}

// ============================================================
// STUDENT — Assignments/Homework
// ============================================================

export async function getStudentHomework(formId: number): Promise<HomeworkItem[]> {
    try {
        const { data, error } = await supabase
            .from('school_homework')
            .select(`
                id, title, description, due_date, status, created_at,
                school_subjects(subject_name),
                school_teachers(first_name, last_name)
            `)
            .eq('form_id', formId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return (data || []).map((h: any) => ({
            id: h.id,
            title: h.title || 'Untitled',
            description: h.description || '',
            subject_name: h.school_subjects?.subject_name || 'General',
            due_date: h.due_date || '',
            teacher_name: h.school_teachers
                ? `${h.school_teachers.first_name} ${h.school_teachers.last_name}`
                : 'Teacher',
            status: h.status || 'Active',
            created_at: h.created_at,
        }));
    } catch (err: any) {
        console.error('getStudentHomework error:', err.message);
        return [];
    }
}

// ============================================================
// STUDENT — Past Papers
// ============================================================

export async function getPastPapers(): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('school_exam_papers')
            .select('*, school_subjects(subject_name)')
            .eq('status', 'Published')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data || [];
    } catch (err: any) {
        console.error('getPastPapers error:', err.message);
        return [];
    }
}

// ============================================================
// PARENT — KCB STK Push Payment
// ============================================================

export async function initiateKCBSTKPush(params: {
    phone: string;
    amount: number;
    studentId: number;
    studentName: string;
    description: string;
}): Promise<{ checkoutRequestId: string | null; error: string | null }> {
    try {
        const normalized = normalizePhone(params.phone);
        if (!normalized) return { checkoutRequestId: null, error: 'Invalid phone number' };

        const payload = {
            phone: normalized,
            amount: Math.round(params.amount),
            accountReference: `APSIMS-${params.studentId}`,
            transactionDesc: params.description || 'School Fee Payment',
            studentId: params.studentId,
        };

        const response = await fetch(`${SCHOOL_API_BASE}/api/payments/kcb-stk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
            return { checkoutRequestId: null, error: result.error || 'STK Push failed' };
        }

        return {
            checkoutRequestId: result.checkoutRequestId || result.CheckoutRequestID || null,
            error: null,
        };
    } catch (err: any) {
        return { checkoutRequestId: null, error: 'Network error — please try again' };
    }
}

// ============================================================
// TERMS
// ============================================================

export async function getCurrentTerm(): Promise<{ id: number; term_name: string } | null> {
    try {
        // First try: is_current flag
        const { data: current } = await supabase
            .from('school_terms')
            .select('id, term_name')
            .eq('is_current', true)
            .limit(1)
            .single();
        if (current) return current;

        // Second try: date range
        const today = new Date().toISOString().split('T')[0];
        const { data: byDate } = await supabase
            .from('school_terms')
            .select('id, term_name, start_date, end_date')
            .lte('start_date', today)
            .gte('end_date', today)
            .limit(1)
            .single();
        if (byDate) return byDate;

        // Fallback: most recent term
        const { data: latest } = await supabase
            .from('school_terms')
            .select('id, term_name')
            .order('id', { ascending: false })
            .limit(1)
            .single();
        return latest || null;
    } catch {
        // Last resort
        const { data } = await supabase
            .from('school_terms')
            .select('id, term_name')
            .order('id', { ascending: false })
            .limit(1)
            .single();
        return data || null;
    }
}

// ============================================================
// HELPERS
// ============================================================

export function normalizePhone(phone: string): string | null {
    const cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('254') && cleaned.length === 12) return cleaned;
    if (cleaned.startsWith('0') && cleaned.length === 10) return '254' + cleaned.slice(1);
    if (cleaned.startsWith('+254') && cleaned.length === 13) return cleaned.slice(1);
    return null;
}

export function formatKES(amount: number): string {
    return `KES ${(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(iso: string): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('en-KE', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    } catch { return iso; }
}

export function getGrade(score: number): string {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'E';
}

// ============================================================
// PHASE 1 ULTRA — NEW TYPES
// ============================================================

// Attendance
export interface AttendanceRecord {
    id: number;
    student_id: number;
    attendance_date: string;
    status: 'Present' | 'Absent' | 'Late';
    term_id: number;
    term_name?: string;
    recorded_by?: string | null;
    notes?: string | null;
}

export interface AttendanceInput {
    student_id: number;
    attendance_date: string;
    status: 'Present' | 'Absent' | 'Late';
    term_id: number;
    recorded_by?: string;
}

// CBC
export type CBCLevel = 'EE' | 'ME' | 'AE' | 'BE';

export interface CBCAssessmentResult {
    id: number;
    student_id: number;
    subject_id: number;
    subject_name: string;
    term_id: number;
    assessment_type: 'Formative' | 'Summative';
    task_name: string;
    rubric_level: CBCLevel;
    teacher_id: number | null;
    notes: string | null;
    assessed_at: string;
}

export interface CBCMarkInput {
    student_id: number;
    subject_id: number;
    term_id: number;
    assessment_type: 'Formative' | 'Summative';
    task_name: string;
    rubric_level: CBCLevel;
    teacher_id: number;
}

export interface CBCCompetencySummary {
    id: number;
    student_id: number;
    subject_id: number;
    subject_name: string;
    term_id: number;
    formative_level: CBCLevel | null;
    summative_level: CBCLevel | null;
    overall_level: CBCLevel | null;
    formative_count: number;
    last_computed_at: string;
}

export interface CBCReportCard {
    student_id: number;
    term_id: number;
    term_name: string;
    subjects: CBCCompetencySummary[];
}

// Health
export interface HealthRecord {
    id: number;
    student_id: number;
    blood_group: string | null;
    genotype: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    allergies: string | null;
    chronic_conditions: string | null;
    current_medications: string | null;
    immunization_status: any | null;
    disability_notes: string | null;
}

export interface HealthAllergy {
    id: number;
    student_id: number;
    allergen: string;
    severity: string;
    reaction: string;
    management_plan: string | null;
}

// Leave Outs
export interface LeaveOutRecord {
    id: number;
    student_id: number;
    reason: string;
    reason_details: string | null;
    time_left: string;
    time_returned: string | null;
    status: string;
    sms_sent: boolean;
    qr_code: string | null;
}

// Notifications
export interface PortalNotification {
    id: number;
    portal_user_id: number;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    action_url: string | null;
    student_id: number | null;
    created_at: string;
}

// Homework with submission
export interface HomeworkWithSubmission {
    id: number;
    title: string;
    description: string;
    subject_name: string;
    due_date: string;
    teacher_name: string;
    status: string;
    submission_id: number | null;
    submitted_at: string | null;
    submission_status: 'Submitted' | 'Not Submitted';
    acknowledged_by_parent: boolean;
}

export interface HomeworkInput {
    subject_id: number;
    form_id: number;
    stream_id?: number | null;
    teacher_id: number;
    title: string;
    description?: string;
    due_date: string;
    term_id: number;
}

// Report card delivery
export interface ReportCardDelivery {
    id: number;
    student_id: number;
    term_id: number;
    pdf_url: string | null;
    parent_viewed: boolean;
    parent_viewed_at: string | null;
    delivery_status: string;
}

// Announcements
export interface AnnouncementInput {
    title: string;
    message: string;
    audience: 'all' | 'parents' | 'students' | 'teachers';
    published_by_portal_user_id: number;
}

// NEMIS / KCSE Export
export interface NEMISStudent {
    admission_number: string;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    gender: string | null;
    nemis_no: string | null;
    birth_cert_no: string | null;
    form_name: string;
    stream_name: string;
}

export interface KCSEMarkRow {
    admission_number: string;
    student_name: string;
    subject_name: string;
    score: number | null;
    grade: string | null;
}

// M-Pesa STK Push
export interface STKPushParams {
    phone: string;
    amount: number;
    studentId: number;
    studentName: string;
    description: string;
}

// Student detail for teacher profile view
export interface StudentDetail {
    id: number;
    admission_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    photo_url: string | null;
    form_name: string;
    stream_name: string;
    guardian_name: string | null;
    guardian_phone: string | null;
    form_id: number;
}

// Exam type for export selector
export interface ExamType {
    id: number;
    exam_name: string;
    exam_code: string | null;
    year: number;
}

// ============================================================
// PHASE 1 ULTRA — ATTENDANCE FUNCTIONS
// ============================================================

export async function getStudentAttendance(
    studentId: number,
    month?: number,
    year?: number
): Promise<AttendanceRecord[]> {
    try {
        let query = supabase
            .from('school_attendance')
            .select('*, school_terms(term_name)')
            .eq('student_id', studentId)
            .order('attendance_date', { ascending: false })
            .limit(500);

        if (month && year) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];
            query = query.gte('attendance_date', startDate).lte('attendance_date', endDate);
        } else if (year) {
            query = query.gte('attendance_date', `${year}-01-01`).lte('attendance_date', `${year}-12-31`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((r: any) => ({
            id: r.id,
            student_id: r.student_id,
            attendance_date: r.attendance_date,
            status: r.status as 'Present' | 'Absent' | 'Late',
            term_id: r.term_id,
            term_name: r.school_terms?.term_name || '',
            recorded_by: r.recorded_by,
            notes: r.notes,
        }));
    } catch (err: any) {
        console.error('getStudentAttendance error:', err.message);
        return [];
    }
}

export async function saveAttendance(
    records: AttendanceInput[]
): Promise<{ success: boolean; error?: string }> {
    try {
        for (const record of records) {
            const { error } = await supabase
                .from('school_attendance')
                .upsert(
                    {
                        student_id: record.student_id,
                        attendance_date: record.attendance_date,
                        status: record.status,
                        term_id: record.term_id,
                        recorded_by: record.recorded_by || null,
                    },
                    { onConflict: 'student_id,attendance_date' }
                );
            if (error) return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err: any) {
        console.error('saveAttendance error:', err.message);
        return { success: false, error: err.message };
    }
}

export async function getClassAttendance(
    formId: number,
    streamId: number,
    date: string
): Promise<AttendanceRecord[]> {
    try {
        const { data: students } = await supabase
            .from('school_students')
            .select('id')
            .eq('form_id', formId)
            .eq('stream_id', streamId)
            .eq('status', 'Active');

        if (!students || students.length === 0) return [];
        const studentIds = students.map((s: any) => s.id);

        const { data, error } = await supabase
            .from('school_attendance')
            .select('*')
            .in('student_id', studentIds)
            .eq('attendance_date', date);

        if (error) throw error;
        return (data || []).map((r: any) => ({
            id: r.id,
            student_id: r.student_id,
            attendance_date: r.attendance_date,
            status: r.status as 'Present' | 'Absent' | 'Late',
            term_id: r.term_id,
            recorded_by: r.recorded_by,
            notes: r.notes,
        }));
    } catch (err: any) {
        console.error('getClassAttendance error:', err.message);
        return [];
    }
}

// ============================================================
// PHASE 1 ULTRA — CBC FUNCTIONS
// ============================================================

export async function getCBCAssessments(
    studentId: number,
    termId: number
): Promise<CBCAssessmentResult[]> {
    try {
        const { data, error } = await supabase
            .from('cbc_assessments')
            .select('*, school_subjects(subject_name)')
            .eq('student_id', studentId)
            .eq('term_id', termId)
            .order('assessed_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return (data || []).map((r: any) => ({
            id: r.id,
            student_id: r.student_id,
            subject_id: r.subject_id,
            subject_name: r.school_subjects?.subject_name || '',
            term_id: r.term_id,
            assessment_type: r.assessment_type as 'Formative' | 'Summative',
            task_name: r.task_name || '',
            rubric_level: r.rubric_level as CBCLevel,
            teacher_id: r.teacher_id,
            notes: r.notes,
            assessed_at: r.assessed_at,
        }));
    } catch (err: any) {
        console.error('getCBCAssessments error:', err.message);
        return [];
    }
}

export async function getCBCCompetencySummaries(
    studentId: number,
    termId: number
): Promise<CBCCompetencySummary[]> {
    try {
        const { data, error } = await supabase
            .from('cbc_competency_summaries')
            .select('*, school_subjects(subject_name)')
            .eq('student_id', studentId)
            .eq('term_id', termId);

        if (error) throw error;
        return (data || []).map((r: any) => ({
            id: r.id,
            student_id: r.student_id,
            subject_id: r.subject_id,
            subject_name: r.school_subjects?.subject_name || '',
            term_id: r.term_id,
            formative_level: r.formative_level as CBCLevel | null,
            summative_level: r.summative_level as CBCLevel | null,
            overall_level: r.overall_level as CBCLevel | null,
            formative_count: r.formative_count || 0,
            last_computed_at: r.last_computed_at,
        }));
    } catch (err: any) {
        console.error('getCBCCompetencySummaries error:', err.message);
        return [];
    }
}

export async function saveCBCMarks(
    records: CBCMarkInput[]
): Promise<{ success: boolean; error?: string }> {
    try {
        for (const record of records) {
            const { error } = await supabase
                .from('cbc_assessments')
                .upsert(
                    {
                        student_id: record.student_id,
                        subject_id: record.subject_id,
                        term_id: record.term_id,
                        assessment_type: record.assessment_type,
                        task_name: record.task_name,
                        rubric_level: record.rubric_level,
                        teacher_id: record.teacher_id,
                        assessed_at: new Date().toISOString(),
                    },
                    { onConflict: 'student_id,subject_id,term_id,assessment_type,task_name' }
                );
            if (error) return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err: any) {
        console.error('saveCBCMarks error:', err.message);
        return { success: false, error: err.message };
    }
}

export async function getCBCReportCard(
    studentId: number,
    termId: number
): Promise<CBCReportCard | null> {
    try {
        const [summaries, termData] = await Promise.all([
            getCBCCompetencySummaries(studentId, termId),
            supabase.from('school_terms').select('term_name').eq('id', termId).single(),
        ]);
        return {
            student_id: studentId,
            term_id: termId,
            term_name: termData.data?.term_name || '',
            subjects: summaries,
        };
    } catch (err: any) {
        console.error('getCBCReportCard error:', err.message);
        return null;
    }
}

export async function getCBCStudentsForSubject(
    subjectId: number,
    formId: number,
    streamId: number,
    termId: number
): Promise<{ student_id: number; student_name: string; admission_number: string; current_level: CBCLevel | null }[]> {
    try {
        let query = supabase
            .from('school_students')
            .select('id, first_name, last_name, admission_number')
            .eq('form_id', formId)
            .eq('status', 'Active')
            .order('first_name');

        if (streamId > 0) query = query.eq('stream_id', streamId);

        const { data: students } = await query;
        if (!students || students.length === 0) return [];

        const studentIds = students.map((s: any) => s.id);
        const { data: existing } = await supabase
            .from('cbc_assessments')
            .select('student_id, rubric_level, assessment_type')
            .eq('subject_id', subjectId)
            .eq('term_id', termId)
            .in('student_id', studentIds)
            .order('assessed_at', { ascending: false });

        const latestMap = new Map<number, CBCLevel>();
        (existing || []).forEach((r: any) => {
            if (!latestMap.has(r.student_id)) {
                latestMap.set(r.student_id, r.rubric_level as CBCLevel);
            }
        });

        return students.map((s: any) => ({
            student_id: s.id,
            student_name: `${s.first_name} ${s.last_name}`,
            admission_number: s.admission_number || '',
            current_level: latestMap.get(s.id) || null,
        }));
    } catch (err: any) {
        console.error('getCBCStudentsForSubject error:', err.message);
        return [];
    }
}

// ============================================================
// PHASE 1 ULTRA — HEALTH & LEAVE-OUT FUNCTIONS
// ============================================================

export async function getStudentHealthRecord(
    studentId: number
): Promise<{ record: HealthRecord | null; allergies: HealthAllergy[] }> {
    try {
        const [recordRes, allergiesRes] = await Promise.all([
            supabase
                .from('school_health_records')
                .select('*')
                .eq('student_id', studentId)
                .maybeSingle(),
            supabase
                .from('school_health_allergies')
                .select('*')
                .eq('student_id', studentId)
                .order('id'),
        ]);

        return {
            record: recordRes.data as HealthRecord | null,
            allergies: (allergiesRes.data || []) as HealthAllergy[],
        };
    } catch (err: any) {
        console.error('getStudentHealthRecord error:', err.message);
        return { record: null, allergies: [] };
    }
}

export async function getStudentLeaveOuts(
    studentId: number
): Promise<LeaveOutRecord[]> {
    try {
        const { data, error } = await supabase
            .from('school_leave_outs')
            .select('*')
            .eq('student_id', studentId)
            .order('time_left', { ascending: false })
            .limit(100);

        if (error) throw error;
        return (data || []).map((r: any) => ({
            id: r.id,
            student_id: r.student_id,
            reason: r.reason || '',
            reason_details: r.reason_details,
            time_left: r.time_left,
            time_returned: r.time_returned,
            status: r.status || 'Pending',
            sms_sent: r.sms_sent || false,
            qr_code: r.qr_code,
        }));
    } catch (err: any) {
        console.error('getStudentLeaveOuts error:', err.message);
        return [];
    }
}

// ============================================================
// PHASE 1 ULTRA — NOTIFICATION FUNCTIONS
// ============================================================

export async function getPortalNotifications(
    portalUserId: number
): Promise<PortalNotification[]> {
    try {
        const { data, error } = await supabase
            .from('school_portal_notifications')
            .select('*')
            .eq('portal_user_id', portalUserId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return (data || []) as PortalNotification[];
    } catch (err: any) {
        console.error('getPortalNotifications error:', err.message);
        return [];
    }
}

export async function getUnreadNotificationCount(
    portalUserId: number
): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('school_portal_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('portal_user_id', portalUserId)
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    } catch (err: any) {
        console.error('getUnreadNotificationCount error:', err.message);
        return 0;
    }
}

export async function markNotificationRead(
    notificationId: number
): Promise<void> {
    try {
        await supabase
            .from('school_portal_notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
    } catch (err: any) {
        console.error('markNotificationRead error:', err.message);
    }
}

export async function markAllNotificationsRead(
    portalUserId: number
): Promise<void> {
    try {
        await supabase
            .from('school_portal_notifications')
            .update({ is_read: true })
            .eq('portal_user_id', portalUserId)
            .eq('is_read', false);
    } catch (err: any) {
        console.error('markAllNotificationsRead error:', err.message);
    }
}

// ============================================================
// PHASE 1 ULTRA — HOMEWORK FUNCTIONS
// ============================================================

export async function getHomeworkWithSubmissions(
    formId: number,
    studentId: number
): Promise<HomeworkWithSubmission[]> {
    try {
        const { data, error } = await supabase
            .from('school_homework')
            .select(`
                id, title, description, due_date, status, created_at,
                school_subjects(subject_name),
                school_teachers(first_name, last_name),
                school_homework_submissions!left(
                    id, submitted_at, status, acknowledged_by_parent
                )
            `)
            .eq('form_id', formId)
            .order('due_date', { ascending: true })
            .limit(100);

        if (error) throw error;

        const today = new Date().toISOString().split('T')[0];

        return (data || []).map((h: any) => {
            // Find submission for this specific student
            const submissions = Array.isArray(h.school_homework_submissions)
                ? h.school_homework_submissions
                : h.school_homework_submissions ? [h.school_homework_submissions] : [];

            // Filter to only this student's submission (the join doesn't filter by student_id)
            // We'll handle this by fetching submissions separately if needed
            const submission = submissions[0] || null;
            const isOverdue = h.due_date && h.due_date < today && !submission;

            return {
                id: h.id,
                title: h.title || 'Untitled',
                description: h.description || '',
                subject_name: h.school_subjects?.subject_name || 'General',
                due_date: h.due_date || '',
                teacher_name: h.school_teachers
                    ? `${h.school_teachers.first_name} ${h.school_teachers.last_name}`
                    : 'Teacher',
                status: isOverdue ? 'Overdue' : (h.status || 'Active'),
                submission_id: submission?.id || null,
                submitted_at: submission?.submitted_at || null,
                submission_status: submission ? 'Submitted' : 'Not Submitted',
                acknowledged_by_parent: submission?.acknowledged_by_parent || false,
            };
        });
    } catch (err: any) {
        console.error('getHomeworkWithSubmissions error:', err.message);
        return [];
    }
}

export async function acknowledgeHomework(
    submissionId: number
): Promise<void> {
    try {
        await supabase
            .from('school_homework_submissions')
            .update({ acknowledged_by_parent: true })
            .eq('id', submissionId);
    } catch (err: any) {
        console.error('acknowledgeHomework error:', err.message);
    }
}

export async function createHomework(
    data: HomeworkInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('school_homework')
            .insert([{
                subject_id: data.subject_id,
                form_id: data.form_id,
                stream_id: data.stream_id || null,
                teacher_id: data.teacher_id,
                title: data.title,
                description: data.description || null,
                due_date: data.due_date,
                term_id: data.term_id,
                status: 'Active',
            }]);

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err: any) {
        console.error('createHomework error:', err.message);
        return { success: false, error: err.message };
    }
}

export async function getTeacherHomework(
    teacherId: number
): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('school_homework')
            .select('*, school_subjects(subject_name), school_forms(form_name)')
            .eq('teacher_id', teacherId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data || [];
    } catch (err: any) {
        console.error('getTeacherHomework error:', err.message);
        return [];
    }
}

// ============================================================
// PHASE 1 ULTRA — TIMETABLE, REPORT CARD, ANNOUNCEMENTS, EXPORTS, M-PESA
// ============================================================

export async function getStudentTimetable(
    formId: number,
    streamId: number
): Promise<TimetableEntry[]> {
    try {
        // Build query — fetch entries for this form+stream, OR entries with no stream (shared)
        let query = supabase
            .from('school_timetable_entries')
            .select(`
                id, day_of_week, period_id, room, is_double, stream_id,
                school_timetable_periods(id, period_name, start_time, end_time, period_type),
                school_subjects(id, subject_name),
                school_teachers(id, first_name, last_name)
            `)
            .eq('form_id', formId)
            .order('day_of_week')
            .order('period_id');

        // If student has a stream, fetch their stream entries + any null-stream (whole-class) entries
        if (streamId) {
            query = query.or(`stream_id.eq.${streamId},stream_id.is.null`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map((e: any) => ({
            id: e.id,
            day_of_week: e.day_of_week,
            period_id: e.period_id,
            period_name: e.school_timetable_periods?.period_name || '',
            start_time: e.school_timetable_periods?.start_time || '',
            end_time: e.school_timetable_periods?.end_time || '',
            period_type: e.school_timetable_periods?.period_type || 'lesson',
            subject_name: e.school_subjects?.subject_name || null,
            form_name: null,
            stream_name: null,
            room: e.room,
            is_double: e.is_double,
            teacher_name: e.school_teachers
                ? `${e.school_teachers.first_name} ${e.school_teachers.last_name}`
                : null,
        }));
    } catch (err: any) {
        console.error('getStudentTimetable error:', err.message);
        return [];
    }
}

export async function getReportCardDelivery(
    studentId: number,
    termId: number
): Promise<ReportCardDelivery | null> {
    try {
        const { data, error } = await supabase
            .from('school_report_card_deliveries')
            .select('*')
            .eq('student_id', studentId)
            .eq('term_id', termId)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data as ReportCardDelivery | null;
    } catch (err: any) {
        console.error('getReportCardDelivery error:', err.message);
        return null;
    }
}

export async function markReportCardViewed(
    studentId: number,
    termId: number
): Promise<void> {
    try {
        await supabase
            .from('school_report_card_deliveries')
            .update({
                parent_viewed: true,
                parent_viewed_at: new Date().toISOString(),
            })
            .eq('student_id', studentId)
            .eq('term_id', termId);
    } catch (err: any) {
        console.error('markReportCardViewed error:', err.message);
    }
}

export async function getStudentDetail(
    studentId: number
): Promise<StudentDetail | null> {
    try {
        const { data, error } = await supabase
            .from('school_students')
            .select(`
                id, admission_number, first_name, last_name, gender, photo_url,
                form_id, guardian_name, guardian_phone,
                school_forms(form_name),
                school_streams(stream_name)
            `)
            .eq('id', studentId)
            .single();

        if (error) throw error;
        return {
            id: data.id,
            admission_number: data.admission_number,
            first_name: data.first_name,
            last_name: data.last_name,
            gender: data.gender,
            photo_url: data.photo_url,
            form_name: (data as any).school_forms?.form_name || '',
            stream_name: (data as any).school_streams?.stream_name || '',
            guardian_name: data.guardian_name,
            guardian_phone: data.guardian_phone,
            form_id: data.form_id,
        };
    } catch (err: any) {
        console.error('getStudentDetail error:', err.message);
        return null;
    }
}

export async function getExamTypes(): Promise<ExamType[]> {
    try {
        const { data, error } = await supabase
            .from('school_exam_types')
            .select('id, exam_name, exam_code, year')
            .eq('is_active', true)
            .order('year', { ascending: false })
            .limit(50);

        if (error) throw error;
        return (data || []) as ExamType[];
    } catch (err: any) {
        console.error('getExamTypes error:', err.message);
        return [];
    }
}

export async function publishAnnouncement(
    data: AnnouncementInput
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        let query = supabase
            .from('school_portal_users')
            .select('id')
            .eq('is_active', true);

        // Filter by audience — 'all' means parents + students + teachers
        if (data.audience === 'parents') {
            query = query.eq('user_type', 'parent');
        } else if (data.audience === 'students') {
            query = query.eq('user_type', 'student');
        } else if (data.audience === 'teachers') {
            query = query.eq('user_type', 'teacher');
        }
        // 'all' = no user_type filter → sends to everyone

        const { data: users, error: usersError } = await query;
        if (usersError) return { success: false, count: 0, error: usersError.message };
        if (!users || users.length === 0) return { success: true, count: 0 };

        const notifications = users.map((u: any) => ({
            portal_user_id: u.id,
            title: data.title,
            message: data.message,
            type: 'announcement',
            is_read: false,
        }));

        // Insert in batches of 100
        const batchSize = 100;
        for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            const { error: insertError } = await supabase
                .from('school_portal_notifications')
                .insert(batch);
            if (insertError) return { success: false, count: 0, error: insertError.message };
        }

        return { success: true, count: notifications.length };
    } catch (err: any) {
        console.error('publishAnnouncement error:', err.message);
        return { success: false, count: 0, error: err.message };
    }
}

export async function exportNEMISData(): Promise<NEMISStudent[]> {
    try {
        const { data, error } = await supabase
            .from('school_students')
            .select(`
                admission_number, first_name, last_name, date_of_birth, gender,
                nemis_no, birth_cert_no,
                school_forms(form_name),
                school_streams(stream_name)
            `)
            .eq('status', 'Active')
            .order('form_id')
            .order('last_name');

        if (error) throw error;
        return (data || []).map((s: any) => ({
            admission_number: s.admission_number || '',
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            date_of_birth: s.date_of_birth,
            gender: s.gender,
            nemis_no: s.nemis_no,
            birth_cert_no: s.birth_cert_no,
            form_name: s.school_forms?.form_name || '',
            stream_name: s.school_streams?.stream_name || '',
        }));
    } catch (err: any) {
        console.error('exportNEMISData error:', err.message);
        return [];
    }
}

export async function exportKCSEMarks(
    formId: number,
    examTypeId: number
): Promise<KCSEMarkRow[]> {
    try {
        const { data: examType } = await supabase
            .from('school_exam_types')
            .select('exam_name, exam_code')
            .eq('id', examTypeId)
            .single();

        const { data, error } = await supabase
            .from('school_exam_marks')
            .select(`
                score, grade,
                school_students!inner(admission_number, first_name, last_name, form_id),
                school_subjects(subject_name)
            `)
            .eq('school_students.form_id', formId)
            .eq('exam_type', examType?.exam_code || examType?.exam_name || '')
            .order('school_students.last_name');

        if (error) throw error;
        return (data || []).map((r: any) => ({
            admission_number: r.school_students?.admission_number || '',
            student_name: r.school_students
                ? `${r.school_students.first_name} ${r.school_students.last_name}`
                : '',
            subject_name: r.school_subjects?.subject_name || '',
            score: r.score,
            grade: r.grade,
        }));
    } catch (err: any) {
        console.error('exportKCSEMarks error:', err.message);
        return [];
    }
}

export async function initiateSTKPush(
    params: STKPushParams
): Promise<{ checkoutRequestId: string | null; error: string | null }> {
    try {
        const normalized = normalizePhone(params.phone);
        if (!normalized) return { checkoutRequestId: null, error: 'Invalid phone number' };

        const payload = {
            phone: normalized,
            amount: Math.round(params.amount),
            accountReference: `APSIMS-${params.studentId}`,
            transactionDesc: params.description || 'School Fee Payment',
            studentId: params.studentId,
        };

        const response = await fetch(`${SCHOOL_API_BASE}/api/payments/mpesa-stk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok || result.error) {
            return { checkoutRequestId: null, error: result.error || 'STK Push failed' };
        }

        // Record pending transaction
        await supabase.from('school_mpesa_transactions').insert([{
            student_id: params.studentId,
            amount: params.amount,
            phone_number: normalized,
            checkout_request_id: result.checkoutRequestId || result.CheckoutRequestID,
            status: 'pending',
        }]);

        return {
            checkoutRequestId: result.checkoutRequestId || result.CheckoutRequestID || null,
            error: null,
        };
    } catch (err: any) {
        return { checkoutRequestId: null, error: 'Network error — please try again' };
    }
}

export async function pollSTKStatus(
    checkoutRequestId: string
): Promise<{ status: string; receipt?: string }> {
    try {
        const { data, error } = await supabase
            .from('school_mpesa_transactions')
            .select('status, mpesa_receipt')
            .eq('checkout_request_id', checkoutRequestId)
            .limit(1)
            .maybeSingle();

        if (error || !data) return { status: 'pending' };
        return { status: data.status || 'pending', receipt: data.mpesa_receipt || undefined };
    } catch (err: any) {
        console.error('pollSTKStatus error:', err.message);
        return { status: 'pending' };
    }
}

export async function getClassPerformance(
    subjectId: number,
    formId: number,
    streamId: number
): Promise<{ studentId: number; studentName: string; score: number; grade: string }[]> {
    try {
        const term = await getCurrentTerm();
        if (!term) return [];

        let studentQuery = supabase
            .from('school_students')
            .select('id, first_name, last_name')
            .eq('form_id', formId)
            .eq('status', 'Active');

        if (streamId > 0) studentQuery = studentQuery.eq('stream_id', streamId);

        const { data: students } = await studentQuery;
        if (!students || students.length === 0) return [];

        const studentIds = students.map((s: any) => s.id);
        const { data: marks } = await supabase
            .from('school_exam_marks')
            .select('student_id, score, grade')
            .eq('subject_id', subjectId)
            .eq('term_id', term.id)
            .in('student_id', studentIds);

        const marksMap = new Map<number, { score: number; grade: string }>();
        (marks || []).forEach((m: any) => {
            if (!marksMap.has(m.student_id)) {
                marksMap.set(m.student_id, { score: Number(m.score || 0), grade: m.grade || '' });
            }
        });

        return students
            .filter((s: any) => marksMap.has(s.id))
            .map((s: any) => ({
                studentId: s.id,
                studentName: `${s.first_name} ${s.last_name}`,
                score: marksMap.get(s.id)!.score,
                grade: marksMap.get(s.id)!.grade,
            }))
            .sort((a, b) => b.score - a.score);
    } catch (err: any) {
        console.error('getClassPerformance error:', err.message);
        return [];
    }
}

// ============================================================
// PRINCIPAL DASHBOARD — DATA FUNCTIONS
// Ultra-robust reports for fees, academic, stores, library
// ============================================================

export interface PrincipalKPIs {
    totalStudents: number;
    totalTeachers: number;
    totalFeeExpected: number;
    totalFeeCollected: number;
    feeCollectionRate: number;
    attendanceRate: number;
    totalAttendanceToday: number;
    presentToday: number;
    avgAcademicScore: number;
    passRate: number;
    totalForms: number;
    totalStreams: number;
}

export async function getPrincipalDashboardKPIs(): Promise<PrincipalKPIs> {
    try {
        const term = await getCurrentTerm();
        const termId = term?.id || 0;
        const today = new Date().toISOString().split('T')[0];
        const currentYear = new Date().getFullYear();

        // Parallel queries for speed
        const [studentsRes, teachersRes, formsRes, streamsRes, feeStructRes, feePayRes, attendanceRes, marksRes] = await Promise.all([
            supabase.from('school_students').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
            supabase.from('school_teachers').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('school_forms').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('school_streams').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('school_fee_structures').select('amount').eq('year', currentYear),
            supabase.from('school_fee_payments').select('amount'),
            supabase.from('school_attendance').select('id, status').eq('attendance_date', today),
            supabase.from('school_exam_marks').select('score').eq('term_id', termId).not('score', 'is', null),
        ]);

        const totalStudents = studentsRes.count || 0;
        const totalTeachers = teachersRes.count || 0;
        const totalForms = formsRes.count || 0;
        const totalStreams = streamsRes.count || 0;

        // Fee calculations
        const feeStructures = feeStructRes.data || [];
        const totalFeeExpected = feeStructures.reduce((s: number, f: any) => s + (f.amount || 0), 0) * totalStudents / Math.max(feeStructures.length, 1);
        const feePayments = feePayRes.data || [];
        const totalFeeCollected = feePayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
        const feeCollectionRate = totalFeeExpected > 0 ? Math.round((totalFeeCollected / totalFeeExpected) * 100) : 0;

        // Attendance
        const attendanceRecords = attendanceRes.data || [];
        const totalAttendanceToday = attendanceRecords.length;
        const presentToday = attendanceRecords.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
        const attendanceRate = totalAttendanceToday > 0 ? Math.round((presentToday / totalAttendanceToday) * 100) : 0;

        // Academic
        const marks = marksRes.data || [];
        const scores = marks.map((m: any) => m.score).filter((s: any) => s != null);
        const avgAcademicScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        const passRate = scores.length > 0 ? Math.round((scores.filter((s: number) => s >= 50).length / scores.length) * 100) : 0;

        return {
            totalStudents, totalTeachers, totalFeeExpected, totalFeeCollected,
            feeCollectionRate, attendanceRate, totalAttendanceToday, presentToday,
            avgAcademicScore, passRate, totalForms, totalStreams,
        };
    } catch (err: any) {
        console.error('getPrincipalDashboardKPIs error:', err.message);
        return { totalStudents: 0, totalTeachers: 0, totalFeeExpected: 0, totalFeeCollected: 0, feeCollectionRate: 0, attendanceRate: 0, totalAttendanceToday: 0, presentToday: 0, avgAcademicScore: 0, passRate: 0, totalForms: 0, totalStreams: 0 };
    }
}

// ── Finance Reports ──

export interface FeeCollectionByForm {
    formId: number;
    formName: string;
    studentCount: number;
    totalExpected: number;
    totalPaid: number;
    collectionRate: number;
}

export async function getFeeCollectionByForm(): Promise<FeeCollectionByForm[]> {
    try {
        const currentYear = new Date().getFullYear();
        const { data: forms } = await supabase.from('school_forms').select('id, form_name').eq('is_active', true).order('form_level');
        if (!forms) return [];

        const results: FeeCollectionByForm[] = [];
        for (const form of forms) {
            const { data: students } = await supabase.from('school_students').select('id').eq('form_id', form.id).eq('status', 'Active');
            const studentIds = (students || []).map((s: any) => s.id);
            if (studentIds.length === 0) { results.push({ formId: form.id, formName: form.form_name, studentCount: 0, totalExpected: 0, totalPaid: 0, collectionRate: 0 }); continue; }

            const { data: structures } = await supabase.from('school_fee_structures').select('amount').eq('form_id', form.id).eq('year', currentYear);
            const totalPerStudent = (structures || []).reduce((s: number, f: any) => s + (f.amount || 0), 0);
            const totalExpected = totalPerStudent * studentIds.length;

            const { data: payments } = await supabase.from('school_fee_payments').select('amount').in('student_id', studentIds);
            const totalPaid = (payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);

            results.push({
                formId: form.id, formName: form.form_name, studentCount: studentIds.length,
                totalExpected, totalPaid, collectionRate: totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0,
            });
        }
        return results;
    } catch (err: any) { console.error('getFeeCollectionByForm error:', err.message); return []; }
}

export async function getRecentPayments(limit = 50): Promise<any[]> {
    try {
        const { data } = await supabase.from('school_fee_payments').select('*, school_students(first_name, last_name, admission_number)').order('payment_date', { ascending: false }).limit(limit);
        return (data || []).map((p: any) => ({
            ...p,
            student_name: p.school_students ? `${p.school_students.first_name} ${p.school_students.last_name}` : 'Unknown',
            admission_number: p.school_students?.admission_number || '',
        }));
    } catch { return []; }
}

export async function getTopDefaulters(limit = 20): Promise<any[]> {
    try {
        const currentYear = new Date().getFullYear();
        const { data: students } = await supabase.from('school_students').select('id, first_name, last_name, admission_number, form_id, school_forms(form_name)').eq('status', 'Active');
        if (!students) return [];

        const defaulters: any[] = [];
        for (const s of students) {
            const { data: structures } = await supabase.from('school_fee_structures').select('amount').eq('form_id', s.form_id).eq('year', currentYear);
            const expected = (structures || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
            const { data: payments } = await supabase.from('school_fee_payments').select('amount').eq('student_id', s.id);
            const paid = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            const balance = expected - paid;
            if (balance > 0) {
                defaulters.push({
                    studentId: s.id, studentName: `${s.first_name} ${s.last_name}`,
                    admissionNumber: s.admission_number, formName: (s as any).school_forms?.form_name || '',
                    expected, paid, balance,
                });
            }
        }
        return defaulters.sort((a, b) => b.balance - a.balance).slice(0, limit);
    } catch { return []; }
}

export async function getPaymentMethodBreakdown(): Promise<{ method: string; total: number; count: number }[]> {
    try {
        const { data } = await supabase.from('school_fee_payments').select('payment_method, amount');
        if (!data) return [];
        const map = new Map<string, { total: number; count: number }>();
        data.forEach((p: any) => {
            const method = p.payment_method || 'Cash';
            const existing = map.get(method) || { total: 0, count: 0 };
            map.set(method, { total: existing.total + (p.amount || 0), count: existing.count + 1 });
        });
        return Array.from(map.entries()).map(([method, v]) => ({ method, ...v })).sort((a, b) => b.total - a.total);
    } catch { return []; }
}

// ── Academic Reports ──

export interface SubjectMeanScore {
    subjectId: number;
    subjectName: string;
    meanScore: number;
    studentCount: number;
    passRate: number;
    gradeDistribution: { grade: string; count: number }[];
}

export async function getSubjectMeanScores(formId: number, termId: number): Promise<SubjectMeanScore[]> {
    try {
        const { data: students } = await supabase.from('school_students').select('id').eq('form_id', formId).eq('status', 'Active');
        if (!students || students.length === 0) return [];
        const studentIds = students.map((s: any) => s.id);

        const { data: marks } = await supabase.from('school_exam_marks').select('subject_id, score, grade, school_subjects(subject_name)').eq('term_id', termId).in('student_id', studentIds).not('score', 'is', null);
        if (!marks || marks.length === 0) return [];

        const subjectMap = new Map<number, { name: string; scores: number[]; grades: string[] }>();
        marks.forEach((m: any) => {
            const existing: { name: string; scores: number[]; grades: string[] } =
                subjectMap.get(m.subject_id) || { name: (m as any).school_subjects?.subject_name || 'Unknown', scores: [] as number[], grades: [] as string[] };
            existing.scores.push(m.score as number);
            if (m.grade) existing.grades.push(m.grade as string);
            subjectMap.set(m.subject_id, existing);
        });

        return Array.from(subjectMap.entries()).map(([subjectId, data]) => {
            const meanScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
            const passRate = Math.round((data.scores.filter(s => s >= 50).length / data.scores.length) * 100);
            const gradeCount = new Map<string, number>();
            data.grades.forEach(g => gradeCount.set(g, (gradeCount.get(g) || 0) + 1));
            const gradeDistribution = Array.from(gradeCount.entries()).map(([grade, count]) => ({ grade, count })).sort((a, b) => a.grade.localeCompare(b.grade));
            return { subjectId, subjectName: data.name, meanScore, studentCount: data.scores.length, passRate, gradeDistribution };
        }).sort((a, b) => b.meanScore - a.meanScore);
    } catch (err: any) { console.error('getSubjectMeanScores error:', err.message); return []; }
}

export async function getCBCOverview(termId: number): Promise<{ subjectName: string; ee: number; me: number; ae: number; be: number; total: number }[]> {
    try {
        const { data } = await supabase.from('cbc_mark_scores').select('subject_id, rubric_level, school_subjects(subject_name)').eq('term_id', termId);
        if (!data) return [];
        const map = new Map<number, { name: string; ee: number; me: number; ae: number; be: number; total: number }>();
        data.forEach((r: any) => {
            const existing: { name: string; ee: number; me: number; ae: number; be: number; total: number } =
                map.get(r.subject_id) || { name: (r as any).school_subjects?.subject_name || 'Unknown', ee: 0, me: 0, ae: 0, be: 0, total: 0 };
            existing.total++;
            if (r.rubric_level === 'EE') existing.ee++;
            else if (r.rubric_level === 'ME') existing.me++;
            else if (r.rubric_level === 'AE') existing.ae++;
            else if (r.rubric_level === 'BE') existing.be++;
            map.set(r.subject_id, existing);
        });
        return Array.from(map.values())
            .map(v => ({ subjectName: v.name, ee: v.ee, me: v.me, ae: v.ae, be: v.be, total: v.total }))
            .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    } catch { return []; }
}

export async function getFormMeanScores(termId: number): Promise<{ formId: number; formName: string; meanScore: number; studentCount: number }[]> {
    try {
        const { data: forms } = await supabase.from('school_forms').select('id, form_name').eq('is_active', true).order('form_level');
        if (!forms) return [];
        const results: any[] = [];
        for (const form of forms) {
            const { data: students } = await supabase.from('school_students').select('id').eq('form_id', form.id).eq('status', 'Active');
            if (!students || students.length === 0) continue;
            const studentIds = students.map((s: any) => s.id);
            const { data: marks } = await supabase.from('school_exam_marks').select('score').eq('term_id', termId).in('student_id', studentIds).not('score', 'is', null);
            const scores = (marks || []).map((m: any) => m.score);
            if (scores.length > 0) {
                results.push({ formId: form.id, formName: form.form_name, meanScore: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length), studentCount: scores.length });
            }
        }
        return results;
    } catch { return []; }
}

export async function getMarksEntryProgress(): Promise<{ teacherName: string; subjectName: string; formName: string; total: number; entered: number; percentage: number }[]> {
    try {
        const term = await getCurrentTerm();
        const termId = term?.id || 0;
        const { data: assignments } = await supabase.from('school_subject_teachers').select('subject_id, form_id, stream_id, school_subjects(subject_name), school_forms(form_name), school_teachers(first_name, last_name)');
        if (!assignments) return [];

        const results: any[] = [];
        for (const a of assignments) {
            const teacher = (a as any).school_teachers;
            const subject = (a as any).school_subjects;
            const form = (a as any).school_forms;
            if (!teacher || !subject || !form) continue;

            let studentQuery = supabase.from('school_students').select('id').eq('form_id', a.form_id).eq('status', 'Active');
            if (a.stream_id) studentQuery = studentQuery.eq('stream_id', a.stream_id);
            const { data: students } = await studentQuery;
            const total = (students || []).length;
            if (total === 0) continue;

            const studentIds = (students || []).map((s: any) => s.id);
            const { data: marks } = await supabase.from('school_exam_marks').select('student_id').eq('subject_id', a.subject_id).eq('term_id', termId).in('student_id', studentIds);
            const entered = new Set((marks || []).map((m: any) => m.student_id)).size;

            results.push({
                teacherName: `${teacher.first_name} ${teacher.last_name}`,
                subjectName: subject.subject_name, formName: form.form_name,
                total, entered, percentage: Math.round((entered / total) * 100),
            });
        }
        return results.sort((a, b) => a.percentage - b.percentage);
    } catch { return []; }
}

// ── Stores Reports ──

export async function getStoresOverview(): Promise<{ totalItems: number; totalValue: number; lowStockCount: number; categories: { name: string; count: number; value: number }[] }> {
    try {
        const { data } = await supabase.from('school_store_items').select('*');
        if (!data) return { totalItems: 0, totalValue: 0, lowStockCount: 0, categories: [] };
        const totalItems = data.length;
        const totalValue = data.reduce((s: number, i: any) => s + ((i.quantity || 0) * (i.unit_price || 0)), 0);
        const lowStockCount = data.filter((i: any) => (i.quantity || 0) <= (i.reorder_level || 5)).length;
        const catMap = new Map<string, { count: number; value: number }>();
        data.forEach((i: any) => {
            const cat = i.category || 'General';
            const existing = catMap.get(cat) || { count: 0, value: 0 };
            catMap.set(cat, { count: existing.count + 1, value: existing.value + ((i.quantity || 0) * (i.unit_price || 0)) });
        });
        const categories = Array.from(catMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.value - a.value);
        return { totalItems, totalValue, lowStockCount, categories };
    } catch { return { totalItems: 0, totalValue: 0, lowStockCount: 0, categories: [] }; }
}

export async function getLowStockItems(): Promise<any[]> {
    try {
        const { data } = await supabase.from('school_store_items').select('*').order('quantity', { ascending: true }).limit(30);
        return (data || []).filter((i: any) => (i.quantity || 0) <= (i.reorder_level || 5));
    } catch { return []; }
}

export async function getRecentStoreMovements(limit = 30): Promise<any[]> {
    try {
        const { data } = await supabase.from('school_store_transactions').select('*, school_store_items(item_name, category)').order('created_at', { ascending: false }).limit(limit);
        return data || [];
    } catch { return []; }
}

// ── Library Reports ──

export async function getLibraryOverview(): Promise<{ totalBooks: number; checkedOut: number; available: number; overdueCount: number; categories: { name: string; count: number }[] }> {
    try {
        const { data: books } = await supabase.from('school_library_books').select('*');
        if (!books) return { totalBooks: 0, checkedOut: 0, available: 0, overdueCount: 0, categories: [] };
        const totalBooks = books.length;
        const checkedOut = books.filter((b: any) => b.status === 'Checked Out' || b.is_borrowed === true).length;
        const available = totalBooks - checkedOut;
        const { count: overdueCount } = await supabase.from('school_library_transactions').select('id', { count: 'exact', head: true }).eq('status', 'Overdue');
        const catMap = new Map<string, number>();
        books.forEach((b: any) => { const cat = b.category || b.genre || 'General'; catMap.set(cat, (catMap.get(cat) || 0) + 1); });
        const categories = Array.from(catMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        return { totalBooks, checkedOut, available, overdueCount: overdueCount || 0, categories };
    } catch { return { totalBooks: 0, checkedOut: 0, available: 0, overdueCount: 0, categories: [] }; }
}

export async function getOverdueBooks(limit = 30): Promise<any[]> {
    try {
        const { data } = await supabase.from('school_library_transactions').select('*, school_students(first_name, last_name, admission_number), school_library_books(title, author)').eq('status', 'Overdue').order('due_date', { ascending: true }).limit(limit);
        return data || [];
    } catch { return []; }
}

export async function getRecentLibraryTransactions(limit = 30): Promise<any[]> {
    try {
        const { data } = await supabase.from('school_library_transactions').select('*, school_students(first_name, last_name), school_library_books(title, author)').order('created_at', { ascending: false }).limit(limit);
        return data || [];
    } catch { return []; }
}

// ============================================================
// PRINCIPAL — INCOME, EXPENSES, EVENTS & TEACHER PERFORMANCE
// ============================================================

export async function getSchoolExpenses(limit = 50): Promise<any[]> {
    try {
        // Try school_expenses first, fallback to expenses table
        let data: any[] = [];
        const { data: schoolExp } = await supabase.from('school_expenses').select('*').order('expense_date', { ascending: false }).limit(limit);
        if (schoolExp && schoolExp.length > 0) { data = schoolExp; }
        else {
            const { data: genExp } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(limit);
            data = genExp || [];
        }
        return data;
    } catch { return []; }
}

export async function getExpenseSummary(): Promise<{ totalExpenses: number; byCategory: { category: string; total: number; count: number }[]; monthlyTrend: { month: string; total: number }[] }> {
    try {
        let data: any[] = [];
        const { data: schoolExp } = await supabase.from('school_expenses').select('*');
        if (schoolExp && schoolExp.length > 0) { data = schoolExp; }
        else {
            const { data: genExp } = await supabase.from('expenses').select('*');
            data = genExp || [];
        }

        const totalExpenses = data.reduce((s: number, e: any) => s + (e.amount || 0), 0);

        // By category
        const catMap = new Map<string, { total: number; count: number }>();
        data.forEach((e: any) => {
            const cat = e.category || e.expense_type || 'General';
            const existing = catMap.get(cat) || { total: 0, count: 0 };
            catMap.set(cat, { total: existing.total + (e.amount || 0), count: existing.count + 1 });
        });
        const byCategory = Array.from(catMap.entries()).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.total - a.total);

        // Monthly trend (last 6 months)
        const monthMap = new Map<string, number>();
        data.forEach((e: any) => {
            const d = new Date(e.expense_date || e.created_at);
            if (!isNaN(d.getTime())) {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthMap.set(key, (monthMap.get(key) || 0) + (e.amount || 0));
            }
        });
        const monthlyTrend = Array.from(monthMap.entries())
            .map(([month, total]) => ({ month, total }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6);

        return { totalExpenses, byCategory, monthlyTrend };
    } catch { return { totalExpenses: 0, byCategory: [], monthlyTrend: [] }; }
}

export async function getIncomeVsExpenses(): Promise<{ totalIncome: number; totalExpenses: number; netProfit: number }> {
    try {
        // Income from fee payments
        const { data: payments } = await supabase.from('school_fee_payments').select('amount');
        const totalIncome = (payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);

        // Expenses
        let expData: any[] = [];
        const { data: schoolExp } = await supabase.from('school_expenses').select('amount');
        if (schoolExp && schoolExp.length > 0) { expData = schoolExp; }
        else {
            const { data: genExp } = await supabase.from('expenses').select('amount');
            expData = genExp || [];
        }
        const totalExpenses = expData.reduce((s: number, e: any) => s + (e.amount || 0), 0);

        return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
    } catch { return { totalIncome: 0, totalExpenses: 0, netProfit: 0 }; }
}

// ── Upcoming Events ──

export async function getUpcomingEvents(limit = 10): Promise<any[]> {
    try {
        const today = new Date().toISOString().split('T')[0];
        // Try school_events table
        const { data } = await supabase.from('school_events')
            .select('*')
            .gte('event_date', today)
            .order('event_date', { ascending: true })
            .limit(limit);
        return data || [];
    } catch { return []; }
}

// ── Teacher Performance ──

export interface TeacherPerformance {
    teacherId: number;
    teacherName: string;
    subjectsAssigned: number;
    totalStudents: number;
    marksEntered: number;
    entryRate: number;
    avgStudentScore: number;
}

export async function getTeacherPerformanceReport(): Promise<TeacherPerformance[]> {
    try {
        const term = await getCurrentTerm();
        const termId = term?.id || 0;

        const { data: teachers } = await supabase.from('school_teachers')
            .select('id, first_name, last_name')
            .eq('is_active', true);
        if (!teachers) return [];

        const results: TeacherPerformance[] = [];

        for (const t of teachers) {
            const { data: assignments } = await supabase.from('school_subject_teachers')
                .select('subject_id, form_id, stream_id')
                .eq('teacher_id', t.id);

            if (!assignments || assignments.length === 0) continue;

            let totalStudents = 0;
            let totalMarksEntered = 0;
            let allScores: number[] = [];

            for (const a of assignments) {
                let studentQuery = supabase.from('school_students').select('id').eq('form_id', a.form_id).eq('status', 'Active');
                if (a.stream_id) studentQuery = studentQuery.eq('stream_id', a.stream_id);
                const { data: students } = await studentQuery;
                const sids = (students || []).map((s: any) => s.id);
                totalStudents += sids.length;

                if (sids.length > 0 && termId > 0) {
                    const { data: marks } = await supabase.from('school_exam_marks')
                        .select('student_id, score')
                        .eq('subject_id', a.subject_id)
                        .eq('term_id', termId)
                        .in('student_id', sids);
                    const uniqueStudents = new Set((marks || []).map((m: any) => m.student_id));
                    totalMarksEntered += uniqueStudents.size;
                    (marks || []).forEach((m: any) => { if (m.score != null) allScores.push(m.score); });
                }
            }

            const entryRate = totalStudents > 0 ? Math.round((totalMarksEntered / totalStudents) * 100) : 0;
            const avgStudentScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

            results.push({
                teacherId: t.id,
                teacherName: `${t.first_name} ${t.last_name}`,
                subjectsAssigned: assignments.length,
                totalStudents, marksEntered: totalMarksEntered,
                entryRate, avgStudentScore,
            });
        }

        return results.sort((a, b) => b.entryRate - a.entryRate);
    } catch (err: any) { console.error('getTeacherPerformanceReport error:', err.message); return []; }
}
