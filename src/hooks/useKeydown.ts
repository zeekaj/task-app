import { useEffect, useCallback } from 'react';

interface UseKeydownOptions {
  enabled: boolean;
  key: string;
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Custom hook to handle keydown events with proper cleanup
 * Consolidates document keyboard event listeners to prevent memory leaks
 */
export function useKeydown({ enabled, key, onKeyDown }: UseKeydownOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === key) {
      onKeyDown(e);
    }
  }, [key, onKeyDown]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}