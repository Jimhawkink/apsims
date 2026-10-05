'use client';
import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
    isOnline: boolean;
    wasOffline: boolean;          // came back online after being offline
    offlineSince: Date | null;    // when we went offline
    clearWasOffline: () => void;
}

export function useNetworkStatus(): NetworkStatus {
    const [isOnline, setIsOnline] = useState(true);
    const [wasOffline, setWasOffline] = useState(false);
    const [offlineSince, setOfflineSince] = useState<Date | null>(null);

    const clearWasOffline = useCallback(() => setWasOffline(false), []);

    useEffect(() => {
        // Initialise from browser
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

        const handleOnline = () => {
            setIsOnline(true);
            setWasOffline(true);    // triggers sync overlay
            setOfflineSince(null);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setOfflineSince(new Date());
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline, wasOffline, offlineSince, clearWasOffline };
}
