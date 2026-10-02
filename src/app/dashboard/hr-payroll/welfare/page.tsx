'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiDownload, FiHeart, FiGift, FiShield, FiDollarSign, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

const BENEFIT_TYPES = ['Medical Cover', 'Group Life Insurance', 'NHIF', 'NSSF', 'Pension Contribution', 'House Allowance', 'Transport Allowance', 'Hardship Allowance', 'Education Grant', 'Uniform Allowance', 'Airtime Allowance', 'Sports/Wellness Fund', 'Staff Loan', 'Emergency Fund', 'Car Allowance'];

const WELFARE_EVENT_TYPES = ['Wedding Gift', 'Baby Shower Gift', 'Bereavement Support', 'Sick Visit', 'Birthday Recognition', 'Long Service Award', 'Retirement Gift', 'Staff Party', 'Team Building', 'Medical Emergency Support', 'Education Sponsorship'];

const BENEFIT_COLOR: Record<string, string> = {
  'Medical Cover': '#0891b2', 'NHIF': '#0284c7', 'NSSF': '#2563eb', 'Group Life Insurance': '#7c3aed',
  'Pension Contribution': '#db2777', 'House Allowance': '#16a34a', 'Transport Allowance': '#059669',
  'Staff Loan': '#d97706', 'Emergency Fund': '#dc2626', 'Education Grant': '#6366f1',
};

const TABS = [
  { id: 'benefits', label: '💰 Benefits & Allowances', icon: '💰' },
  { id: 'welfare', label: '🤝 Welfare Events', icon: '🤝' },
  { id: 'medical', label: '🏥 Medical Claims', icon: '🏥' },
  { id: 'loans', label: '💳 Staff Loans', icon: '💳' },
  { id: 'analytics', label: '📊 Analytics', icon: '📊' },
] as const;
type TabId = typeof TABS[number]['id'];

