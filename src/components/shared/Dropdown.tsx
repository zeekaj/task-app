import React, { useState } from "react";

/**
 * Custom dropdown component for filter groups and menus.
 * Usage: <Dropdown label="..."> ... </Dropdown>
 */
export function Dropdown({ label, children }) {
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
        className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1 text-sm font-medium flex items-center gap-2 shadow hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <span className="ml-1">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-2 min-w-[160px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-2">
          {children}
        </div>
      )}
    </div>
  );
}
