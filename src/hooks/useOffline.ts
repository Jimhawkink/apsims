'use client';
import { useState, useEffect, useCallback } from 'react';
import { processOfflineQueue, getQueueCount } from '@/lib/offline-sync';

interface UseOfflineReturn {
  isOffline: boolean;
  queueCount: number;
  timeSinceOffline: number | null; // milliseconds since went offline
  isSyncing: boolean;
  lastSyncResult: { processed: number; failed: number; remaining: number } | null;
}

export function useOffline(): UseOfflineReturn {
  const [isOffline, setIsOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [timeSinceOffline, setTimeSinceOffline] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ processed: number; failed: number; remaining: number } | null>(null);

  const refreshQueueCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setQueueCount(count);
    } catch { /* ignore */ }
  }, []);

  const handleOnline = useCallback(async () => {
    setIsOffline(false);
    setOfflineSince(null);
    setTimeSinceOffline(null);
    // Process the offline queue when back online
    setIsSyncing(true);
    try {
      const result = await processOfflineQueue();
      setLastSyncResult(result);
      await refreshQueueCount();
    } catch { /* ignore */ } finally {
      setIsSyncing(false);
    }
  }, [refreshQueueCount]);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setOfflineSince(Date.now());
  }, []);

  useEffect(() => {
    // Set initial state
    setIsOffline(!navigator.onLine);
    if (!navigator.onLine) setOfflineSince(Date.now());
    refreshQueueCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync completion from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'sync-complete') {
        refreshQueueCount();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [handleOnline, handleOffline, refreshQueueCount]);

  // Update timeSinceOffline every second when offline
  useEffect(() => {
    if (!offlineSince) { setTimeSinceOffline(null); return; }
    const interval = setInterval(() => {
      setTimeSinceOffline(Date.now() - offlineSince);
    }, 1000);
    return () => clearInterval(interval);
  }, [offlineSince]);

  // Refresh queue count every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshQueueCount, 30_000);
    return () => clearInterval(interval);
  }, [refreshQueueCount]);

  return { isOffline, queueCount, timeSinceOffline, isSyncing, lastSyncResult };
}
