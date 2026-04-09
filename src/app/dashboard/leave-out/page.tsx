'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSearch, FiPrinter, FiDownload, FiSend, FiCheckCircle, FiAlertTriangle,
    FiClock, FiUser, FiPhone, FiArrowLeft, FiX, FiPlus, FiList, FiBarChart2
} from 'react-icons/fi';

const LEAVE_REASONS = ['Medication', 'Discipline', 'Personal', 'Emergency', 'Appointment', 'Illness', 'Family', 'Other'];

type LeaveTab = 'issue' | 'active' | 'reports';

export default function LeaveOutPage() {
    const [activeTab, setActiveTab] = useState<LeaveTab>('issue');
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [leaveOuts, setLeaveOuts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Issue form state
    const [search, setSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [reason, setReason] = useState('Medication');
    const [reasonDetails, setReasonDetails] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [issuing, setIssuing] = useState(false);
    const [generatedPass, setGeneratedPass] = useState<any>(null);

    // Report filters
    const [reportDateFrom, setReportDateFrom] = useState(new Date().toISOString().split('T')[0]);
    const [reportDateTo, setReportDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [reportSearch, setReportSearch] = useState('');
    const [reportReason, setReportReason] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, t, f, st, lo] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_leave_outs').select('*, school_students(id, first_name, last_name, admission_number, form_id, stream_id, guardian_phone, guardian_name)').order('created_at', { ascending: false }).limit(200),
        ]);
        setStudents(s.data || []);
        setTeachers(t.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setLeaveOuts(lo.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filteredStudents = search.length >= 2 ? students.filter(s =>
        `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8) : [];

    const activeLeaves = leaveOuts.filter(l => l.status === 'Out');

    const generateQRCode = (studentId: number) => {
        let h = 0;
        const r = `LEAVE${studentId}${Date.now()}`;
        for (let i = 0; i < r.length; i++) { h = ((h << 5) - h) + r.charCodeAt(i); h |= 0; }
        return `LO-${Math.abs(h).toString(36).toUpperCase().slice(0, 8)}`;
    };

    const handleIssueLeave = async () => {
        if (!selectedStudent) { toast.error('Please select a student'); return; }
        if (!teacherId) { toast.error('Please select the class teacher'); return; }
        setIssuing(true);

        const teacher = teachers.find(t => t.id === Number(teacherId));
        const qrCode = generateQRCode(selectedStudent.id);
        const now = new Date().toISOString();

        const payload = {
            student_id: selectedStudent.id,
            reason,
            reason_details: reasonDetails,
            class_teacher_id: Number(teacherId),
            teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : '',
            time_left: now,
            status: 'Out',
            sms_phone: selectedStudent.guardian_phone || '',
            qr_code: qrCode,
            created_by: 'admin',
        };

        const { data, error } = await supabase.from('school_leave_outs').insert([payload]).select().single();
        if (error) { toast.error('Failed to issue leave: ' + error.message); setIssuing(false); return; }

        // Auto-mark attendance as Excused
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase.from('school_daily_attendance')
            .select('id').eq('student_id', selectedStudent.id).eq('attendance_date', today).maybeSingle();

        if (existing) {
            await supabase.from('school_daily_attendance').update({ status: 'Excused', notes: `Leave Out: ${reason} - ${reasonDetails}` }).eq('id', existing.id);
        } else {
            await supabase.from('school_daily_attendance').insert([{
                student_id: selectedStudent.id,
                attendance_date: today,
                status: 'Excused',
                notes: `Leave Out: ${reason} - ${reasonDetails}`,
            }]);
        }

        const form = forms.find(f => f.id === selectedStudent.form_id);
        const stream = streams.find(s => s.id === selectedStudent.stream_id);

        setGeneratedPass({
            ...data,
            student: selectedStudent,
            teacher,
            form,
            stream,
            qrCode,
        });

        toast.success('Leave out issued & attendance marked as Excused');
        fetchAll();
        setIssuing(false);
    };

    const handleMarkReturned = async (leaveId: number) => {
        const { error } = await supabase.from('school_leave_outs')
            .update({ status: 'Returned', time_returned: new Date().toISOString() })
            .eq('id', leaveId);
        if (error) { toast.error('Failed'); return; }
        toast.success('Student marked as returned');
        fetchAll();
    };

    const handleSendSMS = (leave: any) => {
        const student = leave.student || leave.school_students;
        const phone = student?.guardian_phone || leave.sms_phone || '';
        const name = student ? `${student.first_name} ${student.last_name}` : 'Student';
        const admNo = student?.admission_number || '';
        const time = new Date(leave.time_left).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
        const msg = `APSIMS: Dear parent/guardian, ${name} (${admNo}) has been given leave out at ${time}. Reason: ${leave.reason}${leave.reason_details ? ' - ' + leave.reason_details : ''}. Please ensure they arrive home safely.`;

        // Simulated SMS - log to console
        console.log('SMS to', phone, ':', msg);
        toast.success(`SMS ready for ${phone || 'N/A'}\n${msg}`, { duration: 6000, style: { maxWidth: '600px', fontSize: '12px' } });

        // Mark sms_sent
        supabase.from('school_leave_outs').update({ sms_sent: true }).eq('id', leave.id).then(() => fetchAll());
    };

    const printPass = () => {
        if (!generatedPass) return;
        const gp = generatedPass;
        const st = gp.student;
        const dateStr = new Date(gp.time_left).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = new Date(gp.time_left).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`APSIMS-LEAVE|${st?.admission_number}|${gp.reason}|${gp.qrCode}`)}`;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Leave Out Pass</title>
<style>@page{size:A5 portrait;margin:8mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;padding:0;background:#fff}
.pass{width:100%;max-width:130mm;margin:0 auto;border:2px solid #d1d5db;border-radius:8px;overflow:hidden}
.hdr{background:linear-gradient(135deg,#ea580c,#d97706);color:#fff;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hdr-left{display:flex;align-items:center;gap:10px}.hdr h2{font-size:16px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.hdr p{font-size:9px;color:#fed7aa}
.logo-circle{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;overflow:hidden}
.logo-circle img{width:36px;height:36px;border-radius:50%;object-fit:cover}
.qr-box{text-align:right}.qr-box img{width:50px;height:50px;border-radius:4px;border:2px solid rgba(255,255,255,0.3)}.qr-box p{font-size:7px;font-family:monospace;margin-top:2px;color:#fed7aa}
.sec{padding:10px 16px;border-bottom:1px solid #e5e7eb}.sec:last-child{border-bottom:none}
.row{display:flex;gap:12px;flex-wrap:wrap}.col{flex:1;min-width:120px}
.lbl{font-size:10px;color:#9ca3af;margin-bottom:1px}.val{font-size:12px;font-weight:700;color:#1f2937}
.reason-val{color:#ea580c;font-weight:800}.detail-text{font-size:11px;color:#ea580c;margin-top:5px;line-height:1.4}
.sig-row{display:flex;justify-content:space-between;margin-top:12px;align-items:flex-end}
.sig-block{text-align:left}.sig-label{font-size:8px;text-transform:uppercase;font-weight:800;color:#9ca3af;letter-spacing:0.5px;margin-bottom:3px}
.sig-line{border-bottom:2px solid #9ca3af;width:160px;height:24px}.date-line{border-bottom:2px solid #9ca3af;width:110px;height:24px;display:flex;align-items:flex-end;padding-bottom:2px;font-size:10px;color:#6b7280;font-weight:600}
.parent-sec{background:#fff7ed;padding:10px 16px;border-bottom:1px solid #e5e7eb;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.parent-title{font-size:9px;font-weight:800;text-transform:uppercase;color:#78350f;letter-spacing:0.5px;margin-bottom:5px}
.ftr{background:#f9fafb;padding:5px 16px;display:flex;justify-content:space-between;font-size:7px;color:#9ca3af;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{body{padding:0}.pass{border:1.5px solid #999;max-width:130mm}.hdr,.parent-sec,.ftr{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="pass">
<div class="hdr"><div class="hdr-left"><div class="logo-circle"><img src="/school_logo.png" alt="Logo"/></div><div><h2>ALPHA SCHOOL</h2><p>Student Leave Out Pass</p></div></div><div class="qr-box"><img src="${qrUrl}" alt="QR"/><p>${gp.qrCode}</p></div></div>
<div class="sec"><div class="row"><div class="col"><span class="lbl">Student Name:</span> <span class="val">${st?.first_name || ''} ${st?.middle_name || ''} ${st?.last_name || ''}</span></div><div class="col"><span class="lbl">Adm No:</span> <span class="val">${st?.admission_number || ''}</span></div></div><div class="row" style="margin-top:8px"><div class="col"><span class="lbl">Form:</span> <span class="val">${gp.form?.form_name || '-'}</span></div><div class="col"><span class="lbl">Stream:</span> <span class="val">${gp.stream?.stream_name || '-'}</span></div></div></div>
<div class="sec"><div class="row"><div class="col"><span class="lbl">Reason:</span> <span class="val reason-val">${gp.reason}</span></div><div class="col"><span class="lbl">Time Left:</span> <span class="val">${dateStr}, ${timeStr}</span></div></div>${gp.reason_details ? `<div class="detail-text"><span class="lbl">Details:</span> ${gp.reason_details}</div>` : ''}</div>
<div class="sec"><div class="row"><div class="col"><span class="lbl">Class Teacher:</span> <span class="val">${gp.teacher?.first_name || ''} ${gp.teacher?.last_name || ''}</span></div><div class="col"><span class="lbl">Staff No:</span> <span class="val">${gp.teacher?.staff_no || '-'}</span></div></div><div class="sig-row"><div class="sig-block"><div class="sig-label">Teacher Signature</div><div class="sig-line"></div></div><div class="sig-block"><div class="sig-label">Date</div><div class="date-line">${dateStr}</div></div></div></div>
<div class="parent-sec"><div class="parent-title">Parent/Guardian Notification</div><div class="row"><div class="col"><span class="lbl">Guardian:</span> <span class="val">${st?.guardian_name || '_______________'}</span></div><div class="col"><span class="lbl">Phone:</span> <span class="val">${st?.guardian_phone || '_______________'}</span></div></div><div style="font-size:9px;color:#9ca3af;margin-top:4px">${gp.sms_sent ? 'SMS notification sent' : 'SMS not yet sent'}</div></div>
<div class="ftr"><span>APSIMS &middot; Leave Out Pass</span><span>Verified: ${gp.qrCode}</span><span>Computer-generated document</span></div>
</div></body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 500);
    };

    // Report filtering
    const filteredReports = leaveOuts.filter(l => {
        const d = new Date(l.created_at).toISOString().split('T')[0];
        if (d < reportDateFrom || d > reportDateTo) return false;
        if (reportReason && l.reason !== reportReason) return false;
        if (reportSearch) {
            const st = l.school_students;
            if (!st) return false;
            const txt = `${st.first_name} ${st.last_name} ${st.admission_number || ''}`.toLowerCase();
            if (!txt.includes(reportSearch.toLowerCase())) return false;
        }
        return true;
    });

    const exportCSV = () => {
        const headers = ['#', 'Date', 'Time Left', 'Adm No', 'Student', 'Form', 'Reason', 'Details', 'Teacher', 'Status', 'Returned'];
        const rows = filteredReports.map((l, i) => {
            const st = l.school_students;
            const form = forms.find((f: any) => f.id === st?.form_id);
            return [
                i + 1,
                new Date(l.created_at).toLocaleDateString(),
                new Date(l.time_left).toLocaleTimeString(),
                st?.admission_number || '',
                st ? `${st.first_name} ${st.last_name}` : '',
                form?.form_name || '',
                l.reason,
                l.reason_details || '',
                l.teacher_name || '',
                l.status,
                l.time_returned ? new Date(l.time_returned).toLocaleTimeString() : '',
            ];
        });
        const csv = [headers.join(','), ...rows.map((r: any) => r.map((c: any) => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `leave_out_report_${reportDateFrom}_${reportDateTo}.csv`; a.click();
        toast.success('Exported');
    };

    // Stats
    const todayLeaves = leaveOuts.filter(l => new Date(l.created_at).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]);
    const reasonStats: Record<string, number> = {};
    todayLeaves.forEach(l => { reasonStats[l.reason] = (reasonStats[l.reason] || 0) + 1; });

    const TABS: { key: LeaveTab; label: string; icon: any; desc: string }[] = [
        { key: 'issue', label: 'Issue Leave Out', icon: FiPlus, desc: 'Create a new leave out pass' },
        { key: 'active', label: 'Active Leave Outs', icon: FiClock, desc: 'Students currently out' },
        { key: 'reports', label: 'Leave Out Reports', icon: FiBarChart2, desc: 'Historical records & search' },
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Leave Out...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiArrowLeft className="text-orange-500" /> Leave Out Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Issue leave out passes, notify parents, auto-mark attendance</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold">
                        <FiClock className="inline mr-1" size={14} /> {activeLeaves.length} Currently Out
                    </div>
                    <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold">
                        {todayLeaves.length} Today
                    </div>
                </div>
            </div>

            {/* Stats */}
            {todayLeaves.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {LEAVE_REASONS.map(r => (
                        <div key={r} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-gray-800">{reasonStats[r] || 0}</p>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5">{r}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            activeTab === tab.key
                                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
                        }`}>
                        <tab.icon size={15} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB: Issue Leave Out */}
            {activeTab === 'issue' && (
                <div className="space-y-4">
                    {!generatedPass ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                                <h3 className="font-bold text-lg flex items-center gap-2"><FiPlus size={18} /> Issue New Leave Out Pass</h3>
                                <p className="text-orange-100 text-sm mt-1">Search student, select reason, and generate an official leave out pass</p>
                            </div>

                            {/* Student Search */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Search Student *</label>
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                                    <input type="text" value={search} onChange={e => { setSearch(e.target.value); setSelectedStudent(null); }}
                                        placeholder="Type admission number or student name..."
                                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-400 outline-none" />
                                </div>
                                {filteredStudents.length > 0 && !selectedStudent && (
                                    <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-52 overflow-y-auto">
                                        {filteredStudents.map(s => {
                                            const form = forms.find((f: any) => f.id === s.form_id);
                                            return (
                                                <button key={s.id} onClick={() => { setSelectedStudent(s); setSearch(`${s.admission_number} - ${s.first_name} ${s.last_name}`); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 border-b border-gray-100 text-sm flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                                                        {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-gray-800">{s.admission_number}</span>
                                                        <span className="mx-2 text-gray-300">|</span>
                                                        <span>{s.first_name} {s.last_name}</span>
                                                        <span className="ml-2 text-xs text-gray-400">{form?.form_name || ''}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Selected Student Card */}
                            {selectedStudent && (
                                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                                            {selectedStudent.first_name?.charAt(0)}{selectedStudent.last_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 text-lg">{selectedStudent.first_name} {selectedStudent.middle_name || ''} {selectedStudent.last_name}</h4>
                                            <div className="flex gap-4 text-sm text-gray-500 mt-0.5">
                                                <span><strong>Adm:</strong> {selectedStudent.admission_number}</span>
                                                <span><strong>Form:</strong> {forms.find((f: any) => f.id === selectedStudent.form_id)?.form_name || '-'}</span>
                                                <span><strong>Stream:</strong> {streams.find((s: any) => s.id === selectedStudent.stream_id)?.stream_name || '-'}</span>
                                            </div>
                                            <div className="flex gap-4 text-xs text-gray-400 mt-1">
                                                <span><FiUser className="inline mr-1" size={11} />Guardian: {selectedStudent.guardian_name || 'N/A'}</span>
                                                <span><FiPhone className="inline mr-1" size={11} />Phone: {selectedStudent.guardian_phone || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedStudent(null); setSearch(''); }} className="text-gray-400 hover:text-red-500"><FiX size={18} /></button>
                                    </div>
                                </div>
                            )}

                            {/* Reason & Teacher */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Reason for Leave *</label>
                                    <select value={reason} onChange={e => setReason(e.target.value)}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-400 outline-none">
                                        {LEAVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Class Teacher *</label>
                                    <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-400 outline-none">
                                        <option value="">Select Teacher</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} {t.staff_no ? `(${t.staff_no})` : ''}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Details / Description</label>
                                <textarea value={reasonDetails} onChange={e => setReasonDetails(e.target.value)}
                                    placeholder="E.g. Student feels unwell, parent notified, going to hospital..."
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-400 outline-none h-20 resize-none" />
                            </div>

                            <button onClick={handleIssueLeave} disabled={issuing || !selectedStudent || !teacherId}
                                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                                style={{ background: issuing ? '#94a3b8' : 'linear-gradient(135deg, #f97316, #d97706)' }}>
                                {issuing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> :
                                    <><FiCheckCircle size={16} /> Issue Leave Out Pass &amp; Mark Attendance</>}
                            </button>
                        </div>
                    ) : (
                        /* Generated Pass View */
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <button onClick={() => { setGeneratedPass(null); setSelectedStudent(null); setSearch(''); setReasonDetails(''); }}
                                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
                                    <FiPlus size={14} /> New Leave Out
                                </button>
                                <button onClick={printPass} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
                                    <FiPrinter size={14} /> Print Pass
                                </button>
                                <button onClick={() => handleSendSMS(generatedPass)}
                                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                    <FiSend size={14} /> Send SMS to Parent
                                </button>
                            </div>

                            <div id="leave-pass-print" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", maxWidth: 640, margin: '0 auto', border: '2px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                                {/* Header - Orange Bar */}
                                <div style={{ background: 'linear-gradient(135deg, #ea580c, #d97706)', color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            <img src="/school_logo.png" alt="Logo" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                                        </div>
                                        <div>
                                            <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' as const, margin: 0 }}>ALPHA SCHOOL</h2>
                                            <p style={{ fontSize: 10, color: '#fed7aa', margin: 0 }}>Student Leave Out Pass</p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`APSIMS-LEAVE|${generatedPass.student?.admission_number}|${generatedPass.reason}|${generatedPass.qrCode}`)}`} alt="QR" style={{ width: 56, height: 56, borderRadius: 4, border: '2px solid rgba(255,255,255,0.3)' }} />
                                        <p style={{ fontSize: 8, fontFamily: 'monospace', marginTop: 2, color: '#fed7aa' }}>{generatedPass.qrCode}</p>
                                    </div>
                                </div>
                                {/* Student Info */}
                                <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Student Name:</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{generatedPass.student?.first_name} {generatedPass.student?.middle_name || ''} {generatedPass.student?.last_name}</span></div>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Adm No:</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{generatedPass.student?.admission_number}</span></div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Form:</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{generatedPass.form?.form_name || '-'}</span></div>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Stream:</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{generatedPass.stream?.stream_name || '-'}</span></div>
                                    </div>
                                </div>
                                {/* Reason & Time */}
                                <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Reason:</span> <span style={{ fontSize: 14, fontWeight: 800, color: '#ea580c' }}>{generatedPass.reason}</span></div>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Time Left:</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{new Date(generatedPass.time_left).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(generatedPass.time_left).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                    </div>
                                    {generatedPass.reason_details && (
                                        <div style={{ marginTop: 8, fontSize: 12, color: '#ea580c', lineHeight: 1.5 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Details:</span> {generatedPass.reason_details}</div>
                                    )}
                                </div>
                                {/* Teacher & Signature */}
                                <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Class Teacher:</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{generatedPass.teacher?.first_name} {generatedPass.teacher?.last_name}</span></div>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Staff No:</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{generatedPass.teacher?.staff_no || '-'}</span></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, alignItems: 'flex-end' }}>
                                        <div>
                                            <p style={{ fontSize: 9, textTransform: 'uppercase' as const, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 4 }}>Teacher Signature</p>
                                            <div style={{ borderBottom: '2px solid #9ca3af', width: 200, height: 28 }} />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 9, textTransform: 'uppercase' as const, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 4 }}>Date</p>
                                            <div style={{ borderBottom: '2px solid #9ca3af', width: 140, height: 28, display: 'flex', alignItems: 'flex-end', paddingBottom: 2, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                </div>
                                {/* Parent/Guardian */}
                                <div style={{ background: '#fff7ed', padding: '12px 20px', borderBottom: '1px solid #e5e7eb' }}>
                                    <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, color: '#78350f', letterSpacing: 0.5, marginBottom: 6 }}>Parent/Guardian Notification</p>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Guardian:</span> <span style={{ fontSize: 13, fontWeight: 700 }}>{generatedPass.student?.guardian_name || '_______________'}</span></div>
                                        <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Phone:</span> <span style={{ fontSize: 13, fontWeight: 700 }}>{generatedPass.student?.guardian_phone || '_______________'}</span></div>
                                    </div>
                                    <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>{generatedPass.sms_sent ? 'SMS notification sent' : 'SMS not yet sent'}</p>
                                </div>
                                {/* Footer */}
                                <div style={{ background: '#f9fafb', padding: '6px 20px', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af' }}>
                                    <span>APSIMS &middot; Leave Out Pass</span>
                                    <span>Verified: {generatedPass.qrCode}</span>
                                    <span>Computer-generated document</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Active Leave Outs */}
            {activeTab === 'active' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-orange-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiClock size={16} className="text-orange-500" /> Students Currently Out</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{activeLeaves.length} student(s) currently on leave out</p>
                        </div>
                    </div>
                    {activeLeaves.length === 0 ? (
                        <div className="p-16 text-center text-gray-400">
                            <FiCheckCircle size={40} className="mx-auto mb-3 text-green-300" />
                            <p className="font-medium text-gray-600">All students are in school</p>
                            <p className="text-sm mt-1">No active leave outs</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Reason</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Time Left</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Duration</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">SMS</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeLeaves.map((l, i) => {
                                        const st = l.school_students;
                                        const mins = Math.round((Date.now() - new Date(l.time_left).getTime()) / 60000);
                                        const hrs = Math.floor(mins / 60);
                                        const durStr = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
                                        return (
                                            <tr key={l.id} className="border-b border-gray-100 hover:bg-orange-50/30">
                                                <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-semibold text-blue-600">{st?.admission_number || '-'}</td>
                                                <td className="px-4 py-2.5 font-medium">{st ? `${st.first_name} ${st.last_name}` : '-'}</td>
                                                <td className="px-4 py-2.5 text-center"><span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-orange-100 text-orange-700">{l.reason}</span></td>
                                                <td className="px-4 py-2.5 text-center text-xs">{new Date(l.time_left).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="px-4 py-2.5 text-center"><span className={`text-xs font-bold ${mins > 120 ? 'text-red-600' : mins > 60 ? 'text-amber-600' : 'text-green-600'}`}>{durStr}</span></td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {l.sms_sent ? <span className="text-green-600 text-xs font-bold">Sent</span> :
                                                        <button onClick={() => handleSendSMS(l)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mx-auto"><FiSend size={11} /> Send</button>}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <button onClick={() => handleMarkReturned(l.id)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 transition-all flex items-center gap-1 mx-auto">
                                                        <FiCheckCircle size={12} /> Returned
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Reports */}
            {activeTab === 'reports' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">From Date</label>
                                <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">To Date</label>
                                <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Search Student / Adm No</label>
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                    <input type="text" value={reportSearch} onChange={e => setReportSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Reason</label>
                                <select value={reportReason} onChange={e => setReportReason(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 outline-none">
                                    <option value="">All Reasons</option>
                                    {LEAVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={exportCSV} className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5">
                                    <FiDownload size={14} /> Export CSV
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiList size={16} /> Leave Out Records</h3>
                            <span className="text-xs text-gray-500 font-medium">{filteredReports.length} record(s)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Reason</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Details</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Time Left</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Returned</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Teacher</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">SMS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReports.length === 0 ? (
                                        <tr><td colSpan={11} className="text-center py-12 text-gray-400">No leave out records found for the selected filters</td></tr>
                                    ) : filteredReports.map((l, i) => {
                                        const st = l.school_students;
                                        return (
                                            <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-xs">{new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-4 py-2.5 font-semibold text-blue-600">{st?.admission_number || '-'}</td>
                                                <td className="px-4 py-2.5 font-medium">{st ? `${st.first_name} ${st.last_name}` : '-'}</td>
                                                <td className="px-4 py-2.5 text-center"><span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-orange-100 text-orange-700">{l.reason}</span></td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[150px] truncate">{l.reason_details || '-'}</td>
                                                <td className="px-4 py-2.5 text-center text-xs">{new Date(l.time_left).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="px-4 py-2.5 text-center text-xs">{l.time_returned ? new Date(l.time_returned).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="px-4 py-2.5 text-center text-xs">{l.teacher_name || '-'}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${l.status === 'Out' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{l.status}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-xs">{l.sms_sent ? <span className="text-green-600 font-bold">Yes</span> : <span className="text-gray-400">No</span>}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
