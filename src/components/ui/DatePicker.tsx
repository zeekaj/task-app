// src/components/ui/DatePicker.tsx
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DatePickerLib from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.css';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function DatePicker({ value, onChange, label, className = '' }: DatePickerProps) {
  // Convert YYYY-MM-DD string to Date object
  const dateValue = value ? new Date(value + 'T00:00:00') : null;
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const datePickerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Sync input value with prop value when not editing
  useEffect(() => {
    if (!isEditing && value) {
      setInputValue(value);
    }
  }, [value, isEditing]);

  // Click outside to close calendar
  useEffect(() => {
    if (!isCalendarOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node) &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  const handleChange = (date: Date | null) => {
    if (date) {
      // Convert Date to YYYY-MM-DD format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const newValue = `${year}-${month}-${day}`;
      onChange(newValue);
      setIsEditing(false); // Update the input value
      setIsCalendarOpen(false); // Close calendar
    }
  };

  const handleCalendarIconClick = () => {
    setIsCalendarOpen(true);
  };

  const parseDateInput = (input: string): string | null => {
    const cleaned = input.trim();
    
    // Try various formats
    const patterns = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,        // YYYY-MM-DD or YYYY-M-D
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,      // MM/DD/YYYY or M/D/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,      // MM/DD/YY or M/D/YY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,        // MM-DD-YYYY or M-D-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{2})$/,        // MM-DD-YY or M-D-YY
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = cleaned.match(patterns[i]);
      if (match) {
        let year: number, month: number, day: number;
        
        if (i === 0) {
          // YYYY-MM-DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          // MM/DD/YYYY or MM-DD-YYYY formats
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
          
          // Handle 2-digit years
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }
        }
        
        // Validate
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        
        // Check if date is valid
        const testDate = new Date(year, month - 1, day);
        if (testDate.getMonth() !== month - 1) return null; // Invalid date like Feb 30
        
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    // Only parse if user was typing
    if (isEditing) {
      const parsed = parseDateInput(inputValue);
      if (parsed) {
        onChange(parsed);
      } else if (inputValue.trim() === '') {
        onChange('');
      } else {
        // Reset to current value if invalid
        setInputValue(value);
      }
    }
    setIsEditing(false);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    // Select all text on focus for easy replacement
    e.target.select();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setInputValue(value);
      setIsEditing(false);
      e.currentTarget.blur();
    }
  };

  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{label}</label>}
      <div ref={wrapperRef} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          placeholder="YYYY-MM-DD"
          className="w-full px-3 py-2 pr-10 bg-gray-800/40 text-brand-text border border-white/10 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
        />
        <button
          type="button"
          onClick={handleCalendarIconClick}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        {isCalendarOpen && createPortal(
          <div
            ref={calendarRef}
            style={{
              position: 'fixed',
              top: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().bottom + 6 : 0,
              left: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().left : 0,
              zIndex: 9999,
            }}
          >
            <DatePickerLib
              ref={datePickerRef}
              selected={dateValue}
              onChange={handleChange}
              inline
              dateFormat="MM/dd/yyyy"
              calendarClassName="dark-calendar"
            />
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
