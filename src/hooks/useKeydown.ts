import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void | Promise<void>;

type KeyBindings = {
  [key: string]: KeyHandler;
};

/**
 * Custom hook to handle keydown events with proper cleanup
 * Consolidates document keyboard event listeners to prevent memory leaks
 */
interface UseKeydownOptions {
  /** Ignore events originating within elements matching this selector (or any in array) */
  ignoreSelector?: string | string[];
}

export function useKeydown(bindings: KeyBindings, enabled: boolean = true, options?: UseKeydownOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Respect ignore selector(s) to allow nested widgets (like dropdown search inputs) to handle Escape
    const target = e.target as Element | null;
    const selectors = options?.ignoreSelector
      ? (Array.isArray(options.ignoreSelector) ? options.ignoreSelector : [options.ignoreSelector])
      : [];
    if (target && selectors.length > 0) {
      for (const sel of selectors) {
        if (sel && target.closest(sel)) {
          return; // don't handle globally
        }
      }
    }
    // For each key binding
    Object.entries(bindings).forEach(([key, handler]) => {
      const isEnterBinding = key === 'Enter' && e.key === 'Enter';
      const isEscapeBinding = key === 'Escape' && e.key === 'Escape';
      const isCtrlEnterBinding = key === 'Enter' && e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.shiftKey;
      
      if (isCtrlEnterBinding || isEscapeBinding || (isEnterBinding && !(e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      }
    });
  }, [bindings, options?.ignoreSelector]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, handleKeyDown]);
}