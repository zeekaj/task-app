import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void | Promise<void>;

type KeyBindings = {
  [key: string]: KeyHandler;
};

/**
 * Custom hook to handle keydown events with proper cleanup
 * Consolidates document keyboard event listeners to prevent memory leaks
 */
export function useKeydown(bindings: KeyBindings, enabled: boolean = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
  }, [bindings]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, handleKeyDown]);
}