export default function StaffWelfarePage() {
  const [benefits, setBenefits] = useState<any[]>([]);
  const [welfareEvents, setWelfareEvents] = useState<any[]>([]);
  const [medicalClaims, setMedicalClaims] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('benefits');
  const [search, setSearch] = useState('');

  // Benefit modal
  const [showBenModal, setShowBenModal] = useState(false);
  const [editBenId, setEditBenId] = useState<number | null>(null);
  const emptyBen = { staff_id: '', benefit_type: 'Medical Cover', amount: 0, frequency: 'Monthly', provider: '', policy_number: '', start_date: '', end_date: '', is_active: true, notes: '' };
  const [benForm, setBenForm] = useState(emptyBen);

  // Welfare modal
  const [showWelModal, setShowWelModal] = useState(false);
  const [editWelId, setEditWelId] = useState<number | null>(null);
  const emptyWel = { staff_id: '', event_type: 'Wedding Gift', event_date: new Date().toISOString().split('T')[0], amount: 0, description: '', contributed_by: 'School', status: 'Completed' };
  const [welForm, setWelForm] = useState(emptyWel);

  // Medical claim modal
  const [showMedModal, setShowMedModal] = useState(false);
  const [editMedId, setEditMedId] = useState<number | null>(null);
  const emptyMed = { staff_id: '', claim_date: new Date().toISOString().split('T')[0], hospital: '', diagnosis: '', amount_claimed: 0, amount_approved: 0, status: 'Pending', receipt_no: '', notes: '' };
  const [medForm, setMedForm] = useState(emptyMed);

  // Loan modal
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editLoanId, setEditLoanId] = useState<number | null>(null);
  const emptyLoan = { staff_id: '', loan_amount: 0, interest_rate: 0, disbursed_date: new Date().toISOString().split('T')[0], monthly_repayment: 0, months_remaining: 0, amount_paid: 0, status: 'Active', purpose: '' };
  const [loanForm, setLoanForm] = useState(emptyLoan);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [bR, wR, mR, lR, sR] = await Promise.all([
      supabase.from('school_staff_benefits').select('*, school_teachers(first_name,last_name,tsc_number,role)').order('created_at', { ascending: false }),
      supabase.from('school_staff_welfare_events').select('*, school_teachers(first_name,last_name)').order('event_date', { ascending: false }),
      supabase.from('school_staff_medical_claims').select('*, school_teachers(first_name,last_name)').order('claim_date', { ascending: false }),
      supabase.from('school_staff_loans').select('*, school_teachers(first_name,last_name,tsc_number)').order('disbursed_date', { ascending: false }),
      supabase.from('school_teachers').select('id,first_name,last_name,tsc_number,role').order('first_name'),
    ]);
    setBenefits(bR.data || []); setWelfareEvents(wR.data || []);
    setMedicalClaims(mR.data || []); setLoans(lR.data || []);
    setStaff(sR.data || []); setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Generic save helpers
  const saveBenefit = async () => {
    if (!benForm.staff_id) { toast.error('Select staff'); return; }
    setSaving(true);
    const p = { ...benForm, staff_id: Number(benForm.staff_id), amount: Number(benForm.amount) };
    const { error } = editBenId ? await supabase.from('school_staff_benefits').update(p).eq('id', editBenId) : await supabase.from('school_staff_benefits').insert([p]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editBenId ? '✅ Updated' : '✅ Benefit added');
    setShowBenModal(false); setBenForm(emptyBen); setEditBenId(null); setSaving(false); fetchAll();
  };

  const saveWelfare = async () => {
    if (!welForm.staff_id) { toast.error('Select staff'); return; }
    setSaving(true);
    const p = { ...welForm, staff_id: Number(welForm.staff_id), amount: Number(welForm.amount) };
    const { error } = editWelId ? await supabase.from('school_staff_welfare_events').update(p).eq('id', editWelId) : await supabase.from('school_staff_welfare_events').insert([p]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Welfare event saved');
    setShowWelModal(false); setWelForm(emptyWel); setEditWelId(null); setSaving(false); fetchAll();
  };

  const saveMedical = async () => {
    if (!medForm.staff_id) { toast.error('Select staff'); return; }
    setSaving(true);
    const p = { ...medForm, staff_id: Number(medForm.staff_id), amount_claimed: Number(medForm.amount_claimed), amount_approved: Number(medForm.amount_approved) };
    const { error } = editMedId ? await supabase.from('school_staff_medical_claims').update(p).eq('id', editMedId) : await supabase.from('school_staff_medical_claims').insert([p]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Claim saved');
    setShowMedModal(false); setMedForm(emptyMed); setEditMedId(null); setSaving(false); fetchAll();
  };

  const saveLoan = async () => {
    if (!loanForm.staff_id) { toast.error('Select staff'); return; }
    setSaving(true);
    const p = { ...loanForm, staff_id: Number(loanForm.staff_id), loan_amount: Number(loanForm.loan_amount), monthly_repayment: Number(loanForm.monthly_repayment), amount_paid: Number(loanForm.amount_paid) };
    const { error } = editLoanId ? await supabase.from('school_staff_loans').update(p).eq('id', editLoanId) : await supabase.from('school_staff_loans').insert([p]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Loan saved');
    setShowLoanModal(false); setLoanForm(emptyLoan); setEditLoanId(null); setSaving(false); fetchAll();
  };

  // Analytics
  const totalBenefitValue = benefits.filter(b => b.is_active).reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalWelfare = welfareEvents.reduce((s, w) => s + Number(w.amount || 0), 0);
  const totalClaims = medicalClaims.reduce((s, m) => s + Number(m.amount_approved || 0), 0);
  const totalLoans = loans.filter(l => l.status === 'Active').reduce((s, l) => s + (Number(l.loan_amount || 0) - Number(l.amount_paid || 0)), 0);
  const pendingClaims = medicalClaims.filter(m => m.status === 'Pending').length;

  const benefitByType = useMemo(() => Object.fromEntries(
    BENEFIT_TYPES.map(t => [t, benefits.filter(b => b.benefit_type === t && b.is_active).reduce((s, b) => s + Number(b.amount || 0), 0)])
  ), [benefits]);

  const exportWelfare = () => {
    const rows = [['Staff', 'Event', 'Date', 'Amount', 'Status']];
    welfareEvents.forEach(w => rows.push([`${w.school_teachers?.first_name} ${w.school_teachers?.last_name}`, w.event_type, w.event_date, String(w.amount || 0), w.status]));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'welfare_events.csv'; a.click();
  };

  const getStaffName = (id: any) => { const s = staff.find(x => x.id === Number(id) || x.id === id); return s ? `${s.first_name} ${s.last_name}` : '—'; };

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* ── HERO ── */}
      <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg,#134e4a,#0f766e,#0d9488)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-lg">🤝</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Staff Welfare & Benefits</h1>
              <p className="text-teal-200 text-sm mt-0.5">{staff.length} staff · {benefits.filter(b => b.is_active).length} active benefits · {pendingClaims} pending medical claims</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportWelfare} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition"><FiDownload size={14} /> Export</button>
            <button onClick={fetchAll} className="p-2.5 rounded-xl bg-white/20 border border-white/30 text-white hover:bg-white/30 transition"><FiRefreshCw size={15} /></button>
          </div>
        </div>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 pb-6">
          {[
            { icon: '💰', label: 'Monthly Benefits', val: KES(totalBenefitValue), sub: 'Active packages' },
            { icon: '🤝', label: 'Welfare Spent', val: KES(totalWelfare), sub: 'Total this year' },
            { icon: '🏥', label: 'Medical Claims', val: KES(totalClaims), sub: `${pendingClaims} pending` },
            { icon: '💳', label: 'Loans Outstanding', val: KES(totalLoans), sub: `${loans.filter(l => l.status === 'Active').length} active loans` },
            { icon: '👥', label: 'Coverage Rate', val: `${staff.length > 0 ? Math.round([...new Set(benefits.map(b => b.staff_id))].length / staff.length * 100) : 0}%`, sub: 'Staff with benefits' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 border border-white/10 text-center backdrop-blur-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-sm font-black text-white leading-tight">{s.val}</div>
              <div className="text-[9px] text-teal-200 font-bold uppercase tracking-wide mt-0.5">{s.label}</div>
              <div className="text-[8px] text-teal-300 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl border transition ${activeTab === t.id ? 'bg-teal-700 text-white border-teal-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}`}>
            {t.icon} {t.label.split(' ').slice(1).join(' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="text-center"><div className="w-12 h-12 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-gray-400 font-medium">Loading welfare data…</p></div></div>
      ) : activeTab === 'benefits' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
              <FiSearch className="text-gray-400" size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff name…" className="flex-1 text-sm outline-none" />
            </div>
            <button onClick={() => { setBenForm(emptyBen); setEditBenId(null); setShowBenModal(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-sm shadow-md hover:shadow-lg transition" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}><FiPlus size={14} /> Add Benefit</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50/60 flex items-center justify-between">
              <div><h3 className="font-black text-gray-800 text-base">Benefits & Allowances Register</h3><p className="text-xs text-gray-400 mt-0.5">{benefits.length} records · {benefits.filter(b => b.is_active).length} active</p></div>
            </div>
            {benefits.length === 0 ? (
              <div className="py-20 text-center"><div className="text-6xl mb-4">💰</div><p className="font-black text-gray-600 text-lg mb-2">No benefits recorded yet</p><p className="text-sm text-gray-400 mb-5">Track medical cover, allowances, and more</p><button onClick={() => setShowBenModal(true)} className="px-6 py-3 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>Add First Benefit</button></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50/80">
                    {['Staff', 'Benefit Type', 'Amount', 'Frequency', 'Provider', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {benefits.filter(b => !search || `${b.school_teachers?.first_name} ${b.school_teachers?.last_name}`.toLowerCase().includes(search.toLowerCase())).map(b => (
                      <tr key={b.id} className={`hover:bg-teal-50/30 transition group ${!b.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center font-black text-teal-700 text-xs flex-shrink-0">{b.school_teachers?.first_name?.[0]}{b.school_teachers?.last_name?.[0]}</div>
                            <div><p className="font-black text-gray-800 text-xs">{b.school_teachers?.first_name} {b.school_teachers?.last_name}</p><p className="text-[9px] text-gray-400">{b.school_teachers?.tsc_number || b.school_teachers?.role || ''}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${BENEFIT_COLOR[b.benefit_type] || '#6366f1'}15`, color: BENEFIT_COLOR[b.benefit_type] || '#6366f1' }}>{b.benefit_type}</span>
                        </td>
                        <td className="px-4 py-3 font-black text-gray-800 text-sm">{KES(b.amount)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{b.frequency || 'Monthly'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{b.provider || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.is_active ? '✅ Active' : '❌ Inactive'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => { setBenForm({ staff_id: String(b.staff_id), benefit_type: b.benefit_type, amount: b.amount, frequency: b.frequency || 'Monthly', provider: b.provider || '', policy_number: b.policy_number || '', start_date: b.start_date || '', end_date: b.end_date || '', is_active: b.is_active, notes: b.notes || '' }); setEditBenId(b.id); setShowBenModal(true); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100"><FiEdit2 size={12} /></button>
                            <button onClick={async () => { if (!confirm('Delete?')) return; await supabase.from('school_staff_benefits').delete().eq('id', b.id); fetchAll(); }} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"><FiTrash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'welfare' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
              <FiSearch className="text-gray-400" size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" className="flex-1 text-sm outline-none" />
            </div>
            <button onClick={() => { setWelForm(emptyWel); setEditWelId(null); setShowWelModal(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-sm shadow-md" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}><FiPlus size={14} /> Log Event</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50/60 flex items-center justify-between">
              <div><h3 className="font-black text-gray-800">Welfare Events Register</h3><p className="text-xs text-gray-400">{welfareEvents.length} events · Total: {KES(totalWelfare)}</p></div>
            </div>
            {welfareEvents.length === 0 ? <div className="py-16 text-center"><div className="text-5xl mb-3">🤝</div><p className="font-black text-gray-600">No welfare events yet</p><p className="text-sm text-gray-400 mb-5">Record staff welfare gestures, gifts and support</p><button onClick={() => setShowWelModal(true)} className="px-6 py-3 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>Log First Event</button></div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50/80">{['Staff', 'Event Type', 'Date', 'Amount', 'Contributed By', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {welfareEvents.filter(w => !search || `${w.school_teachers?.first_name} ${w.school_teachers?.last_name} ${w.event_type}`.toLowerCase().includes(search.toLowerCase())).map(w => (
                      <tr key={w.id} className="hover:bg-teal-50/30 transition group">
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center font-black text-teal-700 text-xs">{w.school_teachers?.first_name?.[0]}{w.school_teachers?.last_name?.[0]}</div><p className="font-black text-gray-800 text-xs">{w.school_teachers?.first_name} {w.school_teachers?.last_name}</p></div></td>
                        <td className="px-4 py-3 text-xs font-bold text-teal-700">{w.event_type}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{w.event_date}</td>
                        <td className="px-4 py-3 font-black text-gray-800">{KES(w.amount || 0)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{w.contributed_by || 'School'}</td>
                        <td className="px-4 py-3"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${w.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{w.status}</span></td>
                        <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={async () => { if (!confirm('Delete?')) return; await supabase.from('school_staff_welfare_events').delete().eq('id', w.id); fetchAll(); }} className="p-1.5 rounded-lg bg-red-50 text-red-400"><FiTrash2 size={12} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'medical' ? (
        <>
          <div className="flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">Medical Claims</h3><p className="text-xs text-gray-400">{medicalClaims.length} claims · {KES(totalClaims)} approved</p></div>
            <button onClick={() => { setMedForm(emptyMed); setEditMedId(null); setShowMedModal(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-sm shadow-md" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}><FiPlus size={14} /> New Claim</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {medicalClaims.length === 0 ? <div className="py-16 text-center"><div className="text-5xl mb-3">🏥</div><p className="font-black text-gray-600">No medical claims yet</p></div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Staff', 'Date', 'Hospital', 'Diagnosis', 'Claimed', 'Approved', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {medicalClaims.map(m => (
                      <tr key={m.id} className="hover:bg-teal-50/20 transition group">
                        <td className="px-4 py-3"><p className="font-black text-xs text-gray-800">{m.school_teachers?.first_name} {m.school_teachers?.last_name}</p></td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.claim_date}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{m.hospital || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate">{m.diagnosis || '—'}</td>
                        <td className="px-4 py-3 font-bold text-gray-700 text-xs">{KES(m.amount_claimed || 0)}</td>
                        <td className="px-4 py-3 font-black text-green-700 text-xs">{KES(m.amount_approved || 0)}</td>
                        <td className="px-4 py-3">
                          <select value={m.status} onChange={async e => { await supabase.from('school_staff_medical_claims').update({ status: e.target.value }).eq('id', m.id); fetchAll(); }} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 outline-none font-bold bg-white">
                            {['Pending', 'Under Review', 'Approved', 'Rejected', 'Paid'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={async () => { if (!confirm('Delete?')) return; await supabase.from('school_staff_medical_claims').delete().eq('id', m.id); fetchAll(); }} className="p-1.5 rounded-lg bg-red-50 text-red-400"><FiTrash2 size={12} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'loans' ? (
        <>
          <div className="flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">Staff Loans</h3><p className="text-xs text-gray-400">{loans.length} loans · Outstanding: {KES(totalLoans)}</p></div>
            <button onClick={() => { setLoanForm(emptyLoan); setEditLoanId(null); setShowLoanModal(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-sm shadow-md" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}><FiPlus size={14} /> Issue Loan</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loans.length === 0 ? <div className="py-16 text-center"><div className="text-5xl mb-3">💳</div><p className="font-black text-gray-600">No loans recorded</p></div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Staff', 'Loan Amount', 'Monthly', 'Paid', 'Outstanding', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {loans.map(l => {
                      const outstanding = Number(l.loan_amount || 0) - Number(l.amount_paid || 0);
                      const pct = Number(l.loan_amount) > 0 ? Math.round(Number(l.amount_paid) / Number(l.loan_amount) * 100) : 0;
                      return (
                        <tr key={l.id} className="hover:bg-teal-50/20 transition group">
                          <td className="px-4 py-3"><p className="font-black text-xs text-gray-800">{l.school_teachers?.first_name} {l.school_teachers?.last_name}</p><p className="text-[9px] text-gray-400">{l.school_teachers?.tsc_number}</p></td>
                          <td className="px-4 py-3 font-black text-gray-800">{KES(l.loan_amount)}</td>
                          <td className="px-4 py-3 font-bold text-blue-700">{KES(l.monthly_repayment)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full w-20"><div className="h-1.5 bg-teal-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                              <span className="font-bold text-teal-700 text-xs">{pct}%</span>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-0.5">{KES(l.amount_paid || 0)}</p>
                          </td>
                          <td className="px-4 py-3 font-black text-red-600">{KES(Math.max(0, outstanding))}</td>
                          <td className="px-4 py-3">
                            <select value={l.status} onChange={async e => { await supabase.from('school_staff_loans').update({ status: e.target.value }).eq('id', l.id); fetchAll(); }} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 outline-none font-bold bg-white">
                              {['Active', 'Completed', 'Defaulted', 'Written Off'].map(s => <option key={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={async () => { if (!confirm('Delete?')) return; await supabase.from('school_staff_loans').delete().eq('id', l.id); fetchAll(); }} className="p-1.5 rounded-lg bg-red-50 text-red-400"><FiTrash2 size={12} /></button></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ANALYTICS TAB */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">💰 Benefits by Type (Monthly)</h3>
            <div className="space-y-2.5">
              {Object.entries(benefitByType).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([type, val]) => (
                <div key={type}>
                  <div className="flex justify-between mb-1"><span className="text-xs font-bold text-gray-700">{type}</span><span className="text-xs font-black" style={{ color: BENEFIT_COLOR[type] || '#6366f1' }}>{KES(val)}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 rounded-full" style={{ width: `${Math.round(val / Math.max(totalBenefitValue, 1) * 100)}%`, background: BENEFIT_COLOR[type] || '#6366f1' }} /></div>
                </div>
              ))}
              {totalBenefitValue === 0 && <p className="text-gray-400 text-sm text-center py-4">No active benefits yet</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">🤝 Welfare by Event Type</h3>
            <div className="space-y-2">
              {WELFARE_EVENT_TYPES.map(et => { const c = welfareEvents.filter(w => w.event_type === et).length; const amt = welfareEvents.filter(w => w.event_type === et).reduce((s, w) => s + Number(w.amount || 0), 0); if (!c) return null; return (<div key={et} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"><div><p className="text-xs font-bold text-gray-700">{et}</p><p className="text-[9px] text-gray-400">{c} events</p></div><span className="font-black text-teal-700 text-xs">{KES(amt)}</span></div>); })}
              {welfareEvents.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No events yet</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">📊 Summary</h3>
            <div className="space-y-3">
              {[
                { l: 'Active Benefits', v: benefits.filter(b => b.is_active).length, c: '#0d9488' },
                { l: 'Monthly Benefits Cost', v: KES(totalBenefitValue), c: '#0891b2' },
                { l: 'Welfare Events', v: welfareEvents.length, c: '#7c3aed' },
                { l: 'Total Welfare Spent', v: KES(totalWelfare), c: '#db2777' },
                { l: 'Medical Claims', v: medicalClaims.length, c: '#dc2626' },
                { l: 'Claims Approved', v: KES(totalClaims), c: '#16a34a' },
                { l: 'Active Loans', v: loans.filter(l => l.status === 'Active').length, c: '#d97706' },
                { l: 'Loans Outstanding', v: KES(totalLoans), c: '#ea580c' },
              ].map(s => (
                <div key={s.l} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-600">{s.l}</span>
                  <span className="font-black text-sm" style={{ color: s.c }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SQL SETUP ── */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL (run once in Supabase)</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`-- Benefits
CREATE TABLE IF NOT EXISTS school_staff_benefits (id serial PRIMARY KEY, staff_id int REFERENCES school_teachers(id) ON DELETE CASCADE, benefit_type text, amount numeric DEFAULT 0, frequency text DEFAULT 'Monthly', provider text, policy_number text, start_date date, end_date date, is_active boolean DEFAULT true, notes text, created_at timestamptz DEFAULT now());
ALTER TABLE school_staff_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_benefits" ON school_staff_benefits FOR ALL USING (true) WITH CHECK (true);

-- Welfare Events
CREATE TABLE IF NOT EXISTS school_staff_welfare_events (id serial PRIMARY KEY, staff_id int REFERENCES school_teachers(id) ON DELETE CASCADE, event_type text, event_date date, amount numeric DEFAULT 0, description text, contributed_by text DEFAULT 'School', status text DEFAULT 'Completed', created_at timestamptz DEFAULT now());
ALTER TABLE school_staff_welfare_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_welfare" ON school_staff_welfare_events FOR ALL USING (true) WITH CHECK (true);

-- Medical Claims
CREATE TABLE IF NOT EXISTS school_staff_medical_claims (id serial PRIMARY KEY, staff_id int REFERENCES school_teachers(id) ON DELETE CASCADE, claim_date date, hospital text, diagnosis text, amount_claimed numeric DEFAULT 0, amount_approved numeric DEFAULT 0, receipt_no text, status text DEFAULT 'Pending', notes text, created_at timestamptz DEFAULT now());
ALTER TABLE school_staff_medical_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_medical" ON school_staff_medical_claims FOR ALL USING (true) WITH CHECK (true);

-- Staff Loans
CREATE TABLE IF NOT EXISTS school_staff_loans (id serial PRIMARY KEY, staff_id int REFERENCES school_teachers(id) ON DELETE CASCADE, loan_amount numeric DEFAULT 0, interest_rate numeric DEFAULT 0, disbursed_date date, monthly_repayment numeric DEFAULT 0, months_remaining int DEFAULT 0, amount_paid numeric DEFAULT 0, status text DEFAULT 'Active', purpose text, created_at timestamptz DEFAULT now());
ALTER TABLE school_staff_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_loans" ON school_staff_loans FOR ALL USING (true) WITH CHECK (true);`}</code>
      </details>

      {/* ── BENEFIT MODAL ── */}
      {showBenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)' }}>
              <h2 className="font-black text-gray-800">💰 {editBenId ? 'Edit' : 'Add'} Benefit</h2>
              <button onClick={() => setShowBenModal(false)}><FiX size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="text-xs font-black text-gray-600 block mb-1">Staff *</label><select value={benForm.staff_id} onChange={e => setBenForm(f => ({ ...f, staff_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="">Select…</option>{staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Benefit Type</label><select value={benForm.benefit_type} onChange={e => setBenForm(f => ({ ...f, benefit_type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">{BENEFIT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Frequency</label><select value={benForm.frequency} onChange={e => setBenForm(f => ({ ...f, frequency: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">{['Monthly', 'Annual', 'One-Time', 'Quarterly'].map(f => <option key={f}>{f}</option>)}</select></div>
              </div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Amount (KES)</label><input type="number" value={benForm.amount} onChange={e => setBenForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Provider</label><input value={benForm.provider} onChange={e => setBenForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. Jubilee" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Policy No</label><input value={benForm.policy_number} onChange={e => setBenForm(f => ({ ...f, policy_number: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Start Date</label><input type="date" value={benForm.start_date} onChange={e => setBenForm(f => ({ ...f, start_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">End Date</label><input type="date" value={benForm.end_date} onChange={e => setBenForm(f => ({ ...f, end_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={benForm.is_active} onChange={e => setBenForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-teal-600" />Active</label>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={saveBenefit} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>{saving ? '…' : editBenId ? '✅ Update' : '💰 Add Benefit'}</button>
              <button onClick={() => setShowBenModal(false)} className="px-5 py-3 rounded-xl border text-sm text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── WELFARE MODAL ── */}
      {showWelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)' }}>
              <h2 className="font-black text-gray-800">🤝 Log Welfare Event</h2>
              <button onClick={() => setShowWelModal(false)}><FiX size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="text-xs font-black text-gray-600 block mb-1">Staff *</label><select value={welForm.staff_id} onChange={e => setWelForm(f => ({ ...f, staff_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="">Select…</option>{staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Event Type</label><select value={welForm.event_type} onChange={e => setWelForm(f => ({ ...f, event_type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">{WELFARE_EVENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Date</label><input type="date" value={welForm.event_date} onChange={e => setWelForm(f => ({ ...f, event_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Amount (KES)</label><input type="number" value={welForm.amount} onChange={e => setWelForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Contributed By</label><input value={welForm.contributed_by} onChange={e => setWelForm(f => ({ ...f, contributed_by: e.target.value }))} placeholder="School / Staff Pool" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Description</label><textarea value={welForm.description} onChange={e => setWelForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={saveWelfare} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>{saving ? '…' : '🤝 Save Event'}</button>
              <button onClick={() => setShowWelModal(false)} className="px-5 py-3 rounded-xl border text-sm text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MEDICAL MODAL ── */}
      {showMedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fef2f2,#fee2e2)' }}>
              <h2 className="font-black text-gray-800">🏥 Medical Claim</h2>
              <button onClick={() => setShowMedModal(false)}><FiX size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="text-xs font-black text-gray-600 block mb-1">Staff *</label><select value={medForm.staff_id} onChange={e => setMedForm(f => ({ ...f, staff_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="">Select…</option>{staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Claim Date</label><input type="date" value={medForm.claim_date} onChange={e => setMedForm(f => ({ ...f, claim_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Receipt No</label><input value={medForm.receipt_no} onChange={e => setMedForm(f => ({ ...f, receipt_no: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Hospital</label><input value={medForm.hospital} onChange={e => setMedForm(f => ({ ...f, hospital: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Diagnosis</label><input value={medForm.diagnosis} onChange={e => setMedForm(f => ({ ...f, diagnosis: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Amount Claimed (KES)</label><input type="number" value={medForm.amount_claimed} onChange={e => setMedForm(f => ({ ...f, amount_claimed: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Amount Approved (KES)</label><input type="number" value={medForm.amount_approved} onChange={e => setMedForm(f => ({ ...f, amount_approved: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={saveMedical} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>{saving ? '…' : '🏥 Save Claim'}</button>
              <button onClick={() => setShowMedModal(false)} className="px-5 py-3 rounded-xl border text-sm text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOAN MODAL ── */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
              <h2 className="font-black text-gray-800">💳 Staff Loan</h2>
              <button onClick={() => setShowLoanModal(false)}><FiX size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="text-xs font-black text-gray-600 block mb-1">Staff *</label><select value={loanForm.staff_id} onChange={e => setLoanForm(f => ({ ...f, staff_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="">Select…</option>{staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Loan Amount (KES)</label><input type="number" value={loanForm.loan_amount} onChange={e => setLoanForm(f => ({ ...f, loan_amount: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Monthly Repayment</label><input type="number" value={loanForm.monthly_repayment} onChange={e => setLoanForm(f => ({ ...f, monthly_repayment: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Disbursed Date</label><input type="date" value={loanForm.disbursed_date} onChange={e => setLoanForm(f => ({ ...f, disbursed_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Amount Paid So Far</label><input type="number" value={loanForm.amount_paid} onChange={e => setLoanForm(f => ({ ...f, amount_paid: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Purpose</label><input value={loanForm.purpose} onChange={e => setLoanForm(f => ({ ...f, purpose: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={saveLoan} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>{saving ? '…' : '💳 Issue Loan'}</button>
              <button onClick={() => setShowLoanModal(false)} className="px-5 py-3 rounded-xl border text-sm text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
