import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Supported locales: Korean (primary), English (secondary)
export const locales = ['ko', 'en'] as const;
export const defaultLocale = 'ko' as const;

export type Locale = (typeof locales)[number];

/**
 * Validates that a locale is supported
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * next-intl request configuration
 * Loads messages for the requested locale
 */
export default getRequestConfig(async ({ locale }) => {
  // Use default locale if not provided
  const resolvedLocale = locale ?? defaultLocale;

  // Validate that the incoming locale is supported
  if (!isValidLocale(resolvedLocale)) {
    notFound();
  }

  return {
    locale: resolvedLocale,
    messages: (await import(`./locales/${resolvedLocale}.json`)).default,
  };
});
