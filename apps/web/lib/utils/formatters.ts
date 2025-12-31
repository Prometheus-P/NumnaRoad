/**
 * Format a number as Korean Won currency.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(value);
}

/**
 * Format a date as relative time ago string.
 */
export function formatTimeAgo(
  date: string,
  labels: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string }
): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return labels.justNow;
  if (diffMins < 60) return `${diffMins}${labels.minutesAgo}`;
  if (diffHours < 24) return `${diffHours}${labels.hoursAgo}`;
  return `${diffDays}${labels.daysAgo}`;
}
