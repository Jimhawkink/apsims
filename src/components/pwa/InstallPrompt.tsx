'use client';
import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { FiDownload, FiX, FiSmartphone } from 'react-icons/fi';

export default function InstallPrompt() {
  const { canInstall, install } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (canInstall) setVisible(true);
    const handleDismissed = () => setVisible(false);
    window.addEventListener('pwa-dismissed', handleDismissed);
    return () => window.removeEventListener('pwa-dismissed', handleDismissed);
  }, [canInstall]);

  if (!visible || !canInstall) return null;

  const handleDismiss = () => {
    localStorage.setItem('pwa-dismissed-at', String(Date.now()));
    setVisible(false);
    window.dispatchEvent(new Event('pwa-dismissed'));
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <FiSmartphone className="text-white" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">Install APSIMS App</p>
          <p className="text-xs text-gray-500 mt-0.5">Get faster access and full offline support</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FiDownload size={12} />
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
          <FiX size={16} />
        </button>
      </div>
    </div>
  );
}
