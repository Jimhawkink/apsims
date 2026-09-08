'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BudgetRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/budget');
  }, [router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 40 }}>📊</div>
      <p style={{ fontWeight: 700, color: '#374151' }}>Redirecting to Budget Module…</p>
    </div>
  );
}
