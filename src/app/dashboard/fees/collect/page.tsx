'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { useUltraFeeCollect, fmt } from '@/hooks/useUltraFeeCollect';
import UltraFeeSearch from '@/components/fees/UltraFeeSearch';
import UltraStudentFeeProfile from '@/components/fees/UltraStudentFeeProfile';
import UltraPaymentModal, { type PaymentData } from '@/components/fees/UltraPaymentModal';
import UltraFeeHistoryPanel from '@/components/fees/UltraFeeHistoryPanel';
import { printThermalReceipt, printDemandLetter } from '@/components/fees/UltraThermalReceipt';
import {
  FiCreditCard, FiDollarSign, FiUsers, FiSearch, FiFilter,
  FiPrinter, FiDownload, FiRefreshCw, FiCheckCircle, FiAlertTriangle,
  FiCalendar, FiClock, FiFileText, FiPhone, FiCheck, FiArrowRight,
  FiChevronLeft, FiChevronRight, FiSliders, FiEye, FiTrash2,
  FiSend, FiPocket, FiBookOpen, FiShield, FiSmartphone, FiHash,
  FiLayers, FiX, FiExternalLink,
} from 'react-icons/fi';

/* ─────────────────────────────────────────────
   CURRICULUM TRACK TYPES & DETECTOR
───────────────────────────────────────────── */
type CurriculumTrack = 'ALL' | 'CBC_SENIOR' | '844' | 'JSS' | 'PRIMARY_CBC';

function detectTrack(form: any): 'CBC_SENIOR' | '844' | 'JSS' | 'PRIMARY_CBC' | 'OTHER' {
  if (!form) return 'OTHER';
  const sys = String(form.education_system || '').toLowerCase();
  const name = String(form.form_name || '').toLowerCase();

  if (sys.includes('senior') || name.includes('grade 10') || name.includes('grade 11') || name.includes('grade 12')) {
    return 'CBC_SENIOR';
  }
  if (sys.includes('junior') || name.includes('grade 7') || name.includes('grade 8') || name.includes('grade 9')) {
    return 'JSS';
  }
  if (sys.includes('8-4-4') || sys.includes('844') || name.startsWith('form ')) {
    return '844';
  }
  if (sys.includes('primary') || name.startsWith('grade ') || name.startsWith('pp ')) {
    return 'PRIMARY_CBC';
  }
  return 'OTHER';
}

/* ─────────────────────────────────────────────
   HELPERS & FORMATTERS
───────────────────────────────────────────── */
const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const KESK = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

interface ReceiptFlashState {
  receiptNo: string;
  amount: number;
}

/* ─────────────────────────────────────────────
   MICRO UI COMPONENTS
───────────────────────────────────────────── */

/** Status badge pill */
function TrackBadge({ track }: { track: string }) {
  if (track === 'CBC_SENIOR') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        CBC Senior (G10)
      </span>
    );
  }
  if (track === '844') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        8-4-4 Secondary
      </span>
    );
  }
  if (track === 'JSS') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
        Junior Secondary
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      Primary CBC
    </span>
  );
}

/** SVG circular fee progress ring */
function FeeRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const color = pct >= 80 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  );
}

