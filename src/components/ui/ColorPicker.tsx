// src/components/ui/ColorPicker.tsx
import { useState, useRef } from 'react';
import { PROJECT_COLORS, generateRandomProjectColor } from '../../utils/colors';
import { useClickOutside } from '../../hooks/useClickOutside';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside({
    enabled: isOpen,
    onClickOutside: () => setIsOpen(false),
    ref: containerRef,
  });

  const handleColorSelect = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-xs font-medium text-gray-400 mb-2">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-lg border-2 border-white/20 hover:border-cyan-500/50 transition-all hover:scale-105"
        style={{ backgroundColor: value }}
        title="Click to change color"
      />
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="flex flex-wrap gap-2 max-w-[240px]">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorSelect(color)}
                className={`w-8 h-8 rounded-lg transition-all ${
                  value === color
                    ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-800 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleColorSelect(generateRandomProjectColor())}
            className="mt-3 w-full px-3 py-1.5 text-xs text-gray-400 hover:text-cyan-400 border border-gray-600 hover:border-cyan-500/50 rounded transition-colors"
          >
            Random Color
          </button>
        </div>
      )}
    </div>
  );
}
