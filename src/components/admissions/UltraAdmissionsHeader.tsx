'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiShare2,
  FiDownload,
  FiUpload,
  FiPrinter,
  FiRefreshCw,
  FiGlobe,
  FiShield,
  FiSparkles,
  FiSend,
} from 'react-icons/fi';

interface UltraAdmissionsHeaderProps {
  totalCount: number;
  newCount: number;
  loading: boolean;
  onRefresh: () => void;
  onExportExcel: () => void;
  onOpenImport: () => void;
  onPrintRegister: () => void;
  onOpenQRPoster: () => void;
}

export const ONLINE_APPLY_URL = 'https://apsims.vercel.app/admissions';
export const ONLINE_STATUS_URL = 'https://apsims.vercel.app/admissions/status';

export function UltraAdmissionsHeader({
  totalCount,
  newCount,
  loading,
  onRefresh,
  onExportExcel,
  onOpenImport,
  onPrintRegister,
  onOpenQRPoster,
}: UltraAdmissionsHeaderProps) {
  const [copiedApply, setCopiedApply] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);

  const handleCopyApply = async () => {
    try {
      await navigator.clipboard.writeText(ONLINE_APPLY_URL);
      setCopiedApply(true);
      toast.success('📋 Online application link copied to clipboard!');
      setTimeout(() => setCopiedApply(false), 2500);
    } catch {
      toast.error('Could not copy link to clipboard');
    }
  };

  const handleCopyStatus = async () => {
    try {
      await navigator.clipboard.writeText(ONLINE_STATUS_URL);
      setCopiedStatus(true);
      toast.success('🔍 Status tracker link copied to clipboard!');
      setTimeout(() => setCopiedStatus(false), 2500);
    } catch {
      toast.error('Could not copy link to clipboard');
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎓 *APSIMS ONLINE ADMISSIONS — 2026 INTAKE OPEN*\n\n` +
      `We are pleased to announce that online admissions for Form 1 to Form 4 (8-4-4) and CBC Senior School (Grade 10–12) are now officially OPEN.\n\n` +
      `👉 *Apply Online Directly:* ${ONLINE_APPLY_URL}\n` +
      `🔎 *Track Application Status:* ${ONLINE_STATUS_URL}\n\n` +
      `Ensure you have student KCPE results, birth certificate, and guardian details ready. Admission is on a merit and first-come basis.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* ── Main Executive Header Strip ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Left Title & Live Indicator */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-teal-500 text-white flex items-center justify-center text-xl shadow-md shadow-blue-500/20 flex-shrink-0">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                  Online Admissions Command Center
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Portal Active
                </span>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  2026 Intake
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>Enterprise Intake Dossiers</span>
                <span className="text-slate-300">•</span>
                <span>CBC &amp; 8-4-4 Verification</span>
                <span className="text-slate-300">•</span>
                <span>Automated Calling Letters &amp; Class Placements</span>
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition shadow-sm active:scale-95 disabled:opacity-50"
              title="Refresh applications"
            >
              <FiRefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              onClick={onOpenImport}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 transition shadow-sm active:scale-95"
              title="Import Applications from Excel or CSV"
            >
              <FiUpload size={14} />
              <span>Bulk Import</span>
            </button>

            <button
              onClick={onExportExcel}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 transition shadow-sm active:scale-95"
              title="Export Full Admissions Register to Styled Excel"
            >
              <FiDownload size={14} />
              <span>Export Excel</span>
            </button>

            <button
              onClick={onPrintRegister}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition shadow-sm active:scale-95"
              title="Print Official Admissions Register"
            >
              <FiPrinter size={14} />
              <span>Print Register</span>
            </button>

            <button
              onClick={onOpenQRPoster}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition shadow-md shadow-blue-500/20 active:scale-95"
              title="View & Print Admissions QR Poster"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
              </svg>
              <span>QR Poster</span>
            </button>
          </div>
        </div>

        {/* ── Online Admission Link & Sharing Dock ── */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Portal Direct Link Pill */}
          <div className="md:col-span-6 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 px-3">
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">
              <FiGlobe size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Direct Online Admission Portal</p>
              <p className="text-xs font-mono font-bold text-slate-800 truncate">{ONLINE_APPLY_URL}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyApply}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-sm ${
                  copiedApply
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
                title="Copy online admission link"
              >
                {copiedApply ? <FiCheck size={12} /> : <FiCopy size={12} />}
                <span>{copiedApply ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={ONLINE_APPLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition shadow-sm"
                title="Open live admission form"
              >
                <FiExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Status Tracker Link Pill */}
          <div className="md:col-span-4 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 px-3">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs flex-shrink-0">
              🔍
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Applicant Status Tracking Portal</p>
              <p className="text-xs font-mono font-bold text-slate-800 truncate">{ONLINE_STATUS_URL}</p>
            </div>
            <button
              onClick={handleCopyStatus}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition shadow-sm ${
                copiedStatus
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Copy status tracking link"
            >
              {copiedStatus ? <FiCheck size={12} /> : <FiCopy size={12} />}
              <span>{copiedStatus ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* WhatsApp Outreach Button */}
          <div className="md:col-span-2 flex items-center justify-end">
            <button
              onClick={handleShareWhatsApp}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm active:scale-95"
              title="Share admissions link via WhatsApp"
            >
              <FiShare2 size={13} />
              <span>WhatsApp Invite</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
