import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'ko'] as const;
export const defaultLocale = 'ko';

export async function getMessages(locale: string) {
  if (!locales.includes(locale as any)) notFound();

  return (await import(`./locales/${locale}.json`)).default;
}

export default getRequestConfig(async ({ locale }) => ({
  locale: locale ?? defaultLocale,
  messages: await getMessages(locale ?? defaultLocale),
}));