/**
 * Admin Settings Hooks
 *
 * Reusable hooks for settings data fetching and mutations.
 * Supports TanStack Query for caching and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export type SettingCategory =
  | 'general'
  | 'esim_providers'
  | 'notifications'
  | 'integrations';

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';

export interface ParsedSetting {
  id: string;
  category: SettingCategory;
  key: string;
  value: string | number | boolean | object;
  displayValue: string;
  isSensitive: boolean;
  valueType: SettingValueType;
  label: string;
  description?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface SettingsByCategoryMap {
  general: ParsedSetting[];
  esim_providers: ParsedSetting[];
  notifications: ParsedSetting[];
  integrations: ParsedSetting[];
}

export interface AuditLogEntry {
  id: string;
  category: SettingCategory;
  key: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  action: 'create' | 'update' | 'delete';
  createdAt: string;
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const settingsKeys = {
  all: ['admin', 'settings'] as const,
  list: () => [...settingsKeys.all, 'list'] as const,
  category: (category: SettingCategory) =>
    [...settingsKeys.all, 'category', category] as const,
  audit: (params?: { category?: string; limit?: number; offset?: number }) =>
    [...settingsKeys.all, 'audit', params] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch all settings grouped by category.
 */
export function useAdminSettings() {
  return useQuery<SettingsByCategoryMap>({
    queryKey: settingsKeys.list(),
    queryFn: async () => {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch settings');
      return json.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch settings for a specific category.
 */
export function useAdminSettingsByCategory(category: SettingCategory) {
  return useQuery<ParsedSetting[]>({
    queryKey: settingsKeys.category(category),
    queryFn: async () => {
      const res = await fetch(`/api/admin/settings/${category}`);
      if (!res.ok) throw new Error('Failed to fetch settings');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch settings');
      return json.data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Update a single setting.
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation<
    ParsedSetting,
    Error,
    { category: SettingCategory; key: string; value: string | number | boolean | object }
  >({
    mutationFn: async ({ category, key, value }) => {
      const res = await fetch(`/api/admin/settings/${category}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error('Failed to update setting');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update setting');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

/**
 * Batch update multiple settings.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation<
    ParsedSetting[],
    Error,
    Array<{ category: SettingCategory; key: string; value: string | number | boolean | object }>
  >({
    mutationFn: async (updates) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update settings');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

/**
 * Fetch audit logs.
 */
export function useSettingsAuditLogs(options?: {
  category?: SettingCategory;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  return useQuery<{ items: AuditLogEntry[]; totalItems: number }>({
    queryKey: settingsKeys.audit(options),
    queryFn: async () => {
      const res = await fetch(`/api/admin/settings/audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch audit logs');
      return { items: json.data, totalItems: json.totalItems };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Test connection to external service.
 */
export function useTestConnection() {
  return useMutation<TestConnectionResult, Error, string>({
    mutationFn: async (type) => {
      const res = await fetch('/api/admin/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      return json;
    },
  });
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get category display name.
 */
export function getCategoryLabel(category: SettingCategory): string {
  const labels: Record<SettingCategory, string> = {
    general: 'General',
    esim_providers: 'eSIM Providers',
    notifications: 'Notifications',
    integrations: 'Integrations',
  };
  return labels[category];
}

/**
 * Get category description.
 */
export function getCategoryDescription(category: SettingCategory): string {
  const descriptions: Record<SettingCategory, string> = {
    general: 'Site name, currency, and timezone settings',
    esim_providers: 'API keys and endpoints for eSIM providers',
    notifications: 'Telegram, Email, and Kakao Alimtalk settings',
    integrations: 'SmartStore and Stripe integration settings',
  };
  return descriptions[category];
}

/**
 * Group settings by enabled/disabled status.
 */
export function groupSettingsByStatus(settings: ParsedSetting[]): {
  enabled: ParsedSetting[];
  disabled: ParsedSetting[];
  other: ParsedSetting[];
} {
  const enabled: ParsedSetting[] = [];
  const disabled: ParsedSetting[] = [];
  const other: ParsedSetting[] = [];

  for (const setting of settings) {
    if (setting.key.endsWith('_enabled')) {
      if (setting.value === true) {
        enabled.push(setting);
      } else {
        disabled.push(setting);
      }
    } else {
      other.push(setting);
    }
  }

  return { enabled, disabled, other };
}
