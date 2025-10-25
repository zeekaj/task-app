// src/components/shared/Toast.tsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  show: (message: string, type?: ToastType, timeoutMs?: number) => void;
  success: (message: string, timeoutMs?: number) => void;
  error: (message: string, timeoutMs?: number) => void;
  info: (message: string, timeoutMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info', timeoutMs = 2600) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => remove(id), timeoutMs);
  }, [remove]);

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (m: string, t = 2400) => show(m, 'success', t),
    error: (m: string, t = 3200) => show(m, 'error', t),
    info: (m: string, t = 2600) => show(m, 'info', t),
  }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[9999] space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border backdrop-blur-sm text-sm transition-all 
                ${t.type === 'success' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200' : ''}
                ${t.type === 'error' ? 'bg-red-500/15 border-red-400/30 text-red-200' : ''}
                ${t.type === 'info' ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-200' : ''}
              `}
            >
              {t.type === 'success' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
              )}
              {t.type === 'error' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              )}
              {t.type === 'info' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18a9 9 0 110-18 9 9 0 010 18z"/></svg>
              )}
              <span>{t.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
