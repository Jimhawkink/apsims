'use client';

import { useState, useEffect } from 'react';
import { fmt, PAYMENT_METHODS, BURSARY_SOURCES, WAIVER_TYPES, FEE_VOTE_HEADS, type StudentFeeProfile } from '@/hooks/useUltraFeeCollect';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  fees: StudentFeeProfile;
  receiptNo: string;
  getFormName: (id: number) => string;
  getStreamName: (id: number) => string;
  onSubmit: (data: PaymentData) => void;
  isSubmitting: boolean;
}

export interface PaymentData {
  amount: number;
  method: string;
  allocationHead: string;
  mpesaPhone: string;
  mpesaCode: string;
  bankSlip: string;
  bankBranch: string;
  bankDate: string;
  chequeNo: string;
  chequeBank: string;
  inKindItem: string;
  inKindValue: number;
  bursarySource: string;
  waiverType: string;
  notes: string;
  sendSms: boolean;
}

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];
const IN_KIND_ITEMS = ['Beans', 'Maize', 'Firewood', 'Rice', 'Wheat', 'Potatoes', 'Vegetables', 'Cooking Oil', 'Sugar', 'Milk', 'Building Materials', 'Labour', 'Other'];

export default function UltraPaymentModal({ isOpen, onClose, student, fees, receiptNo, getFormName, getStreamName, onSubmit, isSubmitting }: Props) {
  const [method, setMethod] = useState<string>('Cash');
  const [amount, setAmount] = useState('');
  const [allocationHead, setAllocationHead] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
  const [bankSlip, setBankSlip] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankDate, setBankDate] = useState(new Date().toISOString().split('T')[0]);
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [inKindItem, setInKindItem] = useState('');
  const [inKindValue, setInKindValue] = useState('');
  const [bursarySource, setBursarySource] = useState('');
  const [waiverType, setWaiverType] = useState('');
  const [notes, setNotes] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (student?.guardian_phone) setMpesaPhone(student.guardian_phone);
  }, [student]);

  if (!isOpen || !student) return null;

  const numAmount = Number(amount) || 0;
  const isInKind = method === 'In-Kind';
  const effectiveAmount = isInKind ? Number(inKindValue || 0) : numAmount;
  const balanceAfter = Math.max(0, fees.termBalance - effectiveAmount);
  const changeAmount = effectiveAmount > fees.termBalance ? effectiveAmount - fees.termBalance : 0;
  const adm = student.admission_no || student.admission_number || '';

  const handleSubmit = () => {
    if (effectiveAmount <= 0) return;
    onSubmit({
      amount: effectiveAmount, method, allocationHead, mpesaPhone, mpesaCode,
      bankSlip, bankBranch, bankDate, chequeNo, chequeBank,
      inKindItem, inKindValue: Number(inKindValue || 0),
      bursarySource, waiverType, notes, sendSms,
    });
  };

  const methodIcons: Record<string, string> = { 'Cash': '💵', 'M-Pesa': '📱', 'Bank Transfer': '🏦', 'Cheque': '📝', 'In-Kind': '🌾' };
  const methodColors: Record<string, string> = {
    'Cash': 'border-emerald-500 bg-emerald-50 text-emerald-700',
    'M-Pesa': 'border-green-500 bg-green-50 text-green-700',
    'Bank Transfer': 'border-blue-500 bg-blue-50 text-blue-700',
    'Cheque': 'border-amber-500 bg-amber-50 text-amber-700',
    'In-Kind': 'border-purple-500 bg-purple-50 text-purple-700',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl shadow-2xl rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ animation: 'modalSlideUp 0.3s ease-out' }}>
        {/* ═══════ HEADER ═══════ */}
        <div className="relative px-6 py-5" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}>
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                💰 Record Payment
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/80 text-xs font-medium">{student.first_name} {student.last_name}</span>
                <span className="text-white/50 text-xs">•</span>
                <span className="text-white/60 text-xs font-mono">{adm}</span>
                <span className="text-white/50 text-xs">•</span>
                <span className="text-white/60 text-xs">{getFormName(student.form_id)} {getStreamName(student.stream_id)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Receipt #</p>
              <p className="text-sm font-bold text-white font-mono tracking-wider">{receiptNo}</p>
            </div>
          </div>
        </div>

        {/* ═══════ BALANCE STRIP ═══════ */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-4 gap-3">
          <div className="text-center"><p className="text-[8px] font-bold text-gray-400 uppercase">Paid</p><p className="text-sm font-extrabold text-emerald-600">{fmt(fees.totalPaid)}</p></div>
          <div className="text-center"><p className="text-[8px] font-bold text-gray-400 uppercase">Term Bal</p><p className="text-sm font-extrabold text-red-600">{fmt(fees.termBalance)}</p></div>
          <div className="text-center"><p className="text-[8px] font-bold text-gray-400 uppercase">Annual Bal</p><p className="text-sm font-extrabold text-amber-600">{fmt(fees.annualBalance)}</p></div>
          <div className="text-center"><p className="text-[8px] font-bold text-gray-400 uppercase">Net Due</p><p className="text-sm font-extrabold text-violet-600">{fmt(fees.netDue)}</p></div>
        </div>

        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* ═══════ PAYMENT METHOD ═══════ */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Method</label>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-3 px-2 rounded-xl text-center transition-all duration-200 border-2 ${
                    method === m ? methodColors[m] : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-0.5">{methodIcons[m]}</div>
                  <div className="text-[10px] font-bold leading-tight">{m}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ═══════ AMOUNT INPUT ═══════ */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              {isInKind ? 'Estimated Value (KES)' : 'Amount (KES)'} *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">KES</span>
              <input
                type="number"
                value={isInKind ? inKindValue : amount}
                onChange={e => isInKind ? setInKindValue(e.target.value) : setAmount(e.target.value)}
                className="w-full pl-16 pr-4 py-5 bg-white border-2 border-gray-200 rounded-2xl text-3xl font-black text-gray-900 text-center focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none transition-all"
                placeholder="0"
                autoFocus
              />
            </div>

            {/* Quick Amounts */}
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_AMOUNTS.map(qa => (
                <button
                  key={qa}
                  onClick={() => isInKind ? setInKindValue(String(qa)) : setAmount(String(qa))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all"
                >
                  {qa >= 1000 ? `${qa / 1000}K` : qa}
                </button>
              ))}
              {fees.termBalance > 0 && (
                <button
                  onClick={() => isInKind ? setInKindValue(String(fees.termBalance)) : setAmount(String(fees.termBalance))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-all"
                >
                  Term Bal ({fmt(fees.termBalance)})
                </button>
              )}
              {fees.annualBalance > 0 && fees.annualBalance !== fees.termBalance && (
                <button
                  onClick={() => isInKind ? setInKindValue(String(fees.annualBalance)) : setAmount(String(fees.annualBalance))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
                >
                  Full Year
                </button>
              )}
            </div>
          </div>

          {/* ═══════ ALLOCATION HEAD ═══════ */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Allocate To (Vote Head)</label>
            <select
              value={allocationHead}
              onChange={e => setAllocationHead(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-violet-400 outline-none transition-all"
            >
              <option value="">— General (Auto-distribute) —</option>
              {FEE_VOTE_HEADS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          {/* ═══════ METHOD-SPECIFIC FIELDS ═══════ */}
          {method === 'M-Pesa' && (
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 space-y-3">
              <div className="flex items-center gap-2 mb-1"><span className="text-sm">📱</span><span className="text-xs font-bold text-green-700 uppercase tracking-wider">M-Pesa Details</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Phone Number</label>
                  <input type="tel" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} className="w-full px-3 py-2.5 border-2 border-green-200 rounded-xl text-sm bg-white focus:border-green-400 outline-none" placeholder="0712 345 678" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">M-Pesa Code</label>
                  <input type="text" value={mpesaCode} onChange={e => setMpesaCode(e.target.value.toUpperCase())} className="w-full px-3 py-2.5 border-2 border-green-200 rounded-xl text-sm bg-white focus:border-green-400 outline-none font-mono uppercase tracking-wider" placeholder="SJK4X7R2FN" />
                </div>
              </div>
              <button className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md">
                <span>📲</span> Send STK Push to {mpesaPhone || 'phone'}
              </button>
              <button className="w-full py-2 rounded-xl bg-white border border-green-300 text-green-700 text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-50 transition-colors">
                <span>🔍</span> Check C2B Payment
              </button>
            </div>
          )}

          {method === 'Bank Transfer' && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 mb-1"><span className="text-sm">🏦</span><span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Bank Transfer Details</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bank Slip / Ref No</label>
                  <input type="text" value={bankSlip} onChange={e => setBankSlip(e.target.value)} className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-xl text-sm bg-white focus:border-blue-400 outline-none font-mono" placeholder="SLIP-001234" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bank / Branch</label>
                  <input type="text" value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-xl text-sm bg-white focus:border-blue-400 outline-none" placeholder="KCB Nairobi" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Deposit Date</label>
                <input type="date" value={bankDate} onChange={e => setBankDate(e.target.value)} className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-xl text-sm bg-white focus:border-blue-400 outline-none" />
              </div>
            </div>
          )}

          {method === 'Cheque' && (
            <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 mb-1"><span className="text-sm">📝</span><span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Cheque Details</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cheque Number</label>
                  <input type="text" value={chequeNo} onChange={e => setChequeNo(e.target.value)} className="w-full px-3 py-2.5 border-2 border-amber-200 rounded-xl text-sm bg-white focus:border-amber-400 outline-none font-mono" placeholder="000123" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bank Name</label>
                  <input type="text" value={chequeBank} onChange={e => setChequeBank(e.target.value)} className="w-full px-3 py-2.5 border-2 border-amber-200 rounded-xl text-sm bg-white focus:border-amber-400 outline-none" placeholder="Equity Bank" />
                </div>
              </div>
            </div>
          )}

          {method === 'In-Kind' && (
            <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border border-purple-200 space-y-3">
              <div className="flex items-center gap-2 mb-1"><span className="text-sm">🌾</span><span className="text-xs font-bold text-purple-700 uppercase tracking-wider">In-Kind Contribution</span></div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Item Type *</label>
                <select value={inKindItem} onChange={e => setInKindItem(e.target.value)} className="w-full px-3 py-2.5 border-2 border-purple-200 rounded-xl text-sm bg-white focus:border-purple-400 outline-none">
                  <option value="">— Select item —</option>
                  {IN_KIND_ITEMS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ═══════ ADVANCED: Bursary / Waiver Source ═══════ */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showAdvanced ? 'Hide' : 'Show'} Bursary / Waiver Options
          </button>

          {showAdvanced && (
            <div className="space-y-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bursary Source</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setBursarySource('')} className={`py-2 px-2 rounded-xl text-[10px] font-bold border-2 transition-all ${!bursarySource ? 'border-gray-400 bg-gray-100 text-gray-700' : 'border-gray-200 text-gray-400'}`}>
                    None
                  </button>
                  {BURSARY_SOURCES.map(bs => (
                    <button
                      key={bs.id}
                      onClick={() => setBursarySource(bs.id)}
                      className={`py-2 px-2 rounded-xl text-[10px] font-bold border-2 transition-all ${
                        bursarySource === bs.id ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {bs.icon} {bs.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Waiver Type</label>
                <select value={waiverType} onChange={e => setWaiverType(e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:border-violet-400 outline-none">
                  <option value="">— No Waiver —</option>
                  {WAIVER_TYPES.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ═══════ NOTES ═══════ */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-white focus:border-violet-400 outline-none resize-none"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          {/* ═══════ SMS TOGGLE ═══════ */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-sm">📱</span>
              <div>
                <p className="text-xs font-bold text-gray-700">Send SMS Receipt</p>
                <p className="text-[10px] text-gray-400">{student.guardian_phone || 'No phone number'}</p>
              </div>
            </div>
            <button
              onClick={() => setSendSms(!sendSms)}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${sendSms ? 'bg-violet-500' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${sendSms ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* ═══════ FOOTER ═══════ */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          {/* Live Balance Calculator */}
          {effectiveAmount > 0 && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-center">
                <p className="text-[8px] font-bold text-gray-400 uppercase">Paying</p>
                <p className="text-sm font-extrabold text-violet-600">{fmt(effectiveAmount)}</p>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-center">
                <p className="text-[8px] font-bold text-gray-400 uppercase">Balance After</p>
                <p className={`text-sm font-extrabold ${balanceAfter > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(balanceAfter)}</p>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-center">
                <p className="text-[8px] font-bold text-gray-400 uppercase">Change Due</p>
                <p className={`text-sm font-extrabold ${changeAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{fmt(changeAmount)}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={effectiveAmount <= 0 || isSubmitting}
              className={`px-8 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg transition-all ${
                effectiveAmount > 0 && !isSubmitting
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Record {fmt(effectiveAmount)}</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
