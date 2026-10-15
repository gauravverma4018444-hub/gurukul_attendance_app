import { useEffect, useCallback } from 'react';

const EVENT = 'app-refresh';

// Call this AFTER any create/update/delete operation
export const triggerRefresh = (scope = 'all') => {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { scope, ts: Date.now() } }));
};

// Use this hook in any component that displays data
export const useAutoRefresh = (callback, scopes = ['all']) => {
  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    const handler = (e) => {
      const s = e.detail?.scope || 'all';
      if (scopes.includes(s) || scopes.includes('all') || s === 'all') {
        stableCallback();
      }
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [stableCallback, JSON.stringify(scopes)]);
};