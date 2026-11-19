'use client';

import React, { useState } from 'react';
import {
  FiPrinter,
  FiX,
  FiCopy,
  FiCheck,
  FiShare2,
  FiExternalLink,
  FiCheckCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { ONLINE_APPLY_URL, ONLINE_STATUS_URL } from './UltraAdmissionsHeader';

interface UltraAdmissionsPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
}

export function UltraAdmissionsPosterModal({
  isOpen,
  onClose,
  schoolName = 'APSIMS HIGH SCHOOL & SENIOR ACADEMY',
}: UltraAdmissionsPosterModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    ONLINE_APPLY_URL
  )}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ONLINE_APPLY_URL);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl flex flex-col items-center gap-3 my-4">
        
        {/* Floating Actions (Hidden in print) */}
        <div className="print:hidden w-full flex items-center justify-between bg-white border border-slate-200 shadow-xl rounded-2xl p-3 px-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-800">
              Admissions Flyer &amp; QR Poster
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <FiPrinter size={13} />
              <span>Print Poster</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* ── High-Impact Printable Poster ── */}
        <div
          id="printable-admissions-poster"
          className="w-full bg-gradient-to-b from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:p-6 print:border-2 print:border-black print:rounded-none"
        >
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] print:hidden" />

          {/* Top Pill */}
          <div className="text-center relative z-10 mb-4">
            <span className="inline-block px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-amber-400 text-slate-900 print:border print:border-black">
              ★ OFFICIAL ONLINE ADMISSIONS OPEN ★
            </span>
          </div>

          {/* School Name & Header */}
          <div className="text-center relative z-10 mb-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight print:text-black" style={{ fontFamily: 'Outfit,sans-serif' }}>
              {schoolName}
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 font-medium mt-1 print:text-slate-700">
              Center of Academic Distinction, Leadership &amp; Character Development
            </p>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 print:border-black print:text-black">
              <span className="text-xs font-mono font-bold">2026 ACADEMIC YEAR INTAKE</span>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="relative z-10 bg-white text-slate-900 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center max-w-sm mx-auto border-4 border-amber-400 print:border-2 print:border-black">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
              SCAN WITH ANY PHONE CAMERA TO APPLY
            </p>
            <div className="w-48 h-48 bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt="Admissions QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs font-mono font-black text-blue-700 mt-3 break-all">
              {ONLINE_APPLY_URL}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Instant mobile application in under 3 minutes
            </p>
          </div>

          {/* Intake Scope & Curriculums */}
          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 print:border print:border-black print:text-black">
              <p className="text-xs font-black text-amber-300 print:text-black">🇰🇪 CBC Senior School</p>
              <p className="text-[11px] text-slate-200 print:text-slate-700 mt-0.5">Grades 10, 11 &amp; 12 Pathways: STEM, Arts &amp; Sports Science, Social Sciences.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 print:border print:border-black print:text-black">
              <p className="text-xs font-black text-amber-300 print:text-black">📘 8-4-4 Secondary</p>
              <p className="text-[11px] text-slate-200 print:text-slate-700 mt-0.5">Forms 1, 2, 3 &amp; 4. Full boarding and day-scholar vacancies available.</p>
            </div>
          </div>

          {/* Footer Contacts */}
          <div className="relative z-10 mt-6 pt-4 border-t border-white/20 text-center text-[10px] text-blue-200 print:text-black print:border-black">
            <p className="font-bold">For Admissions Inquiries: Tel: 0712 345 075 / 0722 000 111 · Email: admissions@apsims.edu.ke</p>
            <p className="font-mono text-slate-400 mt-0.5">Track submitted applications: {ONLINE_STATUS_URL}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
