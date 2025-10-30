import { useState } from "react";
import type { ReactNode } from "react";

/**
 * Custom dropdown component for filter groups and menus.
 * Usage: <Dropdown label="..."> ... </Dropdown>
 */
interface DropdownProps {
  label: string;
  children: ReactNode;
}

export function Dropdown({ label, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  // Close dropdown only when focus leaves the whole dropdown area
  return (
    <div
      className="relative inline-block"
      tabIndex={0}
      onBlur={(e) => {
        // Only close if focus moves outside the dropdown, not to a child
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="bg-glass/70 border border-brand-cyan/40 rounded-xl px-4 py-1 text-sm font-medium flex items-center gap-2 shadow-lg hover:bg-brand-cyan/10 focus:outline-none focus:ring-2 focus:ring-brand-cyan/60 transition-colors duration-150"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <span className="ml-1 text-brand-cyan">▾</span>
      </button>
      {open && (
        <div className="fixed z-[9999] mt-2 min-w-[180px] bg-gray-800/40 border border-brand-cyan/50 rounded-2xl shadow-xl py-2 backdrop-blur-5xl">
          {children}
        </div>
      )}
    </div>
  );
}
