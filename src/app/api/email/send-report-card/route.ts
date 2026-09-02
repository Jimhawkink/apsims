export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

/* ─── Supabase service client ─── */
function getSb() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

/* ─── SMTP Config — env vars first, then DB ─── */
async function getSmtpConfig() {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return {
            host:      process.env.SMTP_HOST      || 'smtp.gmail.com',
            port:      Number(process.env.SMTP_PORT) || 587,
            user:      process.env.SMTP_USER,
            pass:      process.env.SMTP_PASS,
            fromName:  process.env.SMTP_FROM_NAME  || 'APSIMS School',
            fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        };
    }
    // Fallback: read from school_details table
    try {
        const sb = getSb();
        const { data } = await sb
            .from('school_details')
            .select('smtp_host,smtp_port,smtp_user,smtp_pass,smtp_from_name,smtp_from_email,smtp_enabled')
            .limit(1).maybeSingle();
        if (data?.smtp_user && data?.smtp_pass && data?.smtp_enabled !== false) {
            return {
                host:      data.smtp_host      || 'smtp.gmail.com',
                port:      Number(data.smtp_port) || 587,
                user:      data.smtp_user,
                pass:      data.smtp_pass,
                fromName:  data.smtp_from_name  || 'APSIMS School',
                fromEmail: data.smtp_from_email || data.smtp_user,
            };
        }
    } catch (e: any) { console.log('[ReportCard Email] DB SMTP error:', e?.message); }
    return null;
}

