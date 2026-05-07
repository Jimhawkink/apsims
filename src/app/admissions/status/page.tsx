'use client';

import { useState } from 'react';
import { FiSearch, FiFileText, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApplicationStatus {
  reference_number: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Waitlisted';
  submitted_at: string;
  review_notes: string | null;
  student_name: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRAD = 'linear-gradient(135deg, #0f766e, #0891b2)';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  Submitted: {
    color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
    icon: <FiClock size={16} />, label: 'Submitted',
  },
  'Under Review': {
    color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200',
    icon: <FiAlertCircle size={16} />, label: 'Under Review',
  },
  Approved: {
    color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200',
    icon: <FiCheckCircle size={16} />, label: 'Approved',
  },
  Rejected: {
    color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200',
    icon: <FiXCircle size={16} />, label: 'Rejected',
  },
  Waitlisted: {
    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',
    icon: <FiAlertCircle size={16} />, label: 'Waitlisted',
  },
};

// ─── Application Status Card ──────────────────────────────────────────────────

function ApplicationStatusCard({ application }: { application: ApplicationStatus }) {
  const cfg = STATUS_CONFIG[application.status] || STATUS_CONFIG['Submitted'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Status banner */}
      <div className={`px-6 py-4 border-b ${cfg.bg} ${cfg.border} border`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 font-bold text-lg ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            {application.status}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Reference */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reference Number</span>
          <span className="font-black text-gray-800 tracking-widest text-sm">{application.reference_number}</span>
        </div>

        {/* Student name */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</span>
          <span className="font-semibold text-gray-700 text-sm">{application.student_name}</span>
        </div>

        {/* Submitted date */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted</span>
          <span className="text-sm text-gray-600">{fmtDate(application.submitted_at)}</span>
        </div>

        {/* Review notes */}
        {application.review_notes && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Review Notes</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">
              {application.review_notes}
            </p>
          </div>
        )}

        {/* Status-specific messages */}
        {application.status === 'Approved' && (
          <div className="pt-3 border-t border-green-100 bg-green-50 rounded-xl p-3">
            <p className="text-sm text-green-700 font-semibold">
              🎉 Congratulations! Your application has been approved. Please contact the school for reporting instructions.
            </p>
          </div>
        )}
        {application.status === 'Rejected' && (
          <div className="pt-3 border-t border-red-100 bg-red-50 rounded-xl p-3">
            <p className="text-sm text-red-700">
              We regret to inform you that your application was not successful. Please contact the school for more information.
            </p>
          </div>
        )}
        {application.status === 'Waitlisted' && (
          <div className="pt-3 border-t border-orange-100 bg-orange-50 rounded-xl p-3">
            <p className="text-sm text-orange-700">
              Your application is on the waitlist. We will contact you if a place becomes available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdmissionsStatusPage() {
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<ApplicationStatus | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = ref.trim().toUpperCase();
    if (!trimmed) {
      toast.error('Please enter your reference number');
      return;
    }

    setLoading(true);
    setApplication(null);
    setNotFound(false);

    try {
      const res = await fetch(`/api/admissions/status?ref=${encodeURIComponent(trimmed)}`);
      const result = await res.json();

      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error(result.error || 'Failed to fetch status');

      setApplication(result.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─── */}
      <div className="text-white py-10 px-4" style={{ background: GRAD }}>
        <div className="max-w-lg mx-auto text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiSearch size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black mb-2">Application Status Tracker</h1>
          <p className="text-teal-100 text-sm">
            Enter your reference number to check the status of your admission application.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* ─── Search Form ─── */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Reference Number
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={ref}
              onChange={e => setRef(e.target.value.toUpperCase())}
              placeholder="e.g. ADM-2026-000001"
              className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-white font-bold rounded-xl flex items-center gap-2 text-sm disabled:opacity-60"
              style={{ background: GRAD }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiSearch size={14} />
              )}
              Search
            </button>
          </div>
        </form>

        {/* ─── Not Found ─── */}
        {notFound && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-bold text-gray-700 mb-1">Application Not Found</h3>
            <p className="text-sm text-gray-400">
              No application found with reference number <strong>{ref}</strong>.
              Please check the reference number and try again.
            </p>
            <a href="/admissions" className="mt-4 inline-block text-sm text-teal-600 font-semibold hover:underline">
              Submit a new application →
            </a>
          </div>
        )}

        {/* ─── Application Status Card ─── */}
        {application && <ApplicationStatusCard application={application} />}

        {/* ─── Empty state ─── */}
        {!application && !notFound && !loading && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-gray-400">Enter your reference number above to check your application status.</p>
            <a href="/admissions" className="mt-3 inline-block text-sm text-teal-600 font-semibold hover:underline">
              Haven't applied yet? Apply here →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
