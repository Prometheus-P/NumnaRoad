import { HeroSection } from '@/components/home';

// SSG: Pre-generate pages for all locales at build time
export function generateStaticParams() {
  return [{ locale: 'ko' }, { locale: 'en' }];
}

// Force static generation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: { locale: string };
}

export default function Home({ params }: PageProps) {
  const locale = params.locale || 'ko';

  return <HeroSection locale={locale} />;
}
