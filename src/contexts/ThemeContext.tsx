import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'gasdeliver_theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as string | null;
      if (saved === 'dark') return 'dark';
      if (saved === 'light') return 'light';
    } catch {
      // Ignore storage errors in restricted contexts
    }
    return 'light'; // Default to clean light theme
  });

  const [resolvedDark, setResolvedDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      const isDarkMode = theme === 'dark';
      setResolvedDark(isDarkMode);

      if (isDarkMode) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme();
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Storage unavailable
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: resolvedDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
