'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiDownload, FiUser, FiDollarSign, FiCalendar, FiBook, FiCheckCircle, FiRefreshCw, FiPhone, FiMail, FiSearch } from 'react-icons/fi';

export default function ParentPortalPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview'|'fees'|'attendance'|'marks'>('overview');

  const searchByPhone = async () => {
    if (!phone.trim() || phone.length < 9) { toast.error('Enter a valid phone number'); return; }
    setSearching(true);
    const normalized = phone.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
    const { data, error } = await supabase
      .from('school_students')
      .select('*, school_forms(form_name,form_level), school_terms(term_name)')
      .or(`guardian_phone.ilike.%${phone}%,guardian_phone.ilike.%${normalized}%`)
      .eq('status', 'Active');
    if (error || !data || data.length === 0) {
      toast.error('No students found for this phone number. Please contact the school office.');
      setSearching(false); return;
    }
    setStudents(data);
    setSelected(data[0]);
    setAuthenticated(true);
    setSearching(false);
    fetchStudentData(data[0].id);
  };

  const fetchStudentData = async (studentId: number) => {
    setLoading(true);
    const [payR, balR, attR, markR] = await Promise.all([
      supabase.from('school_fee_payments').select('*').eq('student_id', studentId).order('payment_date', { ascending: false }).limit(20),
      supabase.from('school_fee_balances').select('*').eq('student_id', studentId).single(),
      supabase.from('school_daily_attendance').select('*').eq('student_id', studentId).order('attendance_date', { ascending: false }).limit(30),
      supabase.from('school_exam_marks').select('*, school_subjects(subject_name)').eq('student_id', studentId).order('created_at', { ascending: false }).limit(30),
    ]);
    setPayments(payR.data || []);
    setBalance(balR.data || null);
    setAttendance(attR.data || []);
    setMarks(markR.data || []);
    setLoading(false);
  };

  const selectStudent = (s: any) => {
    setSelected(s);
    setActiveTab('overview');
    fetchStudentData(s.id);
  };

  const printStatement = () => window.print();

  const attPct = attendance.length > 0
    ? Math.round(attendance.filter(a => a.status === 'Present').length / attendance.length * 100)
    : 0;

  const avgMark = marks.length > 0
    ? Math.round(marks.reduce((s, m) => s + Number(m.marks || 0), 0) / marks.length)
    : 0;

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg,#eef2ff,#e0e7ff,#f0fdf4)' }}>
        <Toaster position="top-center" />
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="px-8 py-8 text-center" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed,#6366f1)' }}>
            <div className="text-5xl mb-3">🏫</div>
            <h1 className="text-2xl font-extrabold text-white">Parent Portal</h1>
            <p className="text-indigo-200 text-sm mt-1">Access your child's school records</p>
            <p className="text-indigo-300 text-xs mt-0.5">Powered by APSIMS</p>
          </div>
          <div className="px-8 py-8 space-y-5">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-indigo-800 mb-1">🔐 Secure Access</p>
              <p className="text-xs text-indigo-600">Enter the phone number you registered with the school to access your child's records</p>
            </div>
            <div>
              <label className="text-xs font-black text-gray-600 block mb-2">📱 Guardian Phone Number</label>
              <div className="flex gap-2">
                <input
                  value={phone} onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchByPhone()}
                  placeholder="e.g. 0712 345 678"
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition font-medium"
                />
                <button onClick={searchByPhone} disabled={searching}
                  className="px-5 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 transition shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                  {searching ? <FiRefreshCw size={16} className="animate-spin" /> : '→'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: '💰', label: 'Fee Balances & Receipts' },
                { icon: '📊', label: 'Exam Results & Report Cards' },
                { icon: '✅', label: 'Attendance Records' },
              ].map(f => (
                <div key={f.label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <p className="text-[9px] text-gray-500 font-semibold leading-tight">{f.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-center">Having trouble? Call the school office or visit in person.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#312e81,#4f46e5,#6366f1)' }}>
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-inner">👨‍👩‍👧</div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Parent Portal</h1>
                <p className="text-indigo-200 text-sm">{students.length} child{students.length !== 1 ? 'ren' : ''} found · Phone: {phone}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={printStatement} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition">
                <FiDownload size={14} /> Download Statement
              </button>
              <button onClick={() => { setAuthenticated(false); setStudents([]); setSelected(null); setPhone(''); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50 transition shadow">
                🔄 Switch
              </button>
            </div>
          </div>

          {/* Multi-student switcher */}
          {students.length > 1 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {students.map(s => (
                <button key={s.id} onClick={() => selectStudent(s)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition ${selected?.id === s.id ? 'bg-white text-indigo-700 border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`}>
                  <div className="w-6 h-6 rounded-full bg-indigo-300 flex items-center justify-center text-indigo-900 text-xs font-black">{s.first_name.charAt(0)}</div>
                  {s.first_name} {s.last_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <>
          {/* Student card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
                {selected.first_name.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-gray-900">{selected.first_name} {selected.last_name}</h2>
                <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-600">
                  <span>📋 Adm: <strong>{selected.admission_no || selected.admission_number || '—'}</strong></span>
                  <span>🎓 {(selected.school_forms as any)?.form_name || '—'}</span>
                  <span>📅 Joined: {selected.admission_date ? new Date(selected.admission_date).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : '—'}</span>
                </div>
              </div>
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 sm:min-w-64">
                {[
                  { label: 'Attendance', value: `${attPct}%`, color: attPct >= 80 ? '#16a34a' : '#dc2626', icon: '✅' },
                  { label: 'Avg Mark', value: `${avgMark}%`, color: avgMark >= 50 ? '#2563eb' : '#d97706', icon: '📊' },
                  { label: 'Paid', value: `KES ${totalPaid.toLocaleString()}`, color: '#16a34a', icon: '💰' },
                ].map(s => (
                  <div key={s.label} className="text-center bg-gray-50 rounded-xl p-2.5">
                    <div className="text-base">{s.icon}</div>
                    <div className="text-sm font-black mt-0.5" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[9px] text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            {([['overview','🏠 Overview'],['fees','💰 Fees & Payments'],['attendance','✅ Attendance'],['marks','📊 Results']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setActiveTab(v)}
                className={`flex-1 py-2.5 text-xs font-bold transition ${activeTab === v ? 'bg-indigo-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
          ) : activeTab === 'overview' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fee summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-black text-gray-800 mb-3 flex items-center gap-2"><span>💰</span> Fee Summary</h3>
                <div className="space-y-2">
                  {balance ? (
                    <>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Total Billed</span><span className="font-bold">KES {Number(balance.total_billed || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Total Paid</span><span className="font-bold text-green-600">KES {Number(balance.total_paid || 0).toLocaleString()}</span></div>
                      <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-black">
                        <span className={Number(balance.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}>Balance Due</span>
                        <span className={Number(balance.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}>KES {Number(balance.balance_due || 0).toLocaleString()}</span>
                      </div>
                      {Number(balance.balance_due) > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-3">
                          <p className="text-xs font-bold text-red-700">⚠️ Outstanding balance of KES {Number(balance.balance_due).toLocaleString()}</p>
                          <p className="text-[10px] text-red-600 mt-0.5">Please pay via M-Pesa Paybill. Contact the Bursar for details.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Total Paid This Year</span><span className="font-bold text-green-600">KES {totalPaid.toLocaleString()}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Payments Made</span><span className="font-bold">{payments.length}</span></div>
                    </>
                  )}
                </div>
              </div>
              {/* Recent activity */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-black text-gray-800 mb-3 flex items-center gap-2"><span>🕒</span> Recent Activity</h3>
                <div className="space-y-2.5">
                  {payments.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center text-sm flex-shrink-0">💳</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{p.payment_type || 'Fee Payment'}</p>
                        <p className="text-[10px] text-gray-400">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <span className="text-xs font-black text-green-600">+KES {Number(p.amount).toLocaleString()}</span>
                    </div>
                  ))}
                  {attendance.slice(0, 2).map(a => (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${a.status === 'Present' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {a.status === 'Present' ? '✅' : '❌'}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-800">{a.status}</p>
                        <p className="text-[10px] text-gray-400">{new Date(a.attendance_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && attendance.length === 0 && <p className="text-sm text-gray-400 text-center py-3">No recent activity</p>}
                </div>
              </div>
              {/* Contact school */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5 sm:col-span-2">
                <h3 className="font-black text-indigo-800 mb-3">📞 Contact School</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: '📞', label: 'Call Office', action: 'tel:+254000000000' },
                    { icon: '💬', label: 'WhatsApp', action: 'https://wa.me/254000000000' },
                    { icon: '✉️', label: 'Email', action: 'mailto:school@apsims.co.ke' },
                    { icon: '📍', label: 'Visit Us', action: '#' },
                  ].map(c => (
                    <a key={c.label} href={c.action}
                      className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition text-center">
                      <span className="text-2xl">{c.icon}</span>
                      <span className="text-xs font-bold text-indigo-700">{c.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'fees' ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div><h3 className="font-black text-gray-800">Fee Payment History</h3><p className="text-xs text-gray-500">{payments.length} transactions · Total: KES {totalPaid.toLocaleString()}</p></div>
                <button onClick={printStatement} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition">
                  <FiDownload size={13} /> Download
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {payments.length === 0 ? <div className="py-12 text-center text-gray-400">No payments recorded yet</div>
                : payments.map(p => (
                  <div key={p.id} className="px-5 py-4 flex items-center gap-4 hover:bg-green-50/20 transition">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0">💳</div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">{p.payment_type || 'School Fees'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(p.payment_date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {p.reference_number && <p className="text-[10px] text-gray-400 font-mono mt-0.5">Ref: {p.reference_number}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-green-600">KES {Number(p.amount).toLocaleString()}</p>
                      <p className="text-[9px] text-gray-400">{p.payment_method || 'M-Pesa'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'attendance' ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-black text-gray-800">Attendance Record</h3>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-green-600 font-bold">✅ {attendance.filter(a=>a.status==='Present').length} Present</span>
                  <span className="text-red-600 font-bold">❌ {attendance.filter(a=>a.status==='Absent').length} Absent</span>
                  <span className="text-amber-600 font-bold">⏰ {attendance.filter(a=>a.status==='Late').length} Late</span>
                  <span className="font-black text-gray-700">Overall: {attPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${attPct}%`, background: attPct >= 80 ? '#22c55e' : attPct >= 60 ? '#f59e0b' : '#ef4444' }} />
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {attendance.map(a => (
                  <div key={a.id} className={`px-5 py-3 flex items-center gap-3 ${a.status==='Absent'?'bg-red-50/20':a.status==='Late'?'bg-amber-50/20':''}`}>
                    <span className="text-lg flex-shrink-0">{a.status==='Present'?'✅':a.status==='Absent'?'❌':'⏰'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{new Date(a.attendance_date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${a.status==='Present'?'bg-green-100 text-green-700':a.status==='Absent'?'bg-red-100 text-red-600':'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                  </div>
                ))}
                {attendance.length === 0 && <div className="py-12 text-center text-gray-400">No attendance records found</div>}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-black text-gray-800">Exam Results</h3>
                <p className="text-xs text-gray-500">{marks.length} results · Average: {avgMark}%</p>
              </div>
              <div className="divide-y divide-gray-50">
                {marks.length === 0 ? <div className="py-12 text-center text-gray-400">No exam results yet</div>
                : marks.map(m => {
                  const pct = Number(m.marks || 0);
                  const grade = pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'E';
                  const gradeColor = pct >= 75 ? '#16a34a' : pct >= 60 ? '#2563eb' : pct >= 50 ? '#d97706' : '#dc2626';
                  return (
                    <div key={m.id} className="px-5 py-4 flex items-center gap-4 hover:bg-indigo-50/20 transition">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white flex-shrink-0 text-sm" style={{ background: gradeColor }}>{grade}</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm">{(m.school_subjects as any)?.subject_name || 'Subject'}</p>
                        {m.exam_name && <p className="text-xs text-gray-500">{m.exam_name}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black" style={{ color: gradeColor }}>{pct}%</p>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: gradeColor }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
