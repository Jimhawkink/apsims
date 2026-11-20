'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';

export default function AssetsUltraErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Ultra Assets Error Boundary Caught:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-6 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
          <FiAlertTriangle size={28} />
        </div>
        <h2 className="text-lg font-black text-slate-800 tracking-tight">
          Asset Management Diagnostic Interrupt
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          An issue occurred while compiling the asset registry. Your institutional database remains safe and unaffected.
        </p>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left mb-5">
          <p className="text-[10px] font-mono text-rose-600 break-words">
            {error.message || 'Unknown asset engine exception'}
          </p>
          {error.digest && (
            <p className="text-[9px] font-mono text-slate-400 mt-1">
              Digest: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FiRefreshCw size={13} /> Retry Asset Engine
          </button>
          <Link
            href="/dashboard/assets"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5"
          >
            <FiArrowLeft size={13} /> Return to Assets Desk
          </Link>
        </div>
      </div>
    </div>
  );
}
