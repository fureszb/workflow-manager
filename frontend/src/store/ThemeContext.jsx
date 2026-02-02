import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  // Load theme from backend on mount
  useEffect(() => {
    api.get('/v1/settings/theme')
      .then((res) => {
        if (res.data.value) {
          setTheme(res.data.value);
        }
      })
      .catch(() => {
        // Backend unavailable, use localStorage fallback
      });
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      api.put('/v1/settings/theme', { value: next }).catch(() => {});
      return next;
    });
  };

  const setThemeValue = (value) => {
    setTheme(value);
    api.put('/v1/settings/theme', { value }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeValue }}>
      {children}
    </ThemeContext.Provider>
  );
};
