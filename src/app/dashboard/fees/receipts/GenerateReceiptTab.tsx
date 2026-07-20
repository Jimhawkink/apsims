'use client';

import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getNextDocumentNumber } from '@/lib/receiptNumber';
import toast from 'react-hot-toast';

const fmtKES = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  if (n < 0) return 'Minus ' + numberToWords(-n);
  let w = '';
  if (Math.floor(n / 1000000) > 0) { w += numberToWords(Math.floor(n / 1000000)) + ' Million '; n %= 1000000; }
  if (Math.floor(n / 1000) > 0) { w += numberToWords(Math.floor(n / 1000)) + ' Thousand '; n %= 1000; }
  if (Math.floor(n / 100) > 0) { w += ONES[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
  if (n > 0) { if (w) w += 'and '; if (n < 20) w += ONES[n]; else { w += TENS[Math.floor(n / 10)]; if (n % 10) w += '-' + ONES[n % 10]; } }
  return w.trim();
}

interface Props {
  students: any[]; payments: any[]; structures: any[]; terms: any[];
  getFormName: (id: number) => string; getStreamName: (id: number) => string;
  getStudentFees: (sid: number, fid?: number) => any; currentTerm: any;
  onReceiptCreated: () => void;
}

export default function GenerateReceiptTab({ students, payments, structures, terms, getFormName, getStreamName, getStudentFees, currentTerm, onReceiptCreated }: Props) {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const searchResults = useMemo(() => {
    if (!search.trim() || search.length < 2) return [];
    const q = search.toLowerCase();
    return students.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      (s.admission_no || s.admission_number || '').toString().toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search, students]);

  const studentPayments = useMemo(() => {
    if (!selectedStudent) return [];
    return payments.filter(p => p.student_id === selectedStudent.id)
      .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 10);
  }, [selectedStudent, payments]);

  const fees = useMemo(() => selectedStudent ? getStudentFees(selectedStudent.id, selectedStudent.form_id) : null, [selectedStudent, getStudentFees]);

  const generateReceipt = useCallback(async (payment: any) => {
    setGenerating(true);
    try {
      // Generate receipt number — atomic DB counter
      const receiptNumber = await getNextDocumentNumber(supabase, 'RECEIPT');
      const amtWords = numberToWords(Math.floor(Number(payment.amount))) + ' Shillings Only';

      const { error } = await supabase.from('school_fee_receipts').insert({
        receipt_number: receiptNumber,
        payment_id: payment.id,
        student_id: payment.student_id,
        amount: Number(payment.amount),
        amount_words: amtWords,
        status: 'issued',
        created_by: 'Bursar',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSelectedPayment({ ...payment, receipt_number: receiptNumber, amount_words: amtWords });
      toast.success(`Receipt ${receiptNumber} generated ✅`);
      onReceiptCreated();
    } catch (err: any) { toast.error(err.message || 'Failed to generate receipt'); }
    finally { setGenerating(false); }
  }, [onReceiptCreated]);

  const printReceipt = useCallback(() => {
    if (!selectedPayment || !selectedStudent) return;
    const s = selectedStudent;
    const p = selectedPayment;
    const term = terms.find((t: any) => t.id === p.term_id);
    const amtWords = p.amount_words || numberToWords(Math.floor(Number(p.amount))) + ' Shillings Only';

    const html = `<!DOCTYPE html><html><head><title>Receipt ${p.receipt_number}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
@page{size:A5;margin:12mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;padding:20px;max-width:520px;margin:0 auto;color:#111;font-size:12px}
.hdr{text-align:center;padding-bottom:14px;border-bottom:3px double #1e1b4b;margin-bottom:16px}
.hdr h1{font-size:20px;font-weight:900;letter-spacing:2px;color:#1e1b4b}
.hdr .sub{font-size:10px;color:#666;margin-top:4px}
.hdr .badge{display:inline-block;margin-top:8px;padding:4px 16px;background:#1e1b4b;color:#fff;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px}
.rcpt-no{text-align:center;margin:14px 0;font-family:monospace;font-size:18px;font-weight:900;color:#4338ca;letter-spacing:2px;padding:8px;background:#eef2ff;border-radius:8px;border:2px solid #c7d2fe}
.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f1f1}
.row .k{font-size:10px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:0.5px}
.row .v{font-weight:700;font-size:12px;text-align:right;max-width:60%}
.amt{margin:16px 0;padding:18px;border:3px solid #1e1b4b;border-radius:12px;text-align:center;background:linear-gradient(135deg,#eef2ff,#faf5ff)}
.amt .lbl{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#6366f1}
.amt .num{font-size:32px;font-weight:900;color:#1e1b4b;margin:6px 0 4px}
.amt .words{font-size:10px;font-style:italic;color:#666;font-weight:600}
.bal{margin:12px 0;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
.bal-r{display:flex;justify-content:space-between;padding:4px 0;font-size:11px}
.bal-r .l{color:#666;font-weight:600}.bal-r .vr{font-weight:900}
.red{color:#dc2626}.grn{color:#16a34a}
.kra{margin:14px 0;padding:10px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;text-align:center;font-size:10px;color:#92400e;font-weight:700}
.ftr{margin-top:18px;padding-top:14px;border-top:3px double #1e1b4b;text-align:center}
.ftr p{font-size:9px;color:#888;margin:2px 0}
@media print{body{padding:10px}.no-print{display:none!important}}
</style></head><body>
<div class="hdr">
  <h1>ALPHA PREMIER SCHOOL</h1>
  <div class="sub">P.O. Box 000 · Tel: 0700 000 000 · info@alphapremier.ac.ke</div>
  <div class="badge">🧾 OFFICIAL FEE PAYMENT RECEIPT</div>
</div>
<div class="rcpt-no">${p.receipt_number || '—'}</div>
<div>
  <div class="row"><span class="k">Date</span><span class="v">${fmtDate(p.payment_date)}</span></div>
  <div class="row"><span class="k">Student Name</span><span class="v">${s.first_name} ${s.last_name}</span></div>
  <div class="row"><span class="k">Admission No.</span><span class="v">${s.admission_no || s.admission_number || '—'}</span></div>
  <div class="row"><span class="k">Form / Class</span><span class="v">${getFormName(s.form_id)} / ${getStreamName(s.stream_id)}</span></div>
  <div class="row"><span class="k">Term</span><span class="v">${term?.term_name || '—'}</span></div>
  <div class="row"><span class="k">Payment Method</span><span class="v">${p.payment_method || '—'}</span></div>
  ${p.mpesa_code || p.reference_number ? `<div class="row"><span class="k">Transaction Ref</span><span class="v" style="font-family:monospace">${p.mpesa_code || p.reference_number}</span></div>` : ''}
  ${p.received_by ? `<div class="row"><span class="k">Received By</span><span class="v">${p.received_by}</span></div>` : ''}
</div>
<div class="amt">
  <div class="lbl">Amount Received</div>
  <div class="num">${fmtKES(Number(p.amount))}</div>
  <div class="words">${amtWords}</div>
</div>
${fees ? `<div class="bal">
  <div class="bal-r"><span class="l">Total Paid (All Time)</span><span class="vr grn">${fmtKES(fees.totalPaid)}</span></div>
  <div class="bal-r"><span class="l">Term Balance</span><span class="vr red">${fmtKES(fees.termBalance)}</span></div>
  <div class="bal-r"><span class="l">Annual Balance</span><span class="vr red">${fmtKES(fees.annualBalance)}</span></div>
</div>` : ''}
<div class="kra">KRA PIN: P000000000A · This receipt is KRA-compliant</div>
<div class="ftr">
  <p>✅ Thank you for your payment!</p>
  <p>Computer-generated receipt · No signature required</p>
  <p>Printed: ${new Date().toLocaleString('en-KE')}</p>
  <p style="margin-top:6px;font-style:italic">Powered by APSIMS School Management System</p>
</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=560,height=780');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500); }
  }, [selectedPayment, selectedStudent, fees, terms, getFormName, getStreamName]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* LEFT: Search + Payments */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">🔍 Search Student</label>
          <input value={search} onChange={e => { setSearch(e.target.value); setSelectedStudent(null); setSelectedPayment(null); }}
            placeholder="Name or Admission No..."
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold focus:border-indigo-400 outline-none bg-gray-50 focus:bg-white transition-all" />
          {searchResults.length > 0 && !selectedStudent && (
            <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
              {searchResults.map(s => (
                <button key={s.id} onClick={() => { setSelectedStudent(s); setSearch(`${s.first_name} ${s.last_name}`); setSelectedPayment(null); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-all text-left">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                    style={{ background: s.gender === 'Male' ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'linear-gradient(135deg,#ec4899,#f472b6)' }}>
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{s.first_name} {s.last_name}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">{s.admission_no || s.admission_number} · {getFormName(s.form_id)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        {selectedStudent && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Recent Payments</h4>
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{studentPayments.length}</span>
            </div>
            {studentPayments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No payments found for this student</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {studentPayments.map(p => (
                  <button key={p.id} onClick={() => setSelectedPayment(p)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left border ${selectedPayment?.id === p.id ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-transparent hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                        style={{ background: p.payment_method === 'M-Pesa' ? '#dcfce7' : p.payment_method === 'Bank Transfer' ? '#dbeafe' : '#fef3c7' }}>
                        {p.payment_method === 'M-Pesa' ? '📱' : p.payment_method === 'Bank Transfer' ? '🏦' : '💵'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{fmtKES(Number(p.amount))}</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(p.payment_date)} · {p.payment_method}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-gray-400">{p.receipt_number || '—'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Receipt Preview */}
      <div className="lg:col-span-3">
        {selectedPayment && selectedStudent ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Receipt Header */}
            <div className="p-5 text-center border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #eef2ff, #faf5ff)' }}>
              <h2 className="text-lg font-black text-indigo-900 tracking-wider">ALPHA PREMIER SCHOOL</h2>
              <p className="text-[10px] text-gray-500 mt-1">P.O. Box 000 · Tel: 0700 000 000 · info@alphapremier.ac.ke</p>
              <span className="inline-block mt-2 px-4 py-1 rounded-full text-[10px] font-extrabold text-white tracking-wider" style={{ background: 'linear-gradient(135deg,#1e1b4b,#4338ca)' }}>
                🧾 OFFICIAL FEE PAYMENT RECEIPT
              </span>
            </div>
            <div className="p-5 space-y-4">
              {/* Receipt Number */}
              <div className="text-center py-2 px-4 bg-indigo-50 rounded-xl border-2 border-indigo-200">
                <p className="text-lg font-black text-indigo-700 font-mono tracking-widest">{selectedPayment.receipt_number || 'Pending'}</p>
              </div>
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {[['Date', fmtDate(selectedPayment.payment_date)],['Student', `${selectedStudent.first_name} ${selectedStudent.last_name}`],['Adm No.', selectedStudent.admission_no || selectedStudent.admission_number],['Form', `${getFormName(selectedStudent.form_id)} / ${getStreamName(selectedStudent.stream_id)}`],['Method', selectedPayment.payment_method],['Reference', selectedPayment.mpesa_code || selectedPayment.reference_number || '—']].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between border-b border-gray-50 pb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{k}</span>
                    <span className="text-xs font-bold text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
              {/* Amount Box */}
              <div className="p-4 rounded-xl border-2 border-indigo-800 text-center" style={{ background: 'linear-gradient(135deg,#eef2ff,#faf5ff)' }}>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[3px]">Amount Received</p>
                <p className="text-2xl font-black text-indigo-900 mt-1">{fmtKES(Number(selectedPayment.amount))}</p>
                <p className="text-[10px] text-gray-500 italic font-semibold mt-1">{numberToWords(Math.floor(Number(selectedPayment.amount)))} Shillings Only</p>
              </div>
              {/* Balance */}
              {fees && (
                <div className="grid grid-cols-3 gap-2">
                  {[['Total Paid', fmtKES(fees.totalPaid), '#16a34a'],['Term Bal.', fmtKES(fees.termBalance), '#dc2626'],['Annual Bal.', fmtKES(fees.annualBalance), '#dc2626']].map(([l, v, c]) => (
                    <div key={l as string} className="p-2.5 rounded-lg bg-gray-50 text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{l}</p>
                      <p className="text-xs font-black mt-0.5" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* KRA */}
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <p className="text-[10px] font-bold text-amber-700">KRA PIN: P000000000A · KRA-Compliant Receipt</p>
              </div>
            </div>
            {/* Action buttons */}
            <div className="px-5 pb-5 flex gap-2 flex-wrap">
              {!selectedPayment.receipt_number?.startsWith('RCT-') && (
                <button onClick={() => generateReceipt(selectedPayment)} disabled={generating}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50 transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                  {generating ? '⏳ Generating...' : '✅ Generate Receipt'}
                </button>
              )}
              <button onClick={printReceipt} className="flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#4338ca,#6366f1)' }}>🖨️ Print Receipt</button>
              <button onClick={() => { navigator.clipboard.writeText(`Receipt: ${selectedPayment.receipt_number}\nStudent: ${selectedStudent.first_name} ${selectedStudent.last_name}\nAmount: ${fmtKES(Number(selectedPayment.amount))}\nDate: ${fmtDate(selectedPayment.payment_date)}`); toast.success('Copied to clipboard!'); }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">📋 Copy</button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4" style={{ background: 'linear-gradient(135deg,#eef2ff,#faf5ff)' }}>🧾</div>
            <h3 className="text-base font-black text-gray-700">Receipt Preview</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs text-center">Search for a student, select a payment, and preview the professional receipt here</p>
          </div>
        )}
      </div>
    </div>
  );
}
