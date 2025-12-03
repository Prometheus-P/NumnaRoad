/**
 * UI Components Index
 *
 * Exports all reusable UI components for the NumnaRoad web app.
 */

// Customer Order Tracking Components
export { StatusChip } from './StatusChip';
export type { StatusChipProps, OrderStatus } from './StatusChip';

export { OrderCard } from './OrderCard';
export type { OrderCardProps } from './OrderCard';

export { QRCodeDisplay } from './QRCodeDisplay';
export type { QRCodeDisplayProps } from './QRCodeDisplay';

export { OrderProgress } from './OrderProgress';
export type { OrderProgressProps } from './OrderProgress';

export { InstallationGuide } from './InstallationGuide';
export type { InstallationGuideProps } from './InstallationGuide';

// Admin Dashboard Components
export { NavigationRail } from './NavigationRail';
export type { NavigationRailProps, NavItem } from './NavigationRail';

export { OrderStatsCard } from './OrderStatsCard';
export type { OrderStatsCardProps, StatType, TimePeriod } from './OrderStatsCard';

export { ProviderHealthCard } from './ProviderHealthCard';
export type { ProviderHealthCardProps, ProviderHealth, CircuitState } from './ProviderHealthCard';

export { DataTable } from './DataTable';
export type { DataTableProps } from './DataTable';
