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
                school_students(id, first_name, last_name, admission_number, form_id,
                    school_forms(id, form_name)
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
        // Get subjects assigned to this teacher from timetable requirements
        const { data: requirements, error: reqErr } = await supabase
            .from('school_timetable_requirements')
            .select(`
                subject_id, form_id, stream_id,
                school_subjects(id, subject_name),
                school_forms(id, form_name),
                school_streams(id, stream_name)
            `)
            .eq('teacher_id', teacherId);

        if (reqErr || !requirements) return [];

        // Deduplicate by subject+form+stream
        const seen = new Set<string>();
        const cards: SubjectCard[] = [];

        for (const r of requirements) {
            const key = `${r.subject_id}-${r.form_id}-${r.stream_id}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const subj = (r as any).school_subjects;
            const form = (r as any).school_forms;
            const stream = (r as any).school_streams;

            // Count students in this form+stream
            const { count: totalStudents } = await supabase
                .from('school_students')
                .select('id', { count: 'exact', head: true })
                .eq('form_id', r.form_id)
                .eq('stream_id', r.stream_id)
                .eq('status', 'Active');

            // Count marks entered for this subject+form+stream (latest term)
            const { count: marksEntered } = await supabase
                .from('school_exam_marks')
                .select('id', { count: 'exact', head: true })
                .eq('subject_id', r.subject_id)
                .in('student_id',
                    (await supabase
                        .from('school_students')
                        .select('id')
                        .eq('form_id', r.form_id)
                        .eq('stream_id', r.stream_id)
                        .eq('status', 'Active')
                    ).data?.map((s: any) => s.id) || []
                );

            const total = totalStudents || 0;
            const entered = marksEntered || 0;

            cards.push({
                subject_id: r.subject_id,
                subject_name: subj?.subject_name || 'Unknown',
                form_id: r.form_id,
                form_name: form?.form_name || 'Unknown',
                stream_id: r.stream_id,
                stream_name: stream?.stream_name || 'Unknown',
                total_students: total,
                marks_entered: entered,
                percentage: total > 0 ? Math.round((entered / total) * 100) : 0,
            });
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
        // Get all active students in this form+stream
        const { data: students } = await supabase
            .from('school_students')
            .select('id, first_name, last_name, admission_number')
            .eq('form_id', formId)
            .eq('stream_id', streamId)
            .eq('status', 'Active')
            .order('last_name');

        if (!students) return [];

        // Get existing marks for these students + subject
        const studentIds = students.map(s => s.id);
        const { data: marks } = await supabase
            .from('school_exam_marks')
            .select('*')
            .eq('subject_id', subjectId)
            .in('student_id', studentIds);

        const marksMap = new Map<number, any>();
        (marks || []).forEach((m: any) => marksMap.set(m.student_id, m));

        return students.map(s => {
            const mark = marksMap.get(s.id);
            return {
                id: mark?.id || 0,
                student_id: s.id,
                student_name: `${s.last_name}, ${s.first_name}`,
                admission_number: s.admission_number || '',
                subject_id: subjectId,
                exam_type: mark?.exam_type || '',
                score: mark?.score ?? null,
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
            // Check if mark already exists
            const { data: existing } = await supabase
                .from('school_exam_marks')
                .select('id')
                .eq('student_id', mark.student_id)
                .eq('subject_id', mark.subject_id)
                .eq('exam_type', mark.exam_type)
                .eq('term_id', mark.term_id)
                .single();

            if (existing) {
                await supabase
                    .from('school_exam_marks')
                    .update({ score: mark.score, grade: mark.grade, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('school_exam_marks')
                    .insert([{
                        student_id: mark.student_id,
                        subject_id: mark.subject_id,
                        score: mark.score,
                        exam_type: mark.exam_type,
                        term_id: mark.term_id,
                        grade: mark.grade,
                    }]);
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
        const { data, error } = await supabase
            .from('school_fee_structures')
            .select('*')
            .eq('form_id', formId);
        if (error) throw error;
        return data || [];
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
        const { data } = await supabase
            .from('school_terms')
            .select('id, term_name, start_date, end_date')
            .lte('start_date', new Date().toISOString())
            .gte('end_date', new Date().toISOString())
            .single();
        return data;
    } catch {
        // Fallback: get latest term
        const { data } = await supabase
            .from('school_terms')
            .select('id, term_name')
            .order('start_date', { ascending: false })
            .limit(1)
            .single();
        return data;
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
