'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HRAppraisalPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/teachers/appraisal'); }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading Staff Appraisal…</p>
      </div>
    </div>
  );
}
