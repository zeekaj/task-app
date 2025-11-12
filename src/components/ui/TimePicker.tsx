// src/components/ui/TimePicker.tsx
import { useState, useRef, useEffect } from 'react';
import { FloatingDropdown } from '../shared/FloatingDropdown';

interface TimePickerProps {
  value: string; // HH:MM format (24-hour)
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function TimePicker({ value, onChange, label, className = '' }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hours, minutes] = value.split(':').map(Number);
  
  const hour12 = hours % 12 || 12;
  const isPM = hours >= 12;

  // Sync input value with prop value when not editing
  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatDisplay());
    }
  }, [value, isEditing]);

  const handleHourChange = (newHour12: number) => {
    // Convert 12-hour to 24-hour
    let hour24 = newHour12;
    if (isPM && newHour12 !== 12) hour24 = newHour12 + 12;
    else if (!isPM && newHour12 === 12) hour24 = 0;
    const newValue = `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    onChange(newValue);
    setIsEditing(false); // Allow the useEffect to update inputValue
  };

  const handleMinuteChange = (newMinute: number) => {
    const newValue = `${String(hours).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
    onChange(newValue);
    setIsEditing(false); // Allow the useEffect to update inputValue
  };

  const handleAMPMChange = (pm: boolean) => {
    let newHour24 = hours;
    if (pm && hours < 12) newHour24 = hours + 12;
    else if (!pm && hours >= 12) newHour24 = hours - 12;
    const newValue = `${String(newHour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    onChange(newValue);
    setIsEditing(false); // Allow the useEffect to update inputValue
  };

  const formatDisplay = () => {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const parseTimeInput = (input: string): string | null => {
    // Remove extra spaces
    const cleaned = input.trim().toUpperCase();
    
    // Match patterns like: 1:30 PM, 1:30PM, 13:30, 130, 1:30, 7a, 730p, 7p
    const patterns = [
      /^(\d{1,2}):(\d{2})\s*(AM|PM|A|P)?$/i,  // 1:30 PM, 1:30, 1:30a, 1:30p
      /^(\d{1,2})\s*(AM|PM|A|P)$/i,           // 1 PM, 1a, 1p (hour only with period)
      /^(\d{1})(\d{2})\s*(AM|PM|A|P)?$/i,     // 130 PM, 130a, 730p (single digit hour + 2 digit minute)
      /^(\d{2})(\d{2})\s*(AM|PM|A|P)?$/i,     // 1130 PM, 1130a (double digit hour + 2 digit minute)
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = cleaned.match(patterns[i]);
      if (match) {
        let hour = parseInt(match[1]);
        let minute = 0;
        let period: string | null = null;
        
        if (i === 0) {
          // Pattern with colon: 1:30 PM
          minute = parseInt(match[2]);
          period = match[3] || null;
        } else if (i === 1) {
          // Hour only with period: 1 PM, 7a
          minute = 0;
          period = match[2];
        } else {
          // Patterns with concatenated digits: 130, 730p, 1130a
          minute = parseInt(match[2]);
          period = match[3] || null;
        }
        
        // Handle shorthand: 'A' -> 'AM', 'P' -> 'PM'
        if (period === 'A') period = 'AM';
        if (period === 'P') period = 'PM';
        
        // Validate
        if (minute > 59) return null;
        if (hour > 23 && !period) return null; // 24-hour format validation
        
        // Convert to 24-hour format
        if (period === 'PM' && hour !== 12) {
          hour += 12;
        } else if (period === 'AM' && hour === 12) {
          hour = 0;
        }
        
        if (hour > 23) return null;
        
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
    }
    
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if the blur is due to clicking inside the dropdown
    // If so, prevent closing and return early
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.time-picker-dropdown')) {
      return;
    }
    
    // Only parse and validate if the user was actually editing via keyboard
    if (isEditing) {
      const parsed = parseTimeInput(inputValue);
      if (parsed) {
        onChange(parsed);
      } else {
        // Reset to current value if invalid
        setInputValue(formatDisplay());
      }
    }
    
    setIsEditing(false);
    setIsOpen(false); // Close the dropdown when input loses focus
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    // Select all text on focus for easy replacement
    e.target.select();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInputValue(formatDisplay());
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={className}>
      {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
      <FloatingDropdown
        open={isOpen}
        onOpenChange={setIsOpen}
        align="left"
        offsetY={4}
        trigger={
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              placeholder="HH:MM AM/PM"
              className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        }
      >
        <div className="time-picker-dropdown bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[240px]">
          <div className="flex gap-1.5">
            {/* Hours */}
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1 text-center">Hour</div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur
                      handleHourChange(hour);
                      inputRef.current?.focus();
                    }}
                    className={`w-full px-3 py-1.5 text-sm rounded transition-colors ${
                      hour === hour12
                        ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1 text-center">Min</div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur
                      handleMinuteChange(minute);
                      inputRef.current?.focus();
                    }}
                    className={`w-full px-3 py-1.5 text-sm rounded transition-colors ${
                      minute === minutes
                        ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM */}
            <div className="w-16">
              <div className="text-xs text-gray-400 mb-1 text-center">Period</div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur
                    handleAMPMChange(false);
                    inputRef.current?.focus();
                  }}
                  className={`w-full px-2 py-1.5 text-sm rounded transition-colors ${
                    !isPM
                      ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur
                    handleAMPMChange(true);
                    inputRef.current?.focus();
                  }}
                  className={`w-full px-2 py-1.5 text-sm rounded transition-colors ${
                    isPM
                      ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>
        </div>
      </FloatingDropdown>
    </div>
  );
}
