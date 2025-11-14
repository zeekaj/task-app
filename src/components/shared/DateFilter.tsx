import { useState, useEffect, useRef } from 'react';
import { computeRange, predefinedOptions } from '../../utils/dateRanges';
import type { DateRange } from '../../utils/dateRanges';

type Props = {
  value: DateRange | null;
  onChange: (r: DateRange | null) => void;
  label?: string;
};

export default function DateFilter({ value, onChange, label = 'Date' }: Props) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value?.start || '');
  const [customEnd, setCustomEnd] = useState(value?.end || '');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Keep internal inputs in sync when parent value changes
  useEffect(() => {
    setCustomStart(value?.start || '');
    setCustomEnd(value?.end || '');
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const applyPredefined = (key: string) => {
    const r = computeRange(key);
    if (r) onChange(r);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    onChange({ start: customStart, end: customEnd, label: 'Custom' });
    setOpen(false);
  };

  const clear = () => {
    setCustomStart('');
    setCustomEnd('');
    onChange(null);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg flex items-center gap-2"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Filter by ${label}`}
      >
        <span className="text-xs text-gray-300">{label}:</span>
        <span className="text-sm text-white">{value ? value.label || `${value.start} → ${value.end}` : 'Any'}</span>
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-[rgba(20,20,30,0.95)] backdrop-blur-sm border border-white/10 rounded-lg shadow-lg z-40 p-2">
          <div className="grid gap-1">
            {predefinedOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => applyPredefined(opt.key)}
                className="text-left px-3 py-2 text-sm hover:bg-white/5 rounded"
              >
                {opt.label}
              </button>
            ))}

            <div className="border-t border-white/5 pt-2" />

            <div className="px-2">
              <div className="text-xs text-gray-400 mb-1">Custom Range</div>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-2 py-1 mb-1 bg-transparent border border-white/10 rounded text-sm"
                aria-label="Custom start date"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-2 py-1 mb-2 bg-transparent border border-white/10 rounded text-sm"
                aria-label="Custom end date"
              />
              <div className="flex gap-2">
                <button onClick={applyCustom} disabled={!customStart || !customEnd} className="flex-1 px-3 py-1 text-sm bg-cyan-600 text-white rounded">Apply</button>
                <button onClick={clear} className="flex-1 px-3 py-1 text-sm bg-white/5 text-gray-300 rounded">Clear</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