/* ─── Build beautiful HTML report card email ─── */
function buildReportCardHtml(params: {
    studentName:   string;
    guardianName:  string;
    admissionNo:   string;
    formName:      string;
    streamName:    string;
    termName:      string;
    examType:      string;
    schoolName:    string;
    schoolPhone:   string;
    schoolEmail:   string;
    schoolAddress: string;
    logoUrl?:      string;
    marks:         Array<{
        subject:    string;
        code:       string;
        score:      number;
        grade:      string;
        points:     number;
        remarks:    string;
        teacher?:   string;
    }>;
    classAvg:      number;
    classRank:     number;
    totalStudents: number;
    overallAvg:    number;
    overallGrade:  string;
    overallPoints: number;
    meanGrade:     string;
    attendanceRate: number;
    classTeacher:  string;
    principalComment?: string;
    nextTermStart?: string;
}): string {

    const gradeColor: Record<string,string> = {
        'A':'#059669','A-':'#10b981','B+':'#0891b2','B':'#2563eb','B-':'#4f46e5',
        'C+':'#7c3aed','C':'#d97706','C-':'#f59e0b','D+':'#ea580c','D':'#dc2626',
        'D-':'#b91c1c','E':'#7f1d1d',
    };
    const gc = (g: string) => gradeColor[g] || '#64748b';

    const subjectRows = params.marks.map((m, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
            <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9">${m.subject}</td>
            <td style="padding:8px 12px;font-size:12px;color:#64748b;text-align:center;border-bottom:1px solid #f1f5f9">${m.code || '-'}</td>
            <td style="padding:8px 12px;font-size:14px;font-weight:900;text-align:center;border-bottom:1px solid #f1f5f9;color:${gc(m.grade)}">${m.score.toFixed(1)}%</td>
            <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f1f5f9">
                <span style="background:${gc(m.grade)}20;color:${gc(m.grade)};font-size:11px;font-weight:900;padding:3px 10px;border-radius:8px;border:1px solid ${gc(m.grade)}40">${m.grade}</span>
            </td>
            <td style="padding:8px 12px;font-size:12px;text-align:center;color:#64748b;border-bottom:1px solid #f1f5f9">${m.points}</td>
            <td style="padding:8px 12px;font-size:11px;color:#64748b;border-bottom:1px solid #f1f5f9">${m.remarks || ''}</td>
        </tr>
    `).join('');

    const passCount = params.marks.filter(m => m.score >= 50).length;

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Report Card — ${params.studentName}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:640px">

    <!-- HEADER -->
    <tr>
        <td style="background:linear-gradient(135deg,#064e3b,#059669,#0891b2);padding:28px 32px;text-align:center">
            ${params.logoUrl ? `<img src="${params.logoUrl}" alt="School Logo" style="height:60px;margin-bottom:12px;border-radius:50%;border:3px solid rgba(255,255,255,0.3)"/>` : ''}
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">${params.schoolName}</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">${params.schoolAddress || ''} &nbsp;|&nbsp; ${params.schoolPhone || ''}</p>
            <div style="margin-top:16px;background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 20px;display:inline-block">
                <p style="margin:0;font-size:16px;font-weight:900;color:#ffffff;letter-spacing:1px">📋 STUDENT REPORT CARD</p>
                <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8)">${params.termName} &nbsp;·&nbsp; ${params.examType}</p>
            </div>
        </td>
    </tr>

    <!-- STUDENT INFO -->
    <tr>
        <td style="padding:20px 32px;background:#f8fafc;border-bottom:2px solid #e2e8f0">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="50%">
                        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Student Name</p>
                        <p style="margin:0;font-size:16px;font-weight:900;color:#0f172a">${params.studentName}</p>
                    </td>
                    <td width="50%">
                        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Admission No.</p>
                        <p style="margin:0;font-size:15px;font-weight:800;color:#0f172a">${params.admissionNo}</p>
                    </td>
                </tr>
                <tr><td colspan="2" style="padding-top:10px"></td></tr>
                <tr>
                    <td width="50%">
                        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Class / Stream</p>
                        <p style="margin:0;font-size:14px;font-weight:700;color:#334155">${params.formName} ${params.streamName}</p>
                    </td>
                    <td width="50%">
                        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Class Teacher</p>
                        <p style="margin:0;font-size:14px;font-weight:700;color:#334155">${params.classTeacher || '—'}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- PERFORMANCE SUMMARY CARDS -->
    <tr>
        <td style="padding:20px 32px">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    ${[
                        { l:'Overall Average', v:`${params.overallAvg.toFixed(1)}%`, c: gc(params.overallGrade) },
                        { l:'Mean Grade',       v: params.meanGrade,                  c: gc(params.meanGrade) },
                        { l:'Total Points',     v: String(params.overallPoints),      c:'#6366f1' },
                        { l:'Class Position',  v: `${params.classRank}/${params.totalStudents}`, c:'#0891b2' },
                        { l:'Attendance',       v:`${params.attendanceRate}%`,        c: params.attendanceRate >= 80 ? '#059669' : '#ef4444' },
                        { l:'Subjects Passed',  v:`${passCount}/${params.marks.length}`, c: passCount === params.marks.length ? '#059669' : '#f59e0b' },
                    ].map(k => `
                        <td style="width:16.6%;padding:0 4px;text-align:center">
                            <div style="background:${k.c}10;border:1px solid ${k.c}30;border-radius:12px;padding:12px 6px">
                                <p style="margin:0;font-size:18px;font-weight:900;color:${k.c}">${k.v}</p>
                                <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;line-height:1.3">${k.l}</p>
                            </div>
                        </td>
                    `).join('')}
                </tr>
            </table>
        </td>
    </tr>

    <!-- MARKS TABLE -->
    <tr>
        <td style="padding:0 32px 20px">
            <p style="margin:0 0 10px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em">📚 Subject Performance Breakdown</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
                <thead>
                    <tr style="background:linear-gradient(135deg,#064e3b,#059669)">
                        <th style="padding:10px 12px;font-size:11px;font-weight:900;color:#ffffff;text-align:left;text-transform:uppercase;letter-spacing:0.05em">Subject</th>
                        <th style="padding:10px 12px;font-size:11px;font-weight:900;color:#ffffff;text-align:center;text-transform:uppercase;letter-spacing:0.05em">Code</th>
                        <th style="padding:10px 12px;font-size:11px;font-weight:900;color:#ffffff;text-align:center;text-transform:uppercase;letter-spacing:0.05em">Score</th>
                        <th style="padding:10px 12px;font-size:11px;font-weight:900;color:#ffffff;text-align:center;text-transform:uppercase;letter-spacing:0.05em">Grade</th>
                        <th style="padding:10px 12px;font-size:11px;font-weight:900;color:#ffffff;text-align:center;text-transform:uppercase;letter-spacing:0.05em">Points</th>
                        <th style="padding:10px 12px;font-size:11px;font-weight:900;color:#ffffff;text-align:left;text-transform:uppercase;letter-spacing:0.05em">Remarks</th>
                    </tr>
                </thead>
                <tbody>${subjectRows}</tbody>
                <tfoot>
                    <tr style="background:#f8fafc;border-top:2px solid #059669">
                        <td colspan="2" style="padding:10px 12px;font-size:13px;font-weight:900;color:#059669">OVERALL AVERAGE</td>
                        <td style="padding:10px 12px;font-size:15px;font-weight:900;text-align:center;color:${gc(params.overallGrade)}">${params.overallAvg.toFixed(1)}%</td>
                        <td style="padding:10px 12px;text-align:center">
                            <span style="background:${gc(params.meanGrade)}20;color:${gc(params.meanGrade)};font-size:13px;font-weight:900;padding:4px 12px;border-radius:8px">${params.meanGrade}</span>
                        </td>
                        <td style="padding:10px 12px;font-size:14px;font-weight:900;text-align:center;color:#6366f1">${params.overallPoints}</td>
                        <td style="padding:10px 12px"></td>
                    </tr>
                </tfoot>
            </table>
        </td>
    </tr>

    <!-- PRINCIPAL COMMENT -->
    ${params.principalComment ? `
    <tr>
        <td style="padding:0 32px 20px">
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px 18px">
                <p style="margin:0 0 6px;font-size:11px;font-weight:900;color:#92400e;text-transform:uppercase;letter-spacing:0.08em">👨‍💼 Principal's Remarks</p>
                <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6">${params.principalComment}</p>
            </div>
        </td>
    </tr>` : ''}

    <!-- FOOTER -->
    <tr>
        <td style="padding:20px 32px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);text-align:center;border-top:2px solid #e2e8f0">
            ${params.nextTermStart ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#059669">📅 Next Term Begins: ${params.nextTermStart}</p>` : ''}
            <p style="margin:0;font-size:12px;color:#94a3b8">This is an official digital report card from <strong>${params.schoolName}</strong></p>
            <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1">Delivered by APSIMS School Management System &nbsp;·&nbsp; apsims.vercel.app</p>
        </td>
    </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/* ─── POST Handler ─── */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            student_id, term_id, exam_type,
            to_email, to_name,
            custom_subject, custom_message,
        } = body;

        if (!student_id || !term_id || !to_email) {
            return NextResponse.json({ error: 'Missing required fields: student_id, term_id, to_email' }, { status: 400 });
        }

        // ─── SMTP Config ───
        const smtp = await getSmtpConfig();
        if (!smtp) {
            return NextResponse.json({ error: 'SMTP not configured. Set SMTP_USER and SMTP_PASS in environment variables.' }, { status: 500 });
        }

        const sb = getSb();

        // ─── Fetch all needed data ───
        const [studentRes, marksRes, termRes, schoolRes, gradesRes, subjectsRes] = await Promise.all([
            sb.from('school_students').select('*').eq('id', student_id).single(),
            sb.from('school_exam_marks').select('*,school_subjects(subject_name,subject_code)').eq('student_id', student_id).eq('term_id', term_id).eq('exam_type', exam_type || 'End-Term'),
            sb.from('school_terms').select('*').eq('id', term_id).single(),
            sb.from('school_details').select('*').limit(1).maybeSingle(),
            sb.from('school_grading_system').select('*').order('min_score', { ascending: false }),
            sb.from('school_subjects').select('*').eq('is_active', true),
        ]);

        const student    = studentRes.data;
        const marks      = marksRes.data || [];
        const term       = termRes.data;
        const school     = schoolRes.data;
        const grading    = gradesRes.data || [];

        if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        // ─── Get form/stream names ───
        let formName = '', streamName = '', classTeacher = '';
        const [formRes, streamRes] = await Promise.all([
            student.form_id ? sb.from('school_forms').select('form_name').eq('id', student.form_id).single() : Promise.resolve({ data: null }),
            student.stream_id ? sb.from('school_streams').select('stream_name').eq('id', student.stream_id).single() : Promise.resolve({ data: null }),
        ]);
        formName   = (formRes.data as any)?.form_name   || '';
        streamName = (streamRes.data as any)?.stream_name || '';

        // ─── Grading helper ───
        const getGrade = (score: number) => {
            const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
            const entry = sorted.find(g => score >= g.min_score);
            return entry || { grade: 'E', points: 1, remarks: 'Very Poor', color: '#7f1d1d' };
        };

        // ─── Build marks array ───
        const marksArr = marks.map((m: any) => {
            const score  = Number(m.score) || 0;
            const gradeEntry = getGrade(score);
            return {
                subject:  (m.school_subjects as any)?.subject_name || 'Unknown',
                code:     (m.school_subjects as any)?.subject_code || '',
                score,
                grade:    m.grade    || gradeEntry.grade,
                points:   m.points   || gradeEntry.points,
                remarks:  m.remarks  || gradeEntry.remarks || '',
            };
        });

        // ─── Compute averages ───
        const scores     = marksArr.map((m: any) => m.score).filter((s: number) => s > 0);
        const overallAvg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        const overallGradeEntry = getGrade(overallAvg);
        // Best 7 for mean grade (KCSE standard)
        const best7 = [...marksArr].sort((a: any, b: any) => b.score - a.score).slice(0, 7);
        const best7Points = best7.reduce((a: number, m: any) => a + (m.points || 0), 0);
        const meanPts = best7.length > 0 ? Math.round(best7Points / best7.length) : 0;
        const meanGradeEntry = [...grading].sort((a, b) => b.min_score - a.min_score).find(g => meanPts >= g.points) || { grade: 'E' };
        const meanGrade = (meanGradeEntry as any).grade || 'E';

        // ─── Attendance ───
        let attendanceRate = 0;
        try {
            const attRes = await sb.from('school_attendance').select('status').eq('student_id', student_id);
            const att = attRes.data || [];
            attendanceRate = att.length > 0 ? Math.round((att.filter((a: any) => a.status === 'Present').length / att.length) * 100) : 0;
        } catch {}

        // ─── Class ranking ───
        let classRank = 1, totalStudents = 1;
        try {
            const classMarksRes = await sb.from('school_exam_marks').select('student_id,score').eq('term_id', term_id).eq('exam_type', exam_type || 'End-Term');
            const classMarks = classMarksRes.data || [];
            const studentMap: Record<string, number[]> = {};
            classMarks.forEach((m: any) => {
                if (!studentMap[m.student_id]) studentMap[m.student_id] = [];
                studentMap[m.student_id].push(Number(m.score));
            });
            const avgs = Object.entries(studentMap).map(([sid, sc]) => ({ sid, avg: sc.reduce((a, b) => a + b, 0) / sc.length })).sort((a, b) => b.avg - a.avg);
            totalStudents = avgs.length;
            const myRank = avgs.findIndex(a => String(a.sid) === String(student_id));
            classRank = myRank >= 0 ? myRank + 1 : 1;
        } catch {}

        // ─── Build HTML ───
        const emailHtml = buildReportCardHtml({
            studentName:    `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`,
            guardianName:   student.guardian_name || to_name || 'Parent',
            admissionNo:    student.admission_no || student.admission_number || '',
            formName,
            streamName,
            termName:       term?.term_name || 'Term',
            examType:       exam_type || 'End-Term',
            schoolName:     school?.school_name || 'APSIMS School',
            schoolPhone:    school?.phone || school?.school_phone || '',
            schoolEmail:    school?.email || school?.school_email || '',
            schoolAddress:  school?.address || school?.school_address || '',
            logoUrl:        school?.logo_url || '',
            marks:          marksArr,
            classAvg:       overallAvg,
            classRank,
            totalStudents,
            overallAvg,
            overallGrade:   overallGradeEntry.grade,
            overallPoints:  marksArr.reduce((a: number, m: any) => a + (m.points || 0), 0),
            meanGrade,
            attendanceRate,
            classTeacher,
            principalComment: custom_message || (school as any)?.principal_comment || '',
            nextTermStart:  '',
        });

        // ─── Send via Gmail SMTP ───
        const transporter = nodemailer.createTransport({
            host:   smtp.host,
            port:   smtp.port,
            secure: smtp.port === 465,
            auth:   { user: smtp.user, pass: smtp.pass },
            tls:    { rejectUnauthorized: false },
        });

        const studentName = `${student.first_name} ${student.last_name}`;
        const mailSubject = custom_subject || `📋 ${studentName}'s ${term?.term_name || 'Term'} Report Card — ${school?.school_name || 'APSIMS'}`;

        await transporter.sendMail({
            from:    `"${smtp.fromName}" <${smtp.fromEmail}>`,
            to:      to_email,
            subject: mailSubject,
            html:    emailHtml,
        });

        // ─── Log delivery ───
        await sb.from('school_delivery_logs').insert({
            student_id,
            channel:     'email',
            recipient:   to_email,
            status:      'sent',
            report_type: 'report_card',
            term_id:     Number(term_id),
            sent_at:     new Date().toISOString(),
        });

        return NextResponse.json({ success: true, message: `Report card sent to ${to_email}` });

    } catch (err: any) {
        console.error('[ReportCard Email] Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 });
    }
}
