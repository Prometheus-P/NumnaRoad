'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useAdminLanguage, AdminTranslations, AdminLocale } from '@/lib/i18n';
import { formatCurrency, formatTimeAgo, TIME_LABELS_KO } from '@/lib/utils/formatters';

// =============================================================================
// Types
// =============================================================================

interface AdminContextValue {
  /** Current locale */
  locale: AdminLocale;
  /** Translation object */
  t: AdminTranslations;
  /** Format currency with locale-aware formatting */
  formatPrice: (value: number, currency?: string) => string;
  /** Format relative time with i18n labels */
  formatRelativeTime: (date: string | null | undefined) => string;
  /** Get status label from translations */
  getStatusLabel: (status: string) => string;
  /** Get channel label from translations */
  getChannelLabel: (channel: string) => string;
}

// =============================================================================
// Context
// =============================================================================

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

// =============================================================================
// Provider
// =============================================================================

interface AdminProviderProps {
  children: React.ReactNode;
}

/**
 * AdminProvider wraps the admin pages and provides utilities.
 *
 * Must be used within AdminLanguageProvider.
 * Provides memoized formatting functions that respect the current locale.
 */
export function AdminProvider({ children }: AdminProviderProps) {
  const { locale, t } = useAdminLanguage();

  const value = useMemo<AdminContextValue>(() => {
    // Build time labels based on locale
    const timeLabels = locale === 'ko' ? TIME_LABELS_KO : undefined;

    return {
      locale,
      t,
      formatPrice: (value: number, currency = 'KRW') => {
        return formatCurrency(value, currency, locale === 'ko' ? 'ko-KR' : 'en-US');
      },
      formatRelativeTime: (date: string | null | undefined) => {
        return formatTimeAgo(date, timeLabels);
      },
      getStatusLabel: (status: string) => {
        return t.orders.statuses[status as keyof typeof t.orders.statuses] || status.replace(/_/g, ' ');
      },
      getChannelLabel: (channel: string) => {
        return t.orders.channels[channel as keyof typeof t.orders.channels] || channel;
      },
    };
  }, [locale, t]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * useAdmin provides access to admin utilities and translations.
 *
 * Must be used within AdminProvider.
 */
export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
