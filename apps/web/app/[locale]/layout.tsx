import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { ThemeProvider } from '../../../components/providers/ThemeProvider'; // Corrected import path
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from '../../../i18n'; // Corrected import path

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NumnaRoad - 해외여행 eSIM',
  description: '24/7 자동 발급되는 여행자 eSIM 플랫폼',
};

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages(locale);

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}


