import { useEffect, useCallback, RefObject } from 'react';

interface UseClickOutsideOptions {
  enabled: boolean;
  onClickOutside: () => void;
  selector?: string; // CSS selector to exclude from click outside detection
  ref?: RefObject<HTMLElement>; // Ref to the container element
}

/**
 * Custom hook to handle click outside events with proper cleanup
 * Consolidates multiple document event listeners to prevent memory leaks
 */
export function useClickOutside({ enabled, onClickOutside, selector, ref }: UseClickOutsideOptions) {
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as Element;
    
    // If a ref is provided, check if the click is inside the ref element
    if (ref?.current && ref.current.contains(target)) {
      return;
    }
    
    // If a selector is provided, check if the click is inside the excluded element
    if (selector && target.closest(selector)) {
      return;
    }
    
    onClickOutside();
  }, [onClickOutside, selector, ref]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [enabled, handleClick]);
}