// src/components/shared/FloatingDropdown.tsx
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface FloatingDropdownProps {
  /** The trigger button/element */
  trigger: ReactNode;
  /** Dropdown menu content */
  children: ReactNode;
  /** Whether the dropdown is open (controlled) */
  open?: boolean;
  /** Callback when open state changes (controlled) */
  onOpenChange?: (open: boolean) => void;
  /** Additional CSS classes for the trigger container */
  triggerClassName?: string;
  /** Additional CSS classes for the dropdown menu */
  menuClassName?: string;
  /** Custom width calculation function (default: button width + 32px) */
  calculateWidth?: (buttonRect: DOMRect) => number;
  /** Vertical offset from trigger (default: 6px) */
  offsetY?: number;
  /** Horizontal alignment relative to trigger (default: 'left') */
  align?: 'left' | 'center' | 'right';
  /** Clamp horizontally within viewport (default: true) */
  clamp?: boolean;
}

/**
 * FloatingDropdown - A reusable dropdown that renders with fixed positioning
 * to escape overflow clipping. Handles outside-click detection and position
 * calculation automatically.
 * 
 * Can be used in controlled or uncontrolled mode.
 */
export function FloatingDropdown({
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
  triggerClassName = '',
  menuClassName = '',
  calculateWidth,
  offsetY = 6,
  align = 'left',
  clamp = true,
}: FloatingDropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width: number } | null>(null);
  
  // Use controlled or uncontrolled state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (open: boolean) => {
    if (controlledOpen !== undefined) {
      onOpenChange?.(open);
    } else {
      setInternalOpen(open);
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    // Use mousedown capture so modal-level stopPropagation doesn't block outside detection
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) {
        setOpen(false);
      }
    };

    // Defer attaching to avoid closing from the opening click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handlePointerDown, true);
    }, 50);

    // Recompute position on resize/scroll
    const recompute = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      const width = calculateWidth
        ? calculateWidth(r)
        : Math.max(220, Math.min(320, r.width + 32));
      let left = r.left;
      if (align === 'center') left = r.left + (r.width / 2) - (width / 2);
      else if (align === 'right') left = r.right - width;
      if (clamp) {
        const margin = 8;
        if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
        if (left < margin) left = margin;
      }
      setMenuPos({ left, top: r.bottom + offsetY, width });
    };
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown, true);
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [isOpen, calculateWidth, offsetY, align, clamp]);

  // Compute dropdown position when opening
  useEffect(() => {
    if (!isOpen) return;
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const width = calculateWidth
      ? calculateWidth(r)
      : Math.max(220, Math.min(320, r.width + 32));
    let left = r.left;
    if (align === 'center') left = r.left + (r.width / 2) - (width / 2);
    else if (align === 'right') left = r.right - width;
    if (clamp) {
      const margin = 8;
      if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
      if (left < margin) left = margin;
    }
    setMenuPos({ left, top: r.bottom + offsetY, width });
  }, [isOpen, calculateWidth, offsetY, align, clamp]);
  
  return (
    <>
      {/* Trigger container */}
      <div ref={triggerRef} className={triggerClassName}>
        <div onClick={() => setOpen(!isOpen)}>
          {trigger}
        </div>
      </div>
      
      {/* Floating menu */}
      {isOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          className={`fixed z-[9999] max-h-64 overflow-y-auto bg-[rgba(20,20,30,0.98)] backdrop-blur-md border border-white/10 rounded-lg shadow-xl shadow-black/50 ${menuClassName}`}
          style={{ left: menuPos.left, top: menuPos.top, width: menuPos.width }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
