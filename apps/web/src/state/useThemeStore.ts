import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useThemeStore() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('tars_theme') as Theme;
    return saved || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('tars_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, setTheme, toggleTheme };
}
