import { useEffect, useCallback } from 'react';

interface UseClickOutsideOptions {
  enabled: boolean;
  onClickOutside: () => void;
  selector?: string; // CSS selector to exclude from click outside detection
}

/**
 * Custom hook to handle click outside events with proper cleanup
 * Consolidates multiple document event listeners to prevent memory leaks
 */
export function useClickOutside({ enabled, onClickOutside, selector }: UseClickOutsideOptions) {
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as Element;
    
    // If a selector is provided, check if the click is inside the excluded element
    if (selector && target.closest(selector)) {
      return;
    }
    
    onClickOutside();
  }, [onClickOutside, selector]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [enabled, handleClick]);
}