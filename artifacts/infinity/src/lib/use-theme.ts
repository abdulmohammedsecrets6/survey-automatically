import { useState, useEffect } from 'react';
import { applyAccent } from '@/lib/use-accent';

type Theme = 'dark' | 'light' | 'auto';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem('infinity-theme') as Theme) || 'light'; }
    catch { return 'light'; }
  });
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Listen for external theme changes (cross-tab via storage, same-tab via custom event)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'infinity-theme' && e.newValue) {
        setTheme(e.newValue as Theme);
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail === 'string') {
        setTheme(detail as Theme);
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('infinity-theme-change', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('infinity-theme-change', onCustom);
    };
  }, []);

  const resolved: 'dark' | 'light' = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(resolved);
    try { localStorage.setItem('infinity-theme', theme); } catch { /* noop */ }
    applyAccent(null, resolved);
  }, [theme, resolved]);

  return {
    theme,
    resolved: resolved || 'light',
    setTheme,
    toggle: (next?: Theme) => setTheme(next ?? (resolved === 'dark' ? 'light' : 'dark')),
  };
}