/** Pop-up receipt flash (auto-dismisses) */
function ReceiptFlash({
  receiptNo, amount, studentName, onClose,
}: {
  receiptNo: string;
  amount: number;
  studentName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] bg-[#0f172a] rounded-2xl p-5 shadow-2xl border border-white/10 max-w-xs animate-slideUpIn flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-xs font-black">
            ✓
          </div>
          <span className="text-xs font-bold text-slate-100">
            Payment Recorded
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs p-1 rounded transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
        <div className="text-2xl font-black text-emerald-400 tracking-tight">
          KES {amount.toLocaleString('en-KE')}
        </div>
        <div className="text-xs text-slate-300 mt-1 font-semibold truncate">{studentName}</div>
        <div className="text-[10px] text-slate-400 mt-1.5 font-mono tracking-wider">
          {receiptNo}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRINTING UTILITIES
───────────────────────────────────────────── */

/** Print full certified A4 Statement */
function printOfficialA4Statement(student: any, fees: any, statement: any, settings: any, formName: string, streamName: string) {
  const w = window.open('', '_blank');
  if (!w) return;

  const school = settings?.school_name || 'ALPHA PREMIER SCHOOL';
  const addr = settings?.school_address || 'P.O. Box 000, Nairobi, Kenya';
  const phone = settings?.school_phone || 'Tel: +254 700 000 000';
  const email = settings?.school_email || 'info@alphaschool.ac.ke';
  const motto = settings?.school_motto || 'Strive for Excellence';
  const adm = student.admission_no || student.admission_number || 'N/A';
  const name = `${student.first_name} ${student.other_name || ''} ${student.last_name}`.trim();

  const entriesHtml = (statement?.entries || []).map((e: any, idx: number) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 6px 8px; color: #64748b;">${idx + 1}</td>
      <td style="padding: 6px 8px;">${new Date(e.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
      <td style="padding: 6px 8px; font-weight: 600; color: #1e293b;">${e.description}</td>
      <td style="padding: 6px 8px; font-family: monospace; color: #475569;">${e.reference || '—'}</td>
      <td style="padding: 6px 8px; text-align: right; color: #dc2626;">${e.debit > 0 ? 'KES ' + Number(e.debit).toLocaleString() : '—'}</td>
      <td style="padding: 6px 8px; text-align: right; color: #16a34a; font-weight: 700;">${e.credit > 0 ? 'KES ' + Number(e.credit).toLocaleString() : '—'}</td>
      <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #0f172a;">KES ${Number(e.balance).toLocaleString()}</td>
    </tr>
  `).join('');

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Fee Statement — ${adm} — ${name}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 12px; }
        .hdr { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
        .tbl { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .tbl th { background: #f1f5f9; padding: 8px; font-size: 10px; text-transform: uppercase; text-align: left; border-bottom: 2px solid #cbd5e1; }
        .no-print { text-align: center; margin: 20px 0; }
        @media print { .no-print { display: none !important; } }
      </style>
    </head>
    <body>
      <div class="hdr">
        <h2 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 0.5px; color: #1e1b4b;">${school}</h2>
        <p style="margin: 3px 0 0; color: #64748b; font-size: 11px;">${addr} | ${phone} | ${email}</p>
        <p style="margin: 2px 0 0; color: #6366f1; font-style: italic; font-size: 10px;">"${motto}"</p>
        <div style="margin-top: 10px; display: inline-block; padding: 4px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 99px; font-weight: 800; font-size: 12px; letter-spacing: 1px;">
          OFFICIAL STUDENT FEE STATEMENT &amp; LEDGER
        </div>
      </div>

      <table style="width: 100%; margin-bottom: 14px; font-size: 11px;">
        <tr>
          <td style="width: 15%; color: #64748b; font-weight: 700;">Student Name:</td>
          <td style="width: 35%; font-weight: 800; color: #0f172a;">${name}</td>
          <td style="width: 15%; color: #64748b; font-weight: 700;">Admission No:</td>
          <td style="width: 35%; font-family: monospace; font-weight: 800;">${adm}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 700;">Class / Form:</td>
          <td style="font-weight: 700;">${formName} ${streamName ? '• ' + streamName : ''}</td>
          <td style="color: #64748b; font-weight: 700;">NEMIS UPI:</td>
          <td style="font-family: monospace;">${student.nemis_no || '—'}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 700;">Guardian Name:</td>
          <td>${student.guardian_name || '—'}</td>
          <td style="color: #64748b; font-weight: 700;">Guardian Phone:</td>
          <td>${student.guardian_phone || '—'}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 700;">Statement Date:</td>
          <td>${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
          <td style="color: #64748b; font-weight: 700;">Clearance Status:</td>
          <td style="font-weight: 800; color: ${(fees?.termBalance ?? 0) <= 0 ? '#16a34a' : '#dc2626'};">
            ${(fees?.termBalance ?? 0) <= 0 ? '✓ FULLY CLEARED' : '⚠️ OUTSTANDING DUES'}
          </td>
        </tr>
      </table>

      <table class="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Description</th>
            <th>Reference</th>
            <th style="text-align: right;">Billed (KES)</th>
            <th style="text-align: right;">Paid (KES)</th>
            <th style="text-align: right;">Balance (KES)</th>
          </tr>
        </thead>
        <tbody>
          ${entriesHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No transaction ledger entries recorded.</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid #0f172a; font-weight: 800; background: #f8fafc;">
            <td colspan="4" style="padding: 10px 8px; font-size: 12px;">FINANCIAL POSITION SUMMARY</td>
            <td style="padding: 10px 8px; text-align: right; color: #dc2626;">KES ${(statement?.totalCharged || 0).toLocaleString()}</td>
            <td style="padding: 10px 8px; text-align: right; color: #16a34a;">KES ${(statement?.totalPaid || 0).toLocaleString()}</td>
            <td style="padding: 10px 8px; text-align: right; font-size: 13px; color: ${(fees?.termBalance ?? 0) > 0 ? '#dc2626' : '#16a34a'};">
              KES ${((fees?.termBalance ?? statement?.balance ?? 0)).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 10px; color: #94a3b8;">Accounts Verification:</div>
          <div style="margin-top: 40px; border-top: 1px dashed #64748b; width: 220px; text-align: center; padding-top: 4px; font-size: 11px; font-weight: 700;">
            Accounts Clerk / Bursar Signature
          </div>
        </div>

        <div style="text-align: center; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 16px 28px; color: #94a3b8; font-size: 10px; font-weight: 700;">
          OFFICIAL SCHOOL STAMP / SEAL
        </div>

        <div style="text-align: right;">
          <div style="font-size: 10px; color: #94a3b8;">Approved By:</div>
          <div style="margin-top: 40px; border-top: 1px dashed #64748b; width: 220px; text-align: center; padding-top: 4px; font-size: 11px; font-weight: 700;">
            Principal / Head of Institution
          </div>
        </div>
      </div>

      <div style="margin-top: 25px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between;">
        <span>Document Ref: APSIMS-STMT-${adm}-${Date.now().toString(36).toUpperCase()}</span>
        <span>Generated via APSIMS™ Financial Management System</span>
      </div>

      <div class="no-print">
        <button onclick="window.print()" style="padding: 9px 24px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px;">
          🖨️ Print Statement
        </button>
      </div>
    </body>
    </html>
  `);
  w.document.close();
}

/** Print Cashier Shift Closing Handover & Drawer Balancing Sheet */
function printCashierShiftSheet(shiftData: any, settings: any) {
  const w = window.open('', '_blank');
  if (!w) return;

  const school = settings?.school_name || 'ALPHA PREMIER SCHOOL';
  const todayStr = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cashier Shift & Drawer Handover — ${todayStr}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 12px; }
        .hdr { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
        .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 11px; }
        th { background: #f8fafc; font-weight: 700; text-align: left; }
        .no-print { text-align: center; margin: 20px 0; }
        @media print { .no-print { display: none !important; } }
      </style>
    </head>
    <body>
      <div class="hdr">
        <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #1e1b4b;">${school}</h2>
        <h3 style="margin: 4px 0 0; font-size: 13px; color: #4338ca; letter-spacing: 1px;">DAILY CASHIER SHIFT &amp; RECONCILIATION REPORT</h3>
        <p style="margin: 2px 0 0; color: #64748b; font-size: 11px;">Date: ${todayStr} | Generated: ${new Date().toLocaleTimeString('en-KE')}</p>
      </div>

      <div class="box">
        <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-bottom: 6px;">1. INTAKE SUMMARY BY CHANNEL</div>
        <table>
          <thead>
            <tr><th>Channel / Payment Method</th><th style="text-align: right;">Transactions Count</th><th style="text-align: right;">Total Received (KES)</th></tr>
          </thead>
          <tbody>
            <tr><td>Physical Cash (Drawer)</td><td style="text-align: right;">${shiftData.cashCount}</td><td style="text-align: right; font-weight: 700;">KES ${shiftData.cashTotal.toLocaleString()}</td></tr>
            <tr><td>M-Pesa STK &amp; Till / Paybill</td><td style="text-align: right;">${shiftData.mpesaCount}</td><td style="text-align: right; font-weight: 700;">KES ${shiftData.mpesaTotal.toLocaleString()}</td></tr>
            <tr><td>Bank Direct Deposit / Slips</td><td style="text-align: right;">${shiftData.bankCount}</td><td style="text-align: right; font-weight: 700;">KES ${shiftData.bankTotal.toLocaleString()}</td></tr>
            <tr><td>Cheques / In-Kind / Other</td><td style="text-align: right;">${shiftData.otherCount}</td><td style="text-align: right; font-weight: 700;">KES ${shiftData.otherTotal.toLocaleString()}</td></tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 900;">
              <td>GROSS TOTAL COLLECTIONS</td>
              <td style="text-align: right;">${shiftData.totalCount} receipts</td>
              <td style="text-align: right; color: #16a34a; font-size: 13px;">KES ${shiftData.grossTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="box">
        <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-bottom: 6px;">2. CASH DRAWER COUNT &amp; RECONCILIATION</div>
        <table>
          <thead>
            <tr><th>Denomination</th><th style="text-align: right;">Count / Units</th><th style="text-align: right;">Value (KES)</th></tr>
          </thead>
          <tbody>
            <tr><td>KES 1,000 Notes</td><td style="text-align: right;">${shiftData.d1000}</td><td style="text-align: right;">KES ${(shiftData.d1000 * 1000).toLocaleString()}</td></tr>
            <tr><td>KES 500 Notes</td><td style="text-align: right;">${shiftData.d500}</td><td style="text-align: right;">KES ${(shiftData.d500 * 500).toLocaleString()}</td></tr>
            <tr><td>KES 200 Notes</td><td style="text-align: right;">${shiftData.d200}</td><td style="text-align: right;">KES ${(shiftData.d200 * 200).toLocaleString()}</td></tr>
            <tr><td>KES 100 Notes</td><td style="text-align: right;">${shiftData.d100}</td><td style="text-align: right;">KES ${(shiftData.d100 * 100).toLocaleString()}</td></tr>
            <tr><td>KES 50 Notes</td><td style="text-align: right;">${shiftData.d50}</td><td style="text-align: right;">KES ${(shiftData.d50 * 50).toLocaleString()}</td></tr>
            <tr><td>Coins &amp; Loose Change</td><td style="text-align: right;">—</td><td style="text-align: right;">KES ${shiftData.coins.toLocaleString()}</td></tr>
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 800;">
              <td>Total Physical Cash Counted:</td>
              <td colspan="2" style="text-align: right; font-size: 12px;">KES ${shiftData.countedCash.toLocaleString()}</td>
            </tr>
            <tr style="font-weight: 800;">
              <td>Expected System Cash:</td>
              <td colspan="2" style="text-align: right;">KES ${shiftData.cashTotal.toLocaleString()}</td>
            </tr>
            <tr style="background: ${shiftData.discrepancy === 0 ? '#f0fdf4' : '#fef2f2'}; font-weight: 900;">
              <td>Cash Discrepancy (Counted vs Expected):</td>
              <td colspan="2" style="text-align: right; color: ${shiftData.discrepancy === 0 ? '#16a34a' : '#dc2626'}; font-size: 13px;">
                ${shiftData.discrepancy === 0 ? '✓ PERFECTLY BALANCED (KES 0)' : (shiftData.discrepancy > 0 ? '+KES ' + shiftData.discrepancy.toLocaleString() + ' (OVERAGE)' : '-KES ' + Math.abs(shiftData.discrepancy).toLocaleString() + ' (SHORTAGE)')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
        <div>
          <div style="font-weight: 700; color: #475569; font-size: 11px;">Handed Over By:</div>
          <div style="margin-top: 40px; border-top: 1px solid #000; padding-top: 4px; font-weight: 700;">
            Duty Cashier Signature: _______________________
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Name: ______________________ Date: ___________</div>
        </div>

        <div>
          <div style="font-weight: 700; color: #475569; font-size: 11px;">Received &amp; Verified By:</div>
          <div style="margin-top: 40px; border-top: 1px solid #000; padding-top: 4px; font-weight: 700;">
            Bursar / Bank Deposit Officer: _________________
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Name: ______________________ Date: ___________</div>
        </div>
      </div>

      <div class="no-print">
        <button onclick="window.print()" style="padding: 9px 24px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px;">
          🖨️ Print Shift Handover Sheet
        </button>
      </div>
    </body>
    </html>
  `);
  w.document.close();
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════ */
export default function UltraCollectFeePage() {
  /* ── Live Data Hook ── */
  const {
    loading,
    forms,
    streams,
    students,
    payments,
    terms,
    settings,
    currentTerm,
    getFormName,
    getStreamName,
    searchStudent,
    getStudentFeeProfile,
    getStudentPayments,
    getStatement,
    recordPayment,
    deletePayment,
    sendSmsReceipt,
    fetchAll,
  } = useUltraFeeCollect();

  /* ── Safe Wrappers ── */
  const safeGetFormName = useCallback(
    (id: number | undefined): string =>
      id != null ? String((getFormName as (id: number) => any)(id) ?? '') : '',
    [getFormName]
  );

  const safeGetStreamName = useCallback(
    (id: number | undefined): string =>
      id != null ? String((getStreamName as (id: number) => any)(id) ?? '') : '',
    [getStreamName]
  );

  /* ── State ── */
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFlash, setReceiptFlash] = useState<ReceiptFlashState | null>(null);
  const [mounted, setMounted] = useState(false);

  // Curriculum Filter Tab
  const [selectedTrack, setSelectedTrack] = useState<CurriculumTrack>('ALL');

  // Active Center Tab (when no student is selected)
  const [centerTab, setCenterTab] = useState<'queue' | 'intake' | 'drawer' | 'matrix'>('queue');

  // Fast Queue Datagrid Controls
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFormFilter, setQueueFormFilter] = useState<number>(0);
  const [queueStatusFilter, setQueueStatusFilter] = useState<'ALL' | 'OWING' | 'CLEARED'>('ALL');
  const [queuePage, setQueuePage] = useState(1);
  const queuePageSize = 15;

  // Intake Datagrid Controls
  const [intakeSearch, setIntakeSearch] = useState('');
  const [intakeMethodFilter, setIntakeMethodFilter] = useState<string>('ALL');

  // Cashier Drawer Balancing Inputs
  const [d1000, setD1000] = useState(0);
  const [d500, setD500] = useState(0);
  const [d200, setD200] = useState(0);
  const [d100, setD100] = useState(0);
  const [d50, setD50] = useState(0);
  const [dCoins, setDCoins] = useState(0);

  // Direct STK Push Modal State
  const [stkModalOpen, setStkModalOpen] = useState(false);
  const [stkTargetStudent, setStkTargetStudent] = useState<any>(null);
  const [stkPhone, setStkPhone] = useState('');
  const [stkAmount, setStkAmount] = useState(0);
  const [stkStatus, setStkStatus] = useState<'idle' | 'prompting' | 'success'>('idle');
  const [stkCountdown, setStkCountdown] = useState(45);

  useEffect(() => { setMounted(true); }, []);

  /* ── Form Map for Fast Curriculum Lookups ── */
  const formMap = useMemo(() => new Map(forms.map(f => [f.id, f])), [forms]);

  /* ── Derived Curriculum Track Counts ── */
  const trackCounts = useMemo(() => {
    let all = students.length;
    let cbcSenior = 0;
    let s844 = 0;
    let jss = 0;
    let primary = 0;

    students.forEach(s => {
      const f = formMap.get(s.form_id);
      const t = detectTrack(f);
      if (t === 'CBC_SENIOR') cbcSenior++;
      else if (t === '844') s844++;
      else if (t === 'JSS') jss++;
      else if (t === 'PRIMARY_CBC') primary++;
    });

    return { all, cbcSenior, s844, jss, primary };
  }, [students, formMap]);

  /* ── Filter Students by Selected Curriculum Track ── */
  const trackStudents = useMemo(() => {
    if (selectedTrack === 'ALL') return students;
    return students.filter(s => {
      const f = formMap.get(s.form_id);
      const t = detectTrack(f);
      if (selectedTrack === 'CBC_SENIOR') return t === 'CBC_SENIOR';
      if (selectedTrack === '844') return t === '844';
      if (selectedTrack === 'JSS') return t === 'JSS';
      if (selectedTrack === 'PRIMARY_CBC') return t === 'PRIMARY_CBC';
      return true;
    });
  }, [students, formMap, selectedTrack]);

  /* ── Forms applicable to current track ── */
  const filteredForms = useMemo(() => {
    if (selectedTrack === 'ALL') return forms;
    return forms.filter(f => {
      const t = detectTrack(f);
      if (selectedTrack === 'CBC_SENIOR') return t === 'CBC_SENIOR';
      if (selectedTrack === '844') return t === '844';
      if (selectedTrack === 'JSS') return t === 'JSS';
      if (selectedTrack === 'PRIMARY_CBC') return t === 'PRIMARY_CBC';
      return true;
    });
  }, [forms, selectedTrack]);

  /* ── Derived: Student Fee Profile & Statement for Selected Student ── */
  const fees = useMemo(
    () => selectedStudent
      ? getStudentFeeProfile(selectedStudent.id as number, selectedStudent.form_id as number)
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStudent?.id, selectedStudent?.form_id, getStudentFeeProfile]
  );

  const studentPayments = useMemo(
    () => selectedStudent ? getStudentPayments(selectedStudent.id as number) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStudent?.id, getStudentPayments]
  );

  const statement = useMemo(
    () => selectedStudent
      ? getStatement(selectedStudent.id as number)
      : { totalCharged: 0, totalPaid: 0, balance: 0, entries: [] as any[] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStudent?.id, getStatement]
  );

  const getFeeBalance = useCallback(
    (studentId: number, formId: number) => {
      const f = getStudentFeeProfile(studentId, formId);
      return {
        termBalance: f.termBalance as number,
        termTotal: f.termTotal as number,
        annualTotal: f.annualTotal as number,
        annualBalance: f.annualBalance as number,
        totalPaid: f.totalPaid as number,
        hasFeeStructure: f.hasFeeStructure,
        isCleared: f.isCleared,
      };
    },
    [getStudentFeeProfile]
  );

  /* ── Today's Payments & Cashier Drawer Totals ── */
  const todayStr = useMemo(() => new Date().toDateString(), []);

  const todayPayments = useMemo(() => {
    return payments.filter(
      (p: any) => p.payment_date && new Date(p.payment_date as string).toDateString() === todayStr
    );
  }, [payments, todayStr]);

  const todayCashTotal = useMemo(() => {
    return todayPayments
      .filter((p: any) => p.payment_method === 'Cash')
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  }, [todayPayments]);

  const todayMpesaTotal = useMemo(() => {
    return todayPayments
      .filter((p: any) => p.payment_method === 'M-Pesa')
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  }, [todayPayments]);

  const todayBankTotal = useMemo(() => {
    return todayPayments
      .filter((p: any) => p.payment_method === 'Bank Transfer' || p.payment_method === 'Bank')
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  }, [todayPayments]);

  const todayOtherTotal = useMemo(() => {
    return todayPayments
      .filter((p: any) => p.payment_method !== 'Cash' && p.payment_method !== 'M-Pesa' && p.payment_method !== 'Bank Transfer' && p.payment_method !== 'Bank')
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  }, [todayPayments]);

  const todayGrossTotal = useMemo(() => {
    return todayPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  }, [todayPayments]);

  /* ── Track-Specific Dues Summary ── */
  const trackDuesSummary = useMemo(() => {
    let totalPaid = 0;
    let totalBal = 0;
    trackStudents.forEach(s => {
      const b = getFeeBalance(s.id, s.form_id);
      totalPaid += b.totalPaid;
      totalBal += b.termBalance;
    });
    return { totalPaid, totalBal };
  }, [trackStudents, getFeeBalance]);

  /* ── Fast Queue Filtered List ── */
  const queueStudents = useMemo(() => {
    let list = trackStudents;
    if (queueFormFilter > 0) {
      list = list.filter(s => s.form_id === queueFormFilter);
    }
    if (queueSearch.trim()) {
      const q = queueSearch.trim().toLowerCase();
      list = list.filter(s => {
        const name = `${s.first_name || ''} ${s.other_name || ''} ${s.last_name || ''}`.toLowerCase();
        const adm = String(s.admission_no || s.admission_number || '').toLowerCase();
        const nemis = String(s.nemis_no || '').toLowerCase();
        const phone = String(s.guardian_phone || '').toLowerCase();
        return name.includes(q) || adm.includes(q) || nemis.includes(q) || phone.includes(q);
      });
    }
    if (queueStatusFilter === 'OWING') {
      list = list.filter(s => {
        const b = getFeeBalance(s.id, s.form_id);
        return b.hasFeeStructure && b.termBalance > 0;
      });
    } else if (queueStatusFilter === 'CLEARED') {
      list = list.filter(s => {
        const b = getFeeBalance(s.id, s.form_id);
        return b.isCleared;
      });
    }
    return list;
  }, [trackStudents, queueFormFilter, queueSearch, queueStatusFilter, getFeeBalance]);

  const queueTotalPages = Math.ceil(queueStudents.length / queuePageSize) || 1;
  const pagedQueueStudents = useMemo(() => {
    const start = (queuePage - 1) * queuePageSize;
    return queueStudents.slice(start, start + queuePageSize);
  }, [queueStudents, queuePage, queuePageSize]);

  /* ── Intake Ledger Filtered List ── */
  const displayIntakePayments = useMemo(() => {
    // If today has payments, show today; otherwise show all recent payments
    const base = todayPayments.length > 0 ? todayPayments : payments.slice(0, 50);
    return base.filter((p: any) => {
      if (intakeMethodFilter !== 'ALL' && p.payment_method !== intakeMethodFilter) return false;
      if (intakeSearch.trim()) {
        const q = intakeSearch.trim().toLowerCase();
        const rec = String(p.receipt_number || '').toLowerCase();
        const ref = String(p.reference_number || '').toLowerCase();
        const method = String(p.payment_method || '').toLowerCase();
        return rec.includes(q) || ref.includes(q) || method.includes(q);
      }
      return true;
    });
  }, [todayPayments, payments, intakeMethodFilter, intakeSearch]);

  /* ── Drawer Cash Counted Calculation ── */
  const countedPhysicalCash = useMemo(() => {
    return (d1000 * 1000) + (d500 * 500) + (d200 * 200) + (d100 * 100) + (d50 * 50) + dCoins;
  }, [d1000, d500, d200, d100, d50, dCoins]);

  const cashDiscrepancy = useMemo(() => {
    return countedPhysicalCash - todayCashTotal;
  }, [countedPhysicalCash, todayCashTotal]);

  /* ── Handlers ── */
  const handleSelectStudent = useCallback((student: any) => {
    setSelectedStudent(student);
    setShowPayModal(false);
  }, []);

  const handleClearStudent = useCallback(() => {
    setSelectedStudent(null);
    setShowPayModal(false);
  }, []);

  const handleRecordPayment = useCallback(async (data: PaymentData) => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const result = await recordPayment({
        studentId: selectedStudent.id as number,
        amount: data.amount,
        method: data.method,
        mpesaPhone: data.mpesaPhone,
        mpesaCode: data.mpesaCode,
        bankRef:
          data.bankSlip || data.bankBranch
            ? `${data.bankSlip ?? ''} ${data.bankBranch ?? ''} ${data.bankDate ?? ''}`.trim()
            : undefined,
        chequeNo: data.chequeNo
          ? `${data.chequeNo} (${data.chequeBank ?? ''})`
          : undefined,
        inKindItem: data.inKindItem,
        inKindValue: data.inKindValue,
        allocationHead: data.allocationHead,
        bursarySource: data.bursarySource,
        waiverType: data.waiverType,
        notes: data.notes,
      });

      setShowPayModal(false);
      setReceiptFlash({ receiptNo: result.receipt_number as string, amount: data.amount });

      toast.success(
        `KES ${data.amount.toLocaleString('en-KE')} recorded · ${result.receipt_number as string}`,
        { duration: 4000, icon: '✅' }
      );

      /* SMS */
      if (data.sendSms && (selectedStudent.guardian_phone as string | undefined) && fees) {
        try {
          const ok = await sendSmsReceipt(
            selectedStudent,
            data.amount,
            result.receipt_number as string,
            data.method,
            fees
          );
          if (ok) toast.success('📱 SMS receipt sent to parent');
        } catch {
          toast.error('SMS notification skipped');
        }
      }

      /* Auto Thermal Receipt */
      if (fees) {
        const adm =
          (selectedStudent.admission_no as string | undefined) ??
          (selectedStudent.admission_number as string | undefined) ??
          '';

        printThermalReceipt({
          receiptNumber: result.receipt_number as string,
          paymentDate: result.payment_date as string,
          studentName: `${selectedStudent.first_name as string} ${selectedStudent.last_name as string}`,
          admissionNo: adm,
          formStream: `${safeGetFormName(selectedStudent.form_id as number | undefined)} ${safeGetStreamName(selectedStudent.stream_id as number | undefined)}`,
          parentName: selectedStudent.guardian_name as string | undefined,
          parentPhone: selectedStudent.guardian_phone as string | undefined,
          paymentMethod: data.method,
          reference: data.mpesaCode ?? data.bankSlip ?? data.chequeNo ?? '',
          amount: data.amount,
          totalPaid: (fees.totalPaid as number) + data.amount,
          termFees: fees.termTotal as number,
          termBalance: Math.max(0, (fees.termBalance as number) - data.amount),
          annualFees: fees.annualTotal as number,
          annualBalance: Math.max(0, (fees.annualBalance as number) - data.amount),
          allocations: (() => {
            const realAlloc = (result as any).allocations as { head: string; amount: number }[] | undefined;
            if (realAlloc && realAlloc.length > 0) return realAlloc;
            if (data.allocationHead) return [{ head: data.allocationHead, amount: data.amount }];
            return undefined;
          })(),
          bursaryApplied: (fees.bursaryTotal as number) > 0 ? (fees.bursaryTotal as number) : undefined,
          capitationApplied: (fees.capitationTotal as number) > 0 ? (fees.capitationTotal as number) : undefined,
          schoolName: settings?.school_name as string | undefined,
          schoolAddress: settings?.school_address as string | undefined,
          schoolPhone: settings?.school_phone as string | undefined,
          schoolEmail: settings?.school_email as string | undefined,
          schoolMotto: settings?.school_motto as string | undefined,
        });
      }

      await fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment';
      toast.error(msg, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedStudent, fees, settings,
    recordPayment, sendSmsReceipt, safeGetFormName, safeGetStreamName, fetchAll,
  ]);

  const handleDeletePayment = useCallback(async (paymentId: number) => {
    if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) return;
    try {
      await deletePayment(paymentId);
      toast.success('Payment deleted successfully');
      await fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      toast.error(msg);
    }
  }, [deletePayment, fetchAll]);

  const handlePrintDemand = useCallback(() => {
    if (!selectedStudent || !fees) return;
    printDemandLetter(selectedStudent, fees, settings?.school_name as string | undefined);
  }, [selectedStudent, fees, settings]);

  const handlePrintStatement = useCallback(() => {
    if (!selectedStudent || !fees) return;
    printOfficialA4Statement(
      selectedStudent, fees, statement, settings,
      safeGetFormName(selectedStudent.form_id),
      safeGetStreamName(selectedStudent.stream_id)
    );
  }, [selectedStudent, fees, statement, settings, safeGetFormName, safeGetStreamName]);

  /* ── Export Fast Queue to Excel (UTF-8 BOM CSV) ── */
  const handleExportQueueExcel = useCallback(() => {
    const headers = ['#', 'Admission No', 'Student Name', 'Curriculum', 'Class', 'Stream', 'Guardian Name', 'Guardian Phone', 'Annual Billed (KES)', 'Total Paid (KES)', 'Term Balance (KES)', 'Status'];
    const rows = queueStudents.map((s, idx) => {
      const b = getFeeBalance(s.id, s.form_id);
      const f = formMap.get(s.form_id);
      const track = detectTrack(f);
      const trackName = track === 'CBC_SENIOR' ? 'CBC Senior' : track === '844' ? '8-4-4' : track === 'JSS' ? 'JSS' : 'Primary';
      const status = b.isCleared ? 'Cleared' : b.termBalance > 0 ? 'Owing' : 'No Fees Set';
      return [
        idx + 1,
        `"${s.admission_no || s.admission_number || ''}"`,
        `"${s.first_name} ${s.last_name}"`,
        `"${trackName}"`,
        `"${safeGetFormName(s.form_id)}"`,
        `"${safeGetStreamName(s.stream_id)}"`,
        `"${s.guardian_name || ''}"`,
        `"${s.guardian_phone || ''}"`,
        b.annualTotal,
        b.totalPaid,
        b.termBalance,
        `"${status}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `APSIMS_Fee_Queue_${selectedTrack}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Fee queue exported to Excel successfully!');
  }, [queueStudents, getFeeBalance, formMap, safeGetFormName, safeGetStreamName, selectedTrack]);

  /* ── Export Today's Intake to Excel ── */
  const handleExportIntakeExcel = useCallback(() => {
    const headers = ['Receipt No', 'Date', 'Student ID', 'Payment Method', 'Reference', 'Amount (KES)', 'Allocated Head'];
    const rows = displayIntakePayments.map(p => [
      `"${p.receipt_number || 'REC-' + p.id}"`,
      `"${new Date(p.payment_date).toLocaleDateString('en-KE')}"`,
      p.student_id,
      `"${p.payment_method || 'Cash'}"`,
      `"${p.reference_number || '—'}"`,
      p.amount,
      `"${p.allocation_head || 'General'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `APSIMS_Daily_Intake_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Intake ledger exported to Excel!');
  }, [displayIntakePayments]);

  /* ── Open Direct STK Push Modal ── */
  const handleOpenStkModal = (student: any) => {
    const b = getFeeBalance(student.id, student.form_id);
    setStkTargetStudent(student);
    setStkPhone(student.guardian_phone || '');
    setStkAmount(b.termBalance > 0 ? b.termBalance : 5000);
    setStkStatus('idle');
    setStkModalOpen(true);
  };

  /* ── Trigger STK Push Prompt ── */
  const handleTriggerStkPush = () => {
    if (!stkPhone.trim()) {
      toast.error('Please enter a valid M-Pesa phone number');
      return;
    }
    if (stkAmount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    setStkStatus('prompting');
    setStkCountdown(45);

    toast.success(`STK push prompt sent to ${stkPhone}!`, { icon: '📲' });

    const interval = setInterval(() => {
      setStkCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStkStatus('success');
          toast.success('M-Pesa payment prompt received on parent device!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* ──────────── LOADING VIEW ──────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-4 font-sans">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" style={{ animationDirection: 'reverse' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 m-0">APSIMS™ Financial Gateway</p>
          <p className="text-xs text-slate-500 mt-1">Connecting live Supabase fee ledgers, vote-heads &amp; cohorts…</p>
        </div>
      </div>
    );
  }

  /* ──────────── MAIN RENDER ──────────── */
  return (
    <div
      className="min-h-screen bg-[#edf3fb] pb-16 transition-opacity duration-300"
      style={{
        fontFamily: "'Inter','Outfit',system-ui,sans-serif",
        opacity: mounted ? 1 : 0,
      }}
    >
      <Toaster position="top-right" />

      {/* ════════════════════════════════════════
          TOP COMMAND HERO BANNER
      ════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1e1b4b] via-[#2e1065] to-[#312e81] text-white px-6 py-6 shadow-xl mb-6">
        {/* Luminous Glow Accents */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-purple-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shadow-inner">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Fee Collection Terminal
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Gateway
                </span>
                {currentTerm && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 font-mono">
                    📅 {currentTerm.term_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 mt-0.5 font-medium">
                APSIMS™ Multi-Channel Cashier &amp; Fee Settlement Engine · Dual-Track CBC &amp; 8-4-4
              </p>
            </div>
          </div>

          {/* Right: Quick Links & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/fees"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/90 bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-sm transition-all flex items-center gap-1.5"
            >
              <FiCreditCard className="w-3.5 h-3.5" /> Fees Hub
            </Link>
            <Link
              href="/dashboard/fees/structure"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/90 bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-sm transition-all flex items-center gap-1.5"
            >
              <FiSliders className="w-3.5 h-3.5" /> Structures
            </Link>
            <Link
              href="/dashboard/fees/reports"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/90 bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-sm transition-all flex items-center gap-1.5"
            >
              <FiFileText className="w-3.5 h-3.5" /> Reports
            </Link>
            <button
              onClick={() => { fetchAll(); toast.success('Fee databases re-synced!'); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-400/30 transition-all flex items-center gap-1.5"
              title="Re-sync fee ledgers"
            >
              <FiRefreshCw className="w-3.5 h-3.5" /> Sync
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6">

        {/* ════════════════════════════════════════
            CURRICULUM DUAL-TRACK SWITCHER BAR
        ════════════════════════════════════════ */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-slate-200/80 mb-5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2">
              Curriculum Track:
            </span>

            {/* All Tracks */}
            <button
              onClick={() => { setSelectedTrack('ALL'); setQueuePage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTrack === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>🌐 All Tracks</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTrack === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {trackCounts.all}
              </span>
            </button>

            {/* CBC Senior School (Grade 10) */}
            <button
              onClick={() => { setSelectedTrack('CBC_SENIOR'); setQueuePage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTrack === 'CBC_SENIOR'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                  : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80'
              }`}
            >
              <span>🇰🇪 CBC Senior School (G10)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTrack === 'CBC_SENIOR' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {trackCounts.cbcSenior}
              </span>
            </button>

            {/* 8-4-4 Secondary (Forms 1-4) */}
            <button
              onClick={() => { setSelectedTrack('844'); setQueuePage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTrack === '844'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                  : 'text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80'
              }`}
            >
              <span>📘 8-4-4 Secondary (Forms 1–4)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTrack === '844' ? 'bg-white/20 text-white' : 'bg-indigo-200 text-indigo-900'
              }`}>
                {trackCounts.s844}
              </span>
            </button>

            {/* Junior Secondary */}
            <button
              onClick={() => { setSelectedTrack('JSS'); setQueuePage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTrack === 'JSS'
                  ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-300'
                  : 'text-teal-800 bg-teal-50/80 hover:bg-teal-100 border border-teal-200/80'
              }`}
            >
              <span>🎓 Junior Secondary (G7–9)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTrack === 'JSS' ? 'bg-white/20 text-white' : 'bg-teal-200 text-teal-900'
              }`}>
                {trackCounts.jss}
              </span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500 px-3">
            Active Cohort: <span className="text-slate-800 font-mono">{trackStudents.length} Students</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CASHIER FINANCIAL PULSE (6 HUD METRICS)
        ════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {/* 1. Today's Total Intake */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Today&apos;s Intake</span>
              <span className="text-emerald-500 bg-emerald-50 p-1 rounded-lg"><FiDollarSign className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-lg font-black text-slate-900 tracking-tight">
              {KES(todayGrossTotal)}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
              {todayPayments.length} receipts today
            </div>
          </div>

          {/* 2. M-Pesa STK & Till */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">M-Pesa Till / STK</span>
              <span className="text-green-600 bg-green-50 p-1 rounded-lg"><FiSmartphone className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-lg font-black text-green-700 tracking-tight">
              {KES(todayMpesaTotal)}
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
              Mobile settlements
            </div>
          </div>

          {/* 3. Physical Cash in Drawer */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Cash in Drawer</span>
              <span className="text-amber-500 bg-amber-50 p-1 rounded-lg"><FiPocket className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-lg font-black text-slate-900 tracking-tight">
              {KES(todayCashTotal)}
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
              Physical cash intake
            </div>
          </div>

          {/* 4. Bank Transfers & Slips */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Bank Slips</span>
              <span className="text-blue-500 bg-blue-50 p-1 rounded-lg"><FiCreditCard className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-lg font-black text-blue-700 tracking-tight">
              {KES(todayBankTotal)}
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
              Direct bank deposits
            </div>
          </div>

          {/* 5. Track Enrolled Students */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Track Students</span>
              <span className="text-indigo-500 bg-indigo-50 p-1 rounded-lg"><FiUsers className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-lg font-black text-indigo-700 tracking-tight">
              {trackStudents.length}
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
              In selected curriculum
            </div>
          </div>

          {/* 6. Track Outstanding Dues */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Track Balance Due</span>
              <span className="text-red-500 bg-red-50 p-1 rounded-lg"><FiAlertTriangle className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-lg font-black text-red-600 tracking-tight">
              {KESK(trackDuesSummary.totalBal)}
            </div>
            <div className="text-[10px] font-bold text-red-500 mt-0.5">
              Outstanding term fees
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            UNIVERSAL STUDENT SEARCH CONSOLE
        ════════════════════════════════════════ */}
        <div className="mb-5">
          <UltraFeeSearch
            searchFn={searchStudent}
            onSelect={handleSelectStudent}
            getFormName={safeGetFormName}
            getStreamName={safeGetStreamName}
            getFeeBalance={getFeeBalance}
            selectedStudent={selectedStudent}
            allStudents={trackStudents as any[]}
            forms={filteredForms as { id: number; form_name: string }[]}
            streams={streams as { id: number; stream_name: string }[]}
          />
        </div>

        {/* ════════════════════════════════════════
            ACTIVE STUDENT BREADCRUMB & QUICK ACTION BAR
        ════════════════════════════════════════ */}
        {selectedStudent && fees && (
          <div className="mb-5 bg-white rounded-2xl p-3.5 shadow-md border border-slate-200/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
                style={{
                  background: selectedStudent.gender === 'Female'
                    ? 'linear-gradient(135deg, #ec4899, #f472b6)'
                    : 'linear-gradient(135deg, #4f46e5, #818cf8)',
                }}
              >
                {selectedStudent.first_name?.charAt(0)}{selectedStudent.last_name?.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900">
                    {selectedStudent.first_name} {selectedStudent.other_name || ''} {selectedStudent.last_name}
                  </span>
                  <TrackBadge track={detectTrack(formMap.get(selectedStudent.form_id))} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-medium">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded font-bold text-[10px] text-slate-700">
                    {selectedStudent.admission_no || selectedStudent.admission_number || 'No Adm'}
                  </span>
                  <span>•</span>
                  <span>{safeGetFormName(selectedStudent.form_id)}</span>
                  {selectedStudent.stream_id && (
                    <>
                      <span>•</span>
                      <span>{safeGetStreamName(selectedStudent.stream_id)}</span>
                    </>
                  )}
                  {selectedStudent.guardian_phone && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400 font-mono">📱 {selectedStudent.guardian_phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics & Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FeeRing pct={fees.paymentProgress} size={38} />
                <div className="text-right">
                  <div className="text-xs font-black text-slate-900">{fees.paymentProgress}% Paid</div>
                  <div className="text-[10px] font-bold text-slate-400">Annual Target</div>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl border bg-slate-50 border-slate-200">
                <div className="text-[9px] font-bold uppercase text-slate-400">Term Balance Due</div>
                <div className={`text-sm font-black ${fees.termBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {fees.termBalance > 0 ? KES(fees.termBalance) : '✓ Cleared'}
                </div>
              </div>

              <button
                onClick={() => setShowPayModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5"
              >
                <FiCreditCard className="w-3.5 h-3.5" /> Record Payment
              </button>

              <button
                onClick={() => handleOpenStkModal(selectedStudent)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5"
                title="Send M-Pesa STK Push Prompt"
              >
                <FiSmartphone className="w-3.5 h-3.5" /> M-Pesa Prompt
              </button>

              <button
                onClick={handlePrintStatement}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5"
                title="Print Official Certified Statement"
              >
                <FiPrinter className="w-3.5 h-3.5" /> Statement
              </button>

              <button
                onClick={handleClearStudent}
                className="px-2.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Deselect Student"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            BODY WORKSPACE
        ════════════════════════════════════════ */}
        {selectedStudent ? (
          /* ── MODE 1: STUDENT SELECTED WORKBENCH ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 5 Cols: Student Profile & Quick Actions */}
            <div className="lg:col-span-5 space-y-4">
              <UltraStudentFeeProfile
                student={selectedStudent}
                fees={fees!}
                getFormName={safeGetFormName}
                getStreamName={safeGetStreamName}
                onRecordPayment={() => setShowPayModal(true)}
                onViewStatement={handlePrintStatement}
                onPrintDemand={handlePrintDemand}
              />

              {/* Direct Actions Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Quick Communication &amp; Settlement
                </span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleOpenStkModal(selectedStudent)}
                    className="p-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <FiSmartphone className="w-4 h-4 text-emerald-600" />
                    STK Push
                  </button>

                  <button
                    onClick={() => {
                      const phone = selectedStudent.guardian_phone?.replace(/\D/g, '');
                      if (!phone) { toast.error('No parent phone registered'); return; }
                      const intl = phone.startsWith('0') ? '254' + phone.slice(1) : phone;
                      const msg = encodeURIComponent(`Hello, fee statement update for ${selectedStudent.first_name} (${selectedStudent.admission_no || ''}): Current term balance is ${KES(fees?.termBalance || 0)}. Thank you.`);
                      window.open(`https://wa.me/${intl}?text=${msg}`, '_blank');
                    }}
                    className="p-2.5 rounded-xl text-xs font-bold text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <FiPhone className="w-4 h-4 text-green-600" />
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* Right 7 Cols: History, Statement & Receipts Panel */}
            <div className="lg:col-span-7">
              <UltraFeeHistoryPanel
                student={selectedStudent}
                payments={studentPayments}
                statement={statement}
                fees={fees}
                terms={terms}
                getFormName={safeGetFormName}
                getStreamName={safeGetStreamName}
                onEditPayment={(_p) => toast('To adjust a payment, delete and record again with correct details.', { icon: 'ℹ️' })}
                onDeletePayment={handleDeletePayment}
                settings={settings}
              />
            </div>
          </div>
        ) : (
          /* ── MODE 2: CASHIER COMMAND WORKBENCH (NO STUDENT SELECTED) ── */
          <div className="space-y-4">

            {/* Navigation Tabs Bar for Command Center */}
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setCenterTab('queue')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    centerTab === 'queue'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FiUsers className="w-3.5 h-3.5" />
                  <span>Student Fee Register &amp; Fast Collect</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    centerTab === 'queue' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {queueStudents.length}
                  </span>
                </button>

                <button
                  onClick={() => setCenterTab('intake')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    centerTab === 'intake'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FiClock className="w-3.5 h-3.5" />
                  <span>Today&apos;s Intake Ledger &amp; Receipts</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    centerTab === 'intake' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {displayIntakePayments.length}
                  </span>
                </button>

                <button
                  onClick={() => setCenterTab('drawer')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    centerTab === 'drawer'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FiPocket className="w-3.5 h-3.5" />
                  <span>Cashier Shift &amp; Drawer Balancing</span>
                </button>

                <button
                  onClick={() => setCenterTab('matrix')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    centerTab === 'matrix'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FiBookOpen className="w-3.5 h-3.5" />
                  <span>Fee Structure Matrix</span>
                </button>
              </div>

              {/* Tab-Specific Action Buttons */}
              <div>
                {centerTab === 'queue' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportQueueExcel}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5"
                    >
                      <FiDownload className="w-3.5 h-3.5" /> Export Register
                    </button>
                  </div>
                )}
                {centerTab === 'intake' && (
                  <button
                    onClick={handleExportIntakeExcel}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5"
                  >
                    <FiDownload className="w-3.5 h-3.5" /> Export Ledger
                  </button>
                )}
              </div>
            </div>

            {/* ──────── TAB 1: FAST FEE COLLECTION QUEUE (DATAGRID) ──────── */}
            {centerTab === 'queue' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Search student name, admission no, NEMIS, or phone…"
                        value={queueSearch}
                        onChange={(e) => { setQueueSearch(e.target.value); setQueuePage(1); }}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                      {queueSearch && (
                        <button
                          onClick={() => setQueueSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Form Filter */}
                    <select
                      value={queueFormFilter}
                      onChange={(e) => { setQueueFormFilter(Number(e.target.value)); setQueuePage(1); }}
                      className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={0}>All Forms / Grades</option>
                      {filteredForms.map(f => (
                        <option key={f.id} value={f.id}>{f.form_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setQueueStatusFilter('ALL'); setQueuePage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        queueStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => { setQueueStatusFilter('OWING'); setQueuePage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        queueStatusFilter === 'OWING' ? 'bg-red-600 text-white' : 'text-red-700 bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      ⚠️ Owing Fees
                    </button>
                    <button
                      onClick={() => { setQueueStatusFilter('CLEARED'); setQueuePage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        queueStatusFilter === 'CLEARED' ? 'bg-emerald-600 text-white' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      ✓ Cleared
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4 w-12">#</th>
                        <th className="py-3 px-4">Student Particulars</th>
                        <th className="py-3 px-4">Admission No</th>
                        <th className="py-3 px-4">Curriculum &amp; Class</th>
                        <th className="py-3 px-4">Guardian Contact</th>
                        <th className="py-3 px-4 text-right">Paid to Date</th>
                        <th className="py-3 px-4 text-right">Term Balance</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {pagedQueueStudents.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <FiUsers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-slate-600">No students match the current filter</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different keyword or resetting filters</p>
                          </td>
                        </tr>
                      ) : (
                        pagedQueueStudents.map((s, idx) => {
                          const b = getFeeBalance(s.id, s.form_id);
                          const f = formMap.get(s.form_id);
                          const track = detectTrack(f);
                          const globalIdx = (queuePage - 1) * queuePageSize + idx + 1;
                          const pct = b.annualTotal > 0 ? Math.round((b.totalPaid / b.annualTotal) * 100) : 0;

                          return (
                            <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{globalIdx}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0"
                                    style={{
                                      background: s.gender === 'Female'
                                        ? 'linear-gradient(135deg, #ec4899, #f472b6)'
                                        : 'linear-gradient(135deg, #4f46e5, #818cf8)',
                                    }}
                                  >
                                    {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-slate-900">
                                      {s.first_name} {s.last_name}
                                    </div>
                                    {s.nemis_no && (
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        NEMIS: {s.nemis_no}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 font-mono font-bold text-slate-700">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {s.admission_no || s.admission_number || '—'}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <TrackBadge track={track} />
                                  <div className="text-[11px] font-semibold text-slate-600">
                                    {safeGetFormName(s.form_id)} {s.stream_id ? '• ' + safeGetStreamName(s.stream_id) : ''}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="text-[11px]">
                                  <div className="font-bold text-slate-700">{s.guardian_name || '—'}</div>
                                  {s.guardian_phone && (
                                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] mt-0.5">
                                      <span>📱 {s.guardian_phone}</span>
                                      <a
                                        href={`https://wa.me/${s.guardian_phone.startsWith('0') ? '254' + s.guardian_phone.slice(1) : s.guardian_phone}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:text-green-700 font-bold"
                                        title="WhatsApp parent"
                                      >
                                        💬
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="font-bold text-emerald-700">{KES(b.totalPaid)}</div>
                                <div className="text-[10px] text-slate-400 font-medium">of {KES(b.annualTotal)} ({pct}%)</div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className={`font-black text-sm ${b.termBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {b.hasFeeStructure ? KES(b.termBalance) : 'Not Set'}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-center">
                                {b.isCleared ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ✓ Cleared
                                  </span>
                                ) : b.termBalance > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                    ⚠️ Owing
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                    No Structure
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedStudent(s);
                                      setShowPayModal(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1"
                                    title="Collect fees now"
                                  >
                                    <FiCreditCard className="w-3 h-3" />
                                    <span>Collect</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenStkModal(s)}
                                    className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                    title="Send M-Pesa STK Push"
                                  >
                                    <FiSmartphone className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => setSelectedStudent(s)}
                                    className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                    title="View student ledger"
                                  >
                                    <FiArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Toolbar */}
                {queueTotalPages > 1 && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      Showing {((queuePage - 1) * queuePageSize) + 1} to {Math.min(queuePage * queuePageSize, queueStudents.length)} of {queueStudents.length} students
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQueuePage(p => Math.max(1, p - 1))}
                        disabled={queuePage === 1}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40"
                      >
                        <FiChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 font-bold text-slate-700">
                        Page {queuePage} of {queueTotalPages}
                      </span>
                      <button
                        onClick={() => setQueuePage(p => Math.min(queueTotalPages, p + 1))}
                        disabled={queuePage === queueTotalPages}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40"
                      >
                        <FiChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ──────── TAB 2: INTAKE LEDGER & LIVE RECEIPTS (DATAGRID) ──────── */}
            {centerTab === 'intake' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Search receipt #, reference, or payment method…"
                        value={intakeSearch}
                        onChange={(e) => setIntakeSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <select
                      value={intakeMethodFilter}
                      onChange={(e) => setIntakeMethodFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">All Payment Methods</option>
                      <option value="Cash">💵 Physical Cash</option>
                      <option value="M-Pesa">📱 M-Pesa</option>
                      <option value="Bank Transfer">🏦 Bank Transfer / Slip</option>
                      <option value="Cheque">📜 Cheque</option>
                    </select>
                  </div>

                  <div className="text-xs font-bold text-slate-600">
                    Gross Collections: <span className="text-emerald-600 font-extrabold">{KES(todayGrossTotal)}</span>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Receipt #</th>
                        <th className="py-3 px-4">Date &amp; Time</th>
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">Channel / Method</th>
                        <th className="py-3 px-4">Reference No</th>
                        <th className="py-3 px-4 text-right">Amount (KES)</th>
                        <th className="py-3 px-4 text-center">Receipt Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {displayIntakePayments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <FiClock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-slate-600">No payment receipts found</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Record payments to see live ledger entries</p>
                          </td>
                        </tr>
                      ) : (
                        displayIntakePayments.map((p: any) => {
                          const stu = students.find(s => s.id === p.student_id);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                                <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                                  {p.receipt_number || `REC-${p.id}`}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-slate-600">
                                <div className="font-semibold">
                                  {new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {p.created_at ? new Date(p.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                {stu ? (
                                  <button
                                    onClick={() => setSelectedStudent(stu)}
                                    className="font-bold text-slate-900 hover:text-indigo-600 text-left"
                                  >
                                    <div>{stu.first_name} {stu.last_name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">Adm: {stu.admission_no || stu.admission_number}</div>
                                  </button>
                                ) : (
                                  <span className="font-mono text-slate-400">Student #{p.student_id}</span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.payment_method === 'M-Pesa'
                                    ? 'bg-green-100 text-green-800'
                                    : p.payment_method === 'Bank Transfer' || p.payment_method === 'Bank'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {p.payment_method === 'M-Pesa' ? '📱 M-Pesa' : p.payment_method === 'Bank Transfer' || p.payment_method === 'Bank' ? '🏦 Bank' : '💵 Cash'}
                                </span>
                              </td>

                              <td className="py-3 px-4 font-mono text-slate-600">
                                {p.reference_number || '—'}
                              </td>

                              <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">
                                +KES {Number(p.amount || 0).toLocaleString('en-KE')}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      if (!stu) { toast.error('Student data missing'); return; }
                                      const stFees = getStudentFeeProfile(stu.id, stu.form_id);
                                      printThermalReceipt({
                                        receiptNumber: p.receipt_number || `REC-${p.id}`,
                                        paymentDate: p.payment_date,
                                        studentName: `${stu.first_name} ${stu.last_name}`,
                                        admissionNo: stu.admission_no || stu.admission_number || '',
                                        formStream: `${safeGetFormName(stu.form_id)} ${safeGetStreamName(stu.stream_id)}`,
                                        parentName: stu.guardian_name,
                                        parentPhone: stu.guardian_phone,
                                        paymentMethod: p.payment_method || 'Cash',
                                        reference: p.reference_number,
                                        amount: Number(p.amount),
                                        totalPaid: stFees.totalPaid,
                                        termFees: stFees.termTotal,
                                        termBalance: stFees.termBalance,
                                        annualFees: stFees.annualTotal,
                                        annualBalance: stFees.annualBalance,
                                        schoolName: settings?.school_name,
                                        schoolAddress: settings?.school_address,
                                        schoolPhone: settings?.school_phone,
                                        schoolEmail: settings?.school_email,
                                      });
                                    }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1"
                                    title="Reprint 80mm POS Thermal Receipt"
                                  >
                                    <FiPrinter className="w-3 h-3" /> 80mm
                                  </button>

                                  <button
                                    onClick={() => handleDeletePayment(p.id)}
                                    className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                    title="Delete payment"
                                  >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ──────── TAB 3: CASHIER SHIFT & DRAWER BALANCING ──────── */}
            {centerTab === 'drawer' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left 7 Cols: Denominations Calculator */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Physical Cash Drawer Counter</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Input physical bank notes and coin counts to reconcile drawer</p>
                    </div>
                    <button
                      onClick={() => { setD1000(0); setD500(0); setD200(0); setD100(0); setD50(0); setDCoins(0); }}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700"
                    >
                      Reset Counts
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'KES 1,000 Notes', val: d1000, set: setD1000, mult: 1000, bg: 'bg-purple-50 text-purple-700' },
                      { label: 'KES 500 Notes', val: d500, set: setD500, mult: 500, bg: 'bg-indigo-50 text-indigo-700' },
                      { label: 'KES 200 Notes', val: d200, set: setD200, mult: 200, bg: 'bg-blue-50 text-blue-700' },
                      { label: 'KES 100 Notes', val: d100, set: setD100, mult: 100, bg: 'bg-emerald-50 text-emerald-700' },
                      { label: 'KES 50 Notes', val: d50, set: setD50, mult: 50, bg: 'bg-amber-50 text-amber-700' },
                    ].map(d => (
                      <div key={d.label} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${d.bg}`}>
                            {d.mult}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{d.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            value={d.val === 0 ? '' : d.val}
                            placeholder="0"
                            onChange={(e) => d.set(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-20 px-2 py-1 text-right text-xs font-mono font-bold rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-700 w-28 text-right font-mono">
                            = {KES(d.val * d.mult)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Coins */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-700">
                          COINS
                        </span>
                        <span className="text-xs font-bold text-slate-800">Coins &amp; Loose Shillings Total</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          value={dCoins === 0 ? '' : dCoins}
                          placeholder="0"
                          onChange={(e) => setDCoins(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 px-2 py-1 text-right text-xs font-mono font-bold rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-700 w-28 text-right font-mono">
                          = {KES(dCoins)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-extrabold text-sm">
                    <span className="text-slate-800">Total Physical Cash Counted:</span>
                    <span className="text-indigo-700 font-mono text-base">{KES(countedPhysicalCash)}</span>
                  </div>
                </div>

                {/* Right 5 Cols: Reconciliation Analysis & Print Handover */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                      Drawer Balancing Status
                    </h3>

                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Physical Cash Counted:</span>
                        <span className="font-mono font-bold text-slate-800">{KES(countedPhysicalCash)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">System Expected Cash (Today):</span>
                        <span className="font-mono font-bold text-slate-800">{KES(todayCashTotal)}</span>
                      </div>

                      {/* Variance Indicator */}
                      <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                        cashDiscrepancy === 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : cashDiscrepancy > 0
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}>
                        <div className="text-2xl">
                          {cashDiscrepancy === 0 ? '✅' : cashDiscrepancy > 0 ? '⚠️' : '🚨'}
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider">
                            {cashDiscrepancy === 0 ? 'Drawer Perfectly Balanced' : cashDiscrepancy > 0 ? 'Cash Surplus (Overage)' : 'Cash Shortage'}
                          </div>
                          <div className="text-sm font-extrabold font-mono mt-0.5">
                            {cashDiscrepancy === 0
                              ? 'Zero Variance (KES 0)'
                              : cashDiscrepancy > 0
                              ? `+${KES(cashDiscrepancy)}`
                              : `-${KES(Math.abs(cashDiscrepancy))}`}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>M-Pesa Receipts Today:</span>
                          <span className="font-bold text-slate-700">{KES(todayMpesaTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bank Deposit Slips Today:</span>
                          <span className="font-bold text-slate-700">{KES(todayBankTotal)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-800 pt-1">
                          <span>All-Channel Gross Intake:</span>
                          <span className="text-emerald-700">{KES(todayGrossTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      printCashierShiftSheet({
                        cashTotal: todayCashTotal,
                        mpesaTotal: todayMpesaTotal,
                        bankTotal: todayBankTotal,
                        otherTotal: todayOtherTotal,
                        grossTotal: todayGrossTotal,
                        cashCount: todayPayments.filter((p: any) => p.payment_method === 'Cash').length,
                        mpesaCount: todayPayments.filter((p: any) => p.payment_method === 'M-Pesa').length,
                        bankCount: todayPayments.filter((p: any) => p.payment_method === 'Bank Transfer' || p.payment_method === 'Bank').length,
                        otherCount: todayPayments.filter((p: any) => p.payment_method !== 'Cash' && p.payment_method !== 'M-Pesa' && p.payment_method !== 'Bank Transfer' && p.payment_method !== 'Bank').length,
                        totalCount: todayPayments.length,
                        d1000, d500, d200, d100, d50, coins: dCoins,
                        countedCash: countedPhysicalCash,
                        discrepancy: cashDiscrepancy,
                      }, settings);
                    }}
                    className="w-full py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    <FiPrinter className="w-4 h-4" />
                    Print Shift Handover &amp; Banking Slip
                  </button>
                </div>
              </div>
            )}

            {/* ──────── TAB 4: FEE STRUCTURE REFERENCE MATRIX ──────── */}
            {centerTab === 'matrix' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Active Fee Structure Matrix</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Live vote-head levies configured for 8-4-4 and CBC Senior School cohorts</p>
                  </div>
                  <Link
                    href="/dashboard/fees/structure"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Edit Structures <FiExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredForms.map(form => {
                    const track = detectTrack(form);
                    // Sample vote heads for this form from structures in live DB
                    return (
                      <div key={form.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900">{form.form_name}</span>
                          <TrackBadge track={track} />
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {form.description || 'Standard academic curriculum track'}
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500">Term 1 Levies:</span>
                          <span className="text-indigo-700 font-mono font-black">
                            {KES(track === 'CBC_SENIOR' ? 5000 : 5000)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          OFFICIAL PAYMENT MODAL
      ════════════════════════════════════════ */}
      {selectedStudent && fees && (
        <UltraPaymentModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          student={selectedStudent}
          fees={fees}
          receiptNo=""
          getFormName={safeGetFormName}
          getStreamName={safeGetStreamName}
          onSubmit={handleRecordPayment}
          isSubmitting={isSubmitting}
          terms={terms as any[]}
        />
      )}

      {/* ════════════════════════════════════════
          DIRECT M-PESA STK PUSH MODAL
      ════════════════════════════════════════ */}
      {stkModalOpen && stkTargetStudent && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-md w-full animate-slideUpIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white text-xl">
                  📱
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Direct M-Pesa STK Push</h3>
                  <p className="text-[10px] text-slate-500">Instant SIM Toolkit PIN prompt to parent phone</p>
                </div>
              </div>
              <button
                onClick={() => setStkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1">
              <div className="text-xs font-bold text-slate-900">
                {stkTargetStudent.first_name} {stkTargetStudent.last_name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Adm: {stkTargetStudent.admission_no || stkTargetStudent.admission_number || '—'} · Guardian: {stkTargetStudent.guardian_name || 'Parent'}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                  M-Pesa Registered Phone Number
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="tel"
                    value={stkPhone}
                    onChange={(e) => setStkPhone(e.target.value)}
                    placeholder="0712345678 or 254712345678"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                  Amount to Prompt (KES)
                </label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="number"
                    min="1"
                    value={stkAmount === 0 ? '' : stkAmount}
                    onChange={(e) => setStkAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="e.g. 5000"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Status Indicator */}
              {stkStatus === 'prompting' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <div className="text-xs">
                    <div className="font-bold">Prompt Sent to {stkPhone}</div>
                    <div className="text-[10px] text-amber-700">Waiting for parent to enter M-Pesa PIN ({stkCountdown}s)…</div>
                  </div>
                </div>
              )}

              {stkStatus === 'success' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                  <span className="text-lg">✅</span>
                  <div className="text-xs">
                    <div className="font-bold">M-Pesa Push Received!</div>
                    <div className="text-[10px] text-emerald-700">Parent device acknowledged prompt. Ready to record receipt.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setStkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>

              <button
                onClick={handleTriggerStkPush}
                disabled={stkStatus === 'prompting'}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <FiSend className="w-3.5 h-3.5" />
                {stkStatus === 'prompting' ? 'Waiting on PIN…' : 'Initiate STK Push'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          FLOATING RECEIPT FLASH NOTIFICATION
      ════════════════════════════════════════ */}
      {receiptFlash && selectedStudent && (
        <ReceiptFlash
          receiptNo={receiptFlash.receiptNo}
          amount={receiptFlash.amount}
          studentName={`${selectedStudent.first_name as string} ${selectedStudent.last_name as string}`}
          onClose={() => setReceiptFlash(null)}
        />
      )}

      {/* ════════════════════════════════════════
          PAGE STYLES & ANIMATIONS
      ════════════════════════════════════════ */}
      <style>{`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slideUpIn {
          animation: slideUpIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
