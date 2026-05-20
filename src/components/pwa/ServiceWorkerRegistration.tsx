'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW installed, notify UI
              window.dispatchEvent(
                new CustomEvent('sw-update-available', { detail: { worker: newWorker } })
              );
            }
          });
        });

        // Store last online time
        window.addEventListener('online', () => {
          localStorage.setItem('apsims-last-online', String(Date.now()));
        });
        if (navigator.onLine) {
          localStorage.setItem('apsims-last-online', String(Date.now()));
        }
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    };

    registerSW();
  }, []);

  return null;
}
