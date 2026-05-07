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
    user_type: 'teacher' | 'parent' | 'student';
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
            user_type: data.user_type as 'teacher' | 'parent' | 'student',
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
