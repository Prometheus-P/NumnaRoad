/**
 * Country and Product Constants
 *
 * Centralized constants for country data and product options.
 * Used across admin pages for product management.
 */

// =============================================================================
// Country Types
// =============================================================================

export interface Country {
  code: string;
  nameKo: string;
  nameEn: string;
  flag: string;
}

export type AdminLocale = 'ko' | 'en';

// =============================================================================
// Countries (Popular Travel Destinations)
// =============================================================================

export const COUNTRIES: Country[] = [
  { code: 'JP', nameKo: '일본', nameEn: 'Japan', flag: '🇯🇵' },
  { code: 'US', nameKo: '미국', nameEn: 'United States', flag: '🇺🇸' },
  { code: 'CN', nameKo: '중국', nameEn: 'China', flag: '🇨🇳' },
  { code: 'TH', nameKo: '태국', nameEn: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', nameKo: '베트남', nameEn: 'Vietnam', flag: '🇻🇳' },
  { code: 'TW', nameKo: '대만', nameEn: 'Taiwan', flag: '🇹🇼' },
  { code: 'SG', nameKo: '싱가포르', nameEn: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', nameKo: '홍콩', nameEn: 'Hong Kong', flag: '🇭🇰' },
  { code: 'PH', nameKo: '필리핀', nameEn: 'Philippines', flag: '🇵🇭' },
  { code: 'MY', nameKo: '말레이시아', nameEn: 'Malaysia', flag: '🇲🇾' },
  { code: 'ID', nameKo: '인도네시아', nameEn: 'Indonesia', flag: '🇮🇩' },
  { code: 'AU', nameKo: '호주', nameEn: 'Australia', flag: '🇦🇺' },
  { code: 'NZ', nameKo: '뉴질랜드', nameEn: 'New Zealand', flag: '🇳🇿' },
  { code: 'EU', nameKo: '유럽 (다국가)', nameEn: 'Europe (Multi)', flag: '🇪🇺' },
  { code: 'GB', nameKo: '영국', nameEn: 'United Kingdom', flag: '🇬🇧' },
  { code: 'FR', nameKo: '프랑스', nameEn: 'France', flag: '🇫🇷' },
  { code: 'DE', nameKo: '독일', nameEn: 'Germany', flag: '🇩🇪' },
  { code: 'IT', nameKo: '이탈리아', nameEn: 'Italy', flag: '🇮🇹' },
  { code: 'ES', nameKo: '스페인', nameEn: 'Spain', flag: '🇪🇸' },
  { code: 'CA', nameKo: '캐나다', nameEn: 'Canada', flag: '🇨🇦' },
  { code: 'MX', nameKo: '멕시코', nameEn: 'Mexico', flag: '🇲🇽' },
  { code: 'BR', nameKo: '브라질', nameEn: 'Brazil', flag: '🇧🇷' },
];

// =============================================================================
// Country Helpers
// =============================================================================

/**
 * Get country name based on locale.
 */
export function getCountryName(country: Country, locale: AdminLocale): string {
  return locale === 'ko' ? country.nameKo : country.nameEn;
}

/**
 * Find a country by its code.
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

/**
 * Get country display label (flag + name) for selects.
 */
export function getCountryLabel(country: Country, locale: AdminLocale): string {
  return `${country.flag} ${getCountryName(country, locale)}`;
}

// =============================================================================
// Product Constants
// =============================================================================

/**
 * Available eSIM providers.
 */
export const PROVIDER_IDS = [
  'redteago',
  'esimcard',
  'mobimatter',
  'airalo',
  'manual',
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * Data capacity options.
 */
export const DATA_OPTIONS = [
  '500MB',
  '1GB',
  '2GB',
  '3GB',
  '5GB',
  '10GB',
  '15GB',
  '20GB',
];

/**
 * Network speed options.
 */
export const SPEED_OPTIONS = ['3G', '4G LTE', '5G'];
