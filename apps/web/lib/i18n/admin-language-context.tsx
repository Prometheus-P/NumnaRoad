'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AdminLocale, AdminTranslations, translations } from './admin-translations';

interface AdminLanguageContextType {
  locale: AdminLocale;
  t: AdminTranslations;
  setLocale: (locale: AdminLocale) => void;
  toggleLocale: () => void;
}

const AdminLanguageContext = createContext<AdminLanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'admin-locale';

export function AdminLanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>('ko');
  const [mounted, setMounted] = useState(false);

  // Load locale from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AdminLocale | null;
    if (saved && (saved === 'ko' || saved === 'en')) {
      setLocaleState(saved);
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: AdminLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    const newLocale = locale === 'ko' ? 'en' : 'ko';
    setLocale(newLocale);
  }, [locale, setLocale]);

  const t = translations[locale];

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <AdminLanguageContext.Provider
        value={{
          locale: 'ko',
          t: translations.ko,
          setLocale: () => {},
          toggleLocale: () => {},
        }}
      >
        {children}
      </AdminLanguageContext.Provider>
    );
  }

  return (
    <AdminLanguageContext.Provider value={{ locale, t, setLocale, toggleLocale }}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage() {
  const context = useContext(AdminLanguageContext);
  if (context === undefined) {
    throw new Error('useAdminLanguage must be used within an AdminLanguageProvider');
  }
  return context;
}

// Export for convenience
export { type AdminLocale, type AdminTranslations } from './admin-translations';
