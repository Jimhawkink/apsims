'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiRefreshCw, FiArrowLeft, FiHome } from 'react-icons/fi';

export default function FeesErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fees Studio Error Boundary Caught:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm">
          <FiAlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wider">
            Client Exception Intercepted
          </span>
          <h2 className="text-base font-extrabold text-slate-900 mt-2">
            Fees Studio Encountered an Issue
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            {error?.message || 'A transient client-side rendering error occurred while loading financial data.'}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            <span>Reload Component</span>
          </button>

          <Link
            href="/dashboard/fees"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FiArrowLeft className="w-3.5 h-3.5" />
            <span>Fees Hub</span>
          </Link>
        </div>

        <div className="text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-3">
          ST. CATHERINE GIRL'S SCHOOL TEGAT · APSIMS Financial Suite
        </div>
      </div>
    </div>
  );
}
