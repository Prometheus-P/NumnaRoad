import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'ko'] as const;
export const defaultLocale = 'ko';

export type Locale = (typeof locales)[number];

export async function getMessages(locale: string) {
  if (!locales.includes(locale as Locale)) notFound();

  return (await import(`./locales/${locale}.json`)).default;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? defaultLocale;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    locale,
    messages: await getMessages(locale),
  };
});