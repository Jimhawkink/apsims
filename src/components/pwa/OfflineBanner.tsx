'use client';
import { useOffline } from '@/hooks/useOffline';
import { FiWifiOff, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

function formatDuration(ms: number | null): string {
  if (!ms) return '';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

export default function OfflineBanner() {
  const { isOffline, queueCount, timeSinceOffline, isSyncing } = useOffline();

  if (!isOffline) return null;

  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm font-medium z-40 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <FiWifiOff size={15} className="flex-shrink-0" />
        <span className="truncate">You are offline — changes will sync when reconnected</span>
        {timeSinceOffline && (
          <span className="text-amber-100 text-xs flex-shrink-0">({formatDuration(timeSinceOffline)} ago)</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {queueCount > 0 && (
          <span className="flex items-center gap-1 bg-amber-600 rounded-full px-2 py-0.5 text-xs whitespace-nowrap">
            <FiAlertCircle size={10} />
            {queueCount} pending
          </span>
        )}
        {isSyncing && (
          <span className="flex items-center gap-1 text-amber-100 text-xs whitespace-nowrap">
            <FiRefreshCw size={11} className="animate-spin" />
            Syncing
          </span>
        )}
      </div>
    </div>
  );
}
