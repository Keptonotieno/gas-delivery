import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { Sun, Moon, Check } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'button' | 'segmented' | 'dropdown' | 'pill';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  className = '',
  showLabel = false
}) => {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Variant: Segmented Control (Light / System / Dark)
  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Light Theme"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Dark Theme"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  // Variant: Pill with Label & Toggle Switch
  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
          isDark
            ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
        } ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-indigo-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500 animate-in spin-in-180 duration-200" />
          )}
        </div>
        <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      </button>
    );
  }

  // Variant: Dropdown Menu
  if (variant === 'dropdown') {
    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`p-2 rounded-lg border text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 ${className}`}
          title="Change Theme Appearance"
        >
          {isDark ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          {showLabel && (
            <span className="text-xs font-semibold capitalize">{theme}</span>
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
            <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
              Appearance
            </div>
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                setDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Light
              </span>
              {theme === 'light' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                setDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Dark
              </span>
              {theme === 'dark' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default Variant: Single-click Toggle Button with high polish
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-lg border text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all cursor-pointer flex items-center justify-center group ${className}`}
      title={isDark ? 'Switch to Light Mode (currently Dark)' : 'Switch to Dark Mode (currently Light)'}
      aria-label="Toggle theme appearance"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600 group-hover:-rotate-12 transition-transform duration-300" />
        )}
      </div>
      {showLabel && (
        <span className="ml-2 text-xs font-semibold">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};
