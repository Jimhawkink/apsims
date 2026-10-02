'use client';
import { useEffect } from 'react';

export default function PWAInstaller() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (reg) => console.log('APSIMS SW registered:', reg.scope),
          (err) => console.log('SW registration failed:', err)
        );
      });
    }
  }, []);
  return null;
}
