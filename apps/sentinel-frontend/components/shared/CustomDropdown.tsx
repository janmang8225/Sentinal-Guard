'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  icon?: React.ReactNode;
}

export default function CustomDropdown({ value, onChange, options, icon }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[40px] bg-[var(--bg-surface)] border ${isOpen ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]' : 'border-[var(--border-default)]'} rounded-xl px-[16px] text-[14px] font-medium text-primary flex items-center justify-between gap-3 min-w-[150px] shadow-sm hover:border-[var(--border-strong)] transition-all`}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-secondary">{icon}</span>}
          <span>{value}</span>
        </div>
        <ChevronDown size={14} className={`text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] right-0 min-w-[100%] w-max bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden z-50 py-1">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="w-full text-left px-[16px] py-[10px] text-[13px] font-medium hover:bg-subtle transition-colors flex items-center justify-between text-primary"
            >
              <span className={value === option ? 'text-[var(--brand-primary)]' : ''}>{option}</span>
              {value === option && <Check size={14} className="text-[var(--brand-primary)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
