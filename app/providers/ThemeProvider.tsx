'use client';

import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'xueban-theme-mode';

function getSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }

  return context;
}

export default function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedMode = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initialMode = savedMode === 'light' || savedMode === 'dark' || savedMode === 'system'
      ? savedMode
      : 'system';

    setMode(initialMode);
    setResolvedMode(initialMode === 'system' ? getSystemMode() : initialMode);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const syncTheme = () => {
      const nextResolvedMode = mode === 'system' ? getSystemMode() : mode;
      setResolvedMode(nextResolvedMode);
      document.documentElement.dataset.theme = nextResolvedMode;
      document.documentElement.classList.toggle('dark', nextResolvedMode === 'dark');
      window.localStorage.setItem(STORAGE_KEY, mode);
    };

    syncTheme();

    const handleChange = () => {
      if (mode === 'system') {
        syncTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  const contextValue = useMemo(
    () => ({
      mode,
      resolvedMode,
      setMode,
    }),
    [mode, resolvedMode]
  );

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: resolvedMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#165DFF',
            borderRadius: 6,
            fontSize: 14,
            colorSuccess: '#00C9A7',
            colorWarning: '#FF991F',
            colorError: '#F53F3F',
            colorInfo: '#165DFF',
          },
          components: {
            Button: {
              borderRadius: 6,
              boxShadow: 'none',
            },
            Card: {
              borderRadiusLG: 8,
            },
            Input: {
              borderRadius: 6,
            },
            Select: {
              borderRadius: 6,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}
