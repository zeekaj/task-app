// src/components/ui/SearchableSelect.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { FloatingDropdown } from '../shared/FloatingDropdown';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onCreateNew?: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  onCreateNew,
  label,
  placeholder = 'Select or type to search...',
  className = '',
  allowCreate = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const showCreateOption = allowCreate && searchTerm && !options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase());

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleCreate = () => {
    if (showCreateOption && onCreateNew) {
      onCreateNew(searchTerm);
      onChange(searchTerm);
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{label}</label>}
      <FloatingDropdown
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setSearchTerm('');
        }}
        align="left"
        offsetY={4}
        trigger={
          <button
            type="button"
            onMouseDown={(e) => {
              // Open as early as possible to allow immediate typing
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(true);
            }}
            onClick={(e) => {
              // Prevent parent FloatingDropdown trigger from toggling state closed
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              // Optional: support type-to-open and seed first character
              const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
              if (isPrintable) {
                if (!isOpen) setIsOpen(true);
                setSearchTerm((prev) => (prev ? prev + e.key : e.key));
              }
            }}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-left flex items-center justify-between"
          >
            <span className={value ? 'text-gray-200' : 'text-gray-500'}>{value || placeholder}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        }
      >
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[200px] max-w-[300px]">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-700">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type to search..."
              autoFocus={isOpen}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  // Prevent modal-level Escape handler; just close this dropdown
                  e.stopPropagation();
                  setIsOpen(false);
                }
              }}
              className="searchable-select-input w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
            />
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    option === value
                      ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {option}
                </button>
              ))
            ) : !showCreateOption ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No matches found
              </div>
            ) : null}

            {/* Create New Option */}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreate}
                className="w-full px-4 py-2.5 text-left text-sm text-cyan-400 hover:bg-cyan-500/10 transition-colors border-t border-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create &quot;{searchTerm}&quot;</span>
              </button>
            )}
          </div>
        </div>
      </FloatingDropdown>
    </div>
  );
}
