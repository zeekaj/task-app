// src/components/shared/Modal.tsx
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useKeydown } from '../../hooks/useKeydown';

interface ModalProps {
  open: boolean;
  title?: string | ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string; // e.g., 'max-w-lg'
  noFrame?: boolean; // when true, don't render modal background/border so children provide their own frame
}

export function Modal({ open, title, onClose, children, footer, widthClass = 'max-w-lg', noFrame = false }: ModalProps) {
  // Ignore Escape when focused inside searchable dropdown inputs
  useKeydown({ Escape: onClose }, open, { ignoreSelector: '.searchable-select-input' });

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={
            noFrame
              ? `relative w-full ${widthClass} max-h-[90vh] flex flex-col`
              : `relative w-full ${widthClass} max-h-[90vh] bg-[rgba(20,20,30,0.95)] backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col`
          }
          onClick={(e) => e.stopPropagation()}
        >
        {title && (
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
            {typeof title === 'string' ? (
              <h3 className="text-white text-lg font-semibold flex-1 truncate">{title}</h3>
            ) : (
              // When a ReactNode is provided, render it directly to allow custom header layouts (e.g., with toggles)
              <div className="flex-1 min-w-0">{title}</div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-white/10 bg-white/5 rounded-b-2xl">
            {footer}
          </div>
        )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
