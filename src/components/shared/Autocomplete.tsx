// src/components/shared/Autocomplete.tsx
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AutocompleteOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface AutocompleteProps {
  value: string | null;
  options: AutocompleteOption[];
  onChange: (value: string | null) => void;
  onCreateNew?: (prefillName?: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  createNewLabel?: string;
  autoFocus?: boolean;
}

export function Autocomplete({
  value,
  options,
  onChange,
  onCreateNew,
  placeholder = 'Search...',
  label,
  required = false,
  createNewLabel = 'Add New',
  autoFocus = false,
}: AutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update input value when the selected value changes (but only when dropdown is closed)
  useEffect(() => {
    if (!isOpen) {
      if (value) {
        const selected = options.find(opt => opt.id === value);
        setInputValue(selected?.label || '');
      } else {
        setInputValue('');
      }
    }
  }, [value, options, isOpen]);

  // Filter options based on input
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(inputValue.toLowerCase()) ||
    opt.sublabel?.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  // Update position when opening
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Use setTimeout to avoid immediate closure on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);
    
    // If user clears the input, clear the selection
    if (!newValue) {
      onChange(null);
    }
  };

  const handleOptionClick = (option: AutocompleteOption) => {
    onChange(option.id);
    setInputValue(option.label);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    updateDropdownPosition();
    // Select all text so user can immediately type to replace
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      } else if (e.key === 'Enter' && inputValue.trim() && onCreateNew) {
        // If Enter is pressed when dropdown is closed and there's text, open modal with prefill
        e.preventDefault();
        onCreateNew(inputValue.trim());
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 + (onCreateNew ? 1 : 0) ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex < filteredOptions.length) {
          // Select the highlighted existing option
          handleOptionClick(filteredOptions[highlightedIndex]);
        } else if (onCreateNew && highlightedIndex === filteredOptions.length) {
          // "Add New" button is highlighted
          setIsOpen(false);
          onCreateNew(inputValue.trim() || undefined);
        } else if (onCreateNew && filteredOptions.length === 0 && inputValue.trim()) {
          // No matches found but there's text - create new with prefill
          setIsOpen(false);
          onCreateNew(inputValue.trim());
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        // Restore the current selection
        if (value) {
          const selected = options.find(opt => opt.id === value);
          setInputValue(selected?.label || '');
        }
        break;
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
        autoFocus={autoFocus}
        autoComplete="off"
      />

      {isOpen && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 99999,
          }}
          className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
        >
          {filteredOptions.length === 0 && !onCreateNew ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              No results found
            </div>
          ) : (
            <>
              {filteredOptions.map((option, index) => (
                <div
                  key={option.id}
                  onClick={() => handleOptionClick(option)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    highlightedIndex === index
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-white hover:bg-white/5'
                  }`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.sublabel && (
                    <div className="text-xs text-gray-400">{option.sublabel}</div>
                  )}
                </div>
              ))}
              {onCreateNew && (
                <div
                  onClick={() => {
                    setIsOpen(false);
                    onCreateNew(inputValue.trim() || undefined);
                  }}
                  className={`px-3 py-2 cursor-pointer border-t border-white/10 flex items-center gap-2 transition-colors ${
                    highlightedIndex === filteredOptions.length
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-cyan-400 hover:bg-white/5'
                  }`}
                  onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {createNewLabel}
                </div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
