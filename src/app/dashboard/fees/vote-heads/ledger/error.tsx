'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';

export default function VoteHeadLedgerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Vote Head Ledger Exception caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
        <FiAlertTriangle size={28} />
      </div>

      <h2 className="text-lg font-black text-slate-900 tracking-tight">
        Vote Head Ledger Error
      </h2>

      <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
        {error.message || 'An unexpected client error occurred while loading the vote head treasury ledger.'}
      </p>

      <div className="flex items-center gap-2.5 mt-5">
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition cursor-pointer"
        >
          <FiRefreshCw size={13} />
          <span>Reload Ledger</span>
        </button>

        <Link
          href="/dashboard/fees/vote-heads"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs flex items-center gap-1.5 transition"
        >
          <FiArrowLeft size={13} />
          <span>Vote Heads Studio</span>
        </Link>
      </div>
    </div>
  );
}
