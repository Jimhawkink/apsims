'use client';
import { useState, useEffect } from 'react';
import { FiRefreshCw, FiX, FiZap } from 'react-icons/fi';

export default function UpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const handleUpdateAvailable = (event: Event) => {
      const e = event as CustomEvent<{ worker?: ServiceWorker }>;
      setWaitingWorker(e.detail?.worker ?? null);
      setShowUpdate(true);
    };
    window.addEventListener('sw-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('sw-update-available', handleUpdateAvailable);
  }, []);

  const handleReload = () => {
    if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
      <div className="bg-indigo-600 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 pointer-events-auto">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <FiZap size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Update Available</p>
          <p className="text-xs text-indigo-200 leading-tight">Reload to get the latest version</p>
        </div>
        <button
          onClick={handleReload}
          className="flex items-center gap-1.5 bg-white text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0"
        >
          <FiRefreshCw size={11} />
          Reload Now
        </button>
        <button onClick={() => setShowUpdate(false)} className="text-indigo-200 hover:text-white flex-shrink-0">
          <FiX size={15} />
        </button>
      </div>
    </div>
  );
}
