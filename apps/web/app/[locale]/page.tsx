import { HeroSection } from '@/components/home';

// SSG: Pre-generate pages for all locales at build time
export function generateStaticParams() {
  return [{ locale: 'ko' }, { locale: 'en' }];
}

// Force static generation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;

  return <HeroSection locale={locale || 'ko'} />;
}
