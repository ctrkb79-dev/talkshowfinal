
import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'office';

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>('light');

  // Load from local storage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme') as ThemeMode;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // Apply theme to body
  useEffect(() => {
    // Remove all theme classes first
    document.body.classList.remove('dark', 'office-mode');

    // Add appropriate class
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else if (theme === 'office') {
      document.body.classList.add('office-mode');
    }
    // 'light' is default (no class or default styles)

    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'office';
      return 'light';
    });
  };

  return { theme, setTheme, toggleTheme };
};
