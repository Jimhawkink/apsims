'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HRLeavePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/teachers/leave'); }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading Staff Leave Management…</p>
      </div>
    </div>
  );
}
