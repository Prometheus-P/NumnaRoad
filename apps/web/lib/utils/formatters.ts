/**
 * Admin Formatters
 *
 * Centralized formatting utilities for the admin dashboard.
 * All formatting functions should be imported from this module
 * to ensure consistency across the application.
 */

// =============================================================================
// Currency Formatters
// =============================================================================

/**
 * Format a number as currency.
 * @param value - The numeric value to format
 * @param currency - Currency code (default: 'KRW')
 * @param locale - Locale for formatting (default: 'ko-KR')
 */
export function formatCurrency(
  value: number,
  currency: string = 'KRW',
  locale: string = 'ko-KR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format a number as USD currency.
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

// =============================================================================
// Date/Time Formatters
// =============================================================================

/**
 * Format a date with date and time (without seconds).
 * Format: 2024. 01. 15. 오후 3:30
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Format a date with full date and time (with seconds).
 * Format: 2024. 01. 15. 오후 3:30:45
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

/**
 * Format a date in short format.
 * Format: 2024년 1월 15일 15:30
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// =============================================================================
// Relative Time Formatters
// =============================================================================

/**
 * Default English labels for formatTimeAgo
 */
const DEFAULT_TIME_LABELS = {
  justNow: 'Just now',
  minutesAgo: 'm ago',
  hoursAgo: 'h ago',
  daysAgo: 'd ago',
  never: 'Never',
  noData: '-',
};

/**
 * Korean labels for formatTimeAgo
 */
export const TIME_LABELS_KO = {
  justNow: '방금 전',
  minutesAgo: '분 전',
  hoursAgo: '시간 전',
  daysAgo: '일 전',
  never: '없음',
  noData: '-',
};

export type TimeAgoLabels = typeof DEFAULT_TIME_LABELS;

/**
 * Format a date as relative time ago string.
 *
 * @param date - The date string or null/undefined
 * @param labels - Optional labels for i18n (defaults to English)
 * @returns Formatted relative time string
 *
 * @example
 * // With default English labels
 * formatTimeAgo('2024-01-15T10:00:00Z') // "5m ago"
 *
 * // With Korean labels
 * formatTimeAgo('2024-01-15T10:00:00Z', TIME_LABELS_KO) // "5분 전"
 *
 * // With custom labels from i18n
 * formatTimeAgo(date, t.dashboard.timeAgo)
 */
export function formatTimeAgo(
  date: string | null | undefined,
  labels: Partial<TimeAgoLabels> = {}
): string {
  const l = { ...DEFAULT_TIME_LABELS, ...labels };

  if (!date) return l.noData;

  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return l.justNow;
  if (diffMins < 60) return `${diffMins}${l.minutesAgo}`;
  if (diffHours < 24) return `${diffHours}${l.hoursAgo}`;
  return `${diffDays}${l.daysAgo}`;
}

// =============================================================================
// Country/Flag Helpers
// =============================================================================

/**
 * Get emoji flag for a country code.
 * @param code - ISO 3166-1 alpha-2 country code
 */
export function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
