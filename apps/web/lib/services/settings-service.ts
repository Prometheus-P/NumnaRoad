/**
 * Settings Service Layer
 *
 * CRUD operations for app settings with caching and audit logging.
 */

import type PocketBase from 'pocketbase';
import {
  encryptSetting,
  decryptSetting,
  maskSensitiveValue,
} from '@/lib/settings-crypto';

// =============================================================================
// Types
// =============================================================================

export type SettingCategory =
  | 'general'
  | 'esim_providers'
  | 'notifications'
  | 'integrations';

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';

export interface SettingDefinition {
  key: string;
  category: SettingCategory;
  valueType: SettingValueType;
  isSensitive: boolean;
  label: string;
  description?: string;
  defaultValue?: string;
}

export interface SettingRecord {
  id: string;
  category: SettingCategory;
  key: string;
  value: string;
  is_encrypted: boolean;
  value_type: SettingValueType;
  description?: string;
  updated_by?: string;
  created: string;
  updated: string;
}

export interface ParsedSetting {
  id: string;
  category: SettingCategory;
  key: string;
  value: string | number | boolean | object;
  displayValue: string; // Masked if sensitive
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

// =============================================================================
// Setting Definitions Registry
// =============================================================================

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  // General
  {
    key: 'site_name',
    category: 'general',
    valueType: 'string',
    isSensitive: false,
    label: 'Site Name',
    defaultValue: 'NumnaRoad',
  },
  {
    key: 'default_currency',
    category: 'general',
    valueType: 'string',
    isSensitive: false,
    label: 'Default Currency',
    defaultValue: 'KRW',
  },
  {
    key: 'timezone',
    category: 'general',
    valueType: 'string',
    isSensitive: false,
    label: 'Timezone',
    defaultValue: 'Asia/Seoul',
  },

  // eSIM Providers
  {
    key: 'redteago_api_key',
    category: 'esim_providers',
    valueType: 'string',
    isSensitive: true,
    label: 'RedteaGO API Key',
  },
  {
    key: 'redteago_api_url',
    category: 'esim_providers',
    valueType: 'string',
    isSensitive: false,
    label: 'RedteaGO API URL',
    defaultValue: 'https://api.redteago.com',
  },
  {
    key: 'redteago_enabled',
    category: 'esim_providers',
    valueType: 'boolean',
    isSensitive: false,
    label: 'RedteaGO Enabled',
    defaultValue: 'true',
  },
  {
    key: 'airalo_client_id',
    category: 'esim_providers',
    valueType: 'string',
    isSensitive: true,
    label: 'Airalo Client ID',
  },
  {
    key: 'airalo_client_secret',
    category: 'esim_providers',
    valueType: 'string',
    isSensitive: true,
    label: 'Airalo Client Secret',
  },
  {
    key: 'airalo_enabled',
    category: 'esim_providers',
    valueType: 'boolean',
    isSensitive: false,
    label: 'Airalo Enabled',
    defaultValue: 'false',
  },
  {
    key: 'esimcard_api_key',
    category: 'esim_providers',
    valueType: 'string',
    isSensitive: true,
    label: 'eSIMCard API Key',
  },
  {
    key: 'esimcard_enabled',
    category: 'esim_providers',
    valueType: 'boolean',
    isSensitive: false,
    label: 'eSIMCard Enabled',
    defaultValue: 'false',
  },
  {
    key: 'mobimatter_api_key',
    category: 'esim_providers',
    valueType: 'string',
    isSensitive: true,
    label: 'MobiMatter API Key',
  },
  {
    key: 'mobimatter_enabled',
    category: 'esim_providers',
    valueType: 'boolean',
    isSensitive: false,
    label: 'MobiMatter Enabled',
    defaultValue: 'false',
  },

  // Notifications
  {
    key: 'telegram_bot_token',
    category: 'notifications',
    valueType: 'string',
    isSensitive: true,
    label: 'Telegram Bot Token',
  },
  {
    key: 'telegram_chat_id',
    category: 'notifications',
    valueType: 'string',
    isSensitive: false,
    label: 'Telegram Chat ID',
  },
  {
    key: 'telegram_enabled',
    category: 'notifications',
    valueType: 'boolean',
    isSensitive: false,
    label: 'Telegram Enabled',
    defaultValue: 'true',
  },
  {
    key: 'resend_api_key',
    category: 'notifications',
    valueType: 'string',
    isSensitive: true,
    label: 'Resend API Key',
  },
  {
    key: 'resend_from_email',
    category: 'notifications',
    valueType: 'string',
    isSensitive: false,
    label: 'Resend From Email',
    defaultValue: 'noreply@numnaroad.com',
  },
  {
    key: 'email_enabled',
    category: 'notifications',
    valueType: 'boolean',
    isSensitive: false,
    label: 'Email Notifications Enabled',
    defaultValue: 'true',
  },
  {
    key: 'kakao_alimtalk_api_key',
    category: 'notifications',
    valueType: 'string',
    isSensitive: true,
    label: 'Kakao Alimtalk API Key (SOLAPI)',
  },
  {
    key: 'kakao_alimtalk_sender_key',
    category: 'notifications',
    valueType: 'string',
    isSensitive: true,
    label: 'Kakao Alimtalk Sender Key',
  },
  {
    key: 'kakao_alimtalk_enabled',
    category: 'notifications',
    valueType: 'boolean',
    isSensitive: false,
    label: 'Kakao Alimtalk Enabled',
    defaultValue: 'false',
  },

  // Integrations
  {
    key: 'smartstore_app_key',
    category: 'integrations',
    valueType: 'string',
    isSensitive: true,
    label: 'SmartStore App Key',
  },
  {
    key: 'smartstore_app_secret',
    category: 'integrations',
    valueType: 'string',
    isSensitive: true,
    label: 'SmartStore App Secret',
  },
  {
    key: 'smartstore_enabled',
    category: 'integrations',
    valueType: 'boolean',
    isSensitive: false,
    label: 'SmartStore Enabled',
    defaultValue: 'false',
  },
  {
    key: 'stripe_secret_key',
    category: 'integrations',
    valueType: 'string',
    isSensitive: true,
    label: 'Stripe Secret Key',
  },
  {
    key: 'stripe_webhook_secret',
    category: 'integrations',
    valueType: 'string',
    isSensitive: true,
    label: 'Stripe Webhook Secret',
  },
  {
    key: 'stripe_enabled',
    category: 'integrations',
    valueType: 'boolean',
    isSensitive: false,
    label: 'Stripe Enabled',
    defaultValue: 'true',
  },
];

// =============================================================================
// Cache
// =============================================================================

interface CacheEntry {
  data: SettingsByCategoryMap;
  expiresAt: number;
}

let settingsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

function invalidateCache(): void {
  settingsCache = null;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getDefinition(
  category: SettingCategory,
  key: string
): SettingDefinition | undefined {
  return SETTING_DEFINITIONS.find(
    (d) => d.category === category && d.key === key
  );
}

function parseValue(
  value: string,
  valueType: SettingValueType
): string | number | boolean | object {
  switch (valueType) {
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

function stringifyValue(
  value: string | number | boolean | object,
  valueType: SettingValueType
): string {
  if (valueType === 'json' && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function recordToParsedSetting(
  record: SettingRecord,
  definition?: SettingDefinition
): ParsedSetting {
  const isSensitive = definition?.isSensitive ?? record.is_encrypted;

  let rawValue = record.value;
  if (record.is_encrypted && rawValue) {
    try {
      rawValue = decryptSetting(rawValue);
    } catch {
      rawValue = '';
    }
  }

  const parsedValue = parseValue(rawValue, record.value_type);

  return {
    id: record.id,
    category: record.category,
    key: record.key,
    value: parsedValue,
    displayValue: isSensitive ? maskSensitiveValue(rawValue) : rawValue,
    isSensitive,
    valueType: record.value_type,
    label: definition?.label ?? record.key,
    description: record.description ?? definition?.description,
    updatedBy: record.updated_by,
    updatedAt: record.updated,
  };
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Get a single setting by category and key
 */
export async function getSetting(
  pb: PocketBase,
  category: SettingCategory,
  key: string
): Promise<ParsedSetting | null> {
  try {
    const record = await pb
      .collection('app_settings')
      .getFirstListItem<SettingRecord>(`category="${category}" && key="${key}"`);

    const definition = getDefinition(category, key);
    return recordToParsedSetting(record, definition);
  } catch (error) {
    // Not found
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get raw setting value (decrypted) for use in code
 */
export async function getSettingValue(
  pb: PocketBase,
  category: SettingCategory,
  key: string
): Promise<string | null> {
  const setting = await getSetting(pb, category, key);
  if (!setting) {
    const definition = getDefinition(category, key);
    return definition?.defaultValue ?? null;
  }
  return String(setting.value);
}

/**
 * Get all settings grouped by category
 */
export async function getSettingsByCategory(
  pb: PocketBase,
  useCache = true
): Promise<SettingsByCategoryMap> {
  // Check cache
  if (useCache && settingsCache && settingsCache.expiresAt > Date.now()) {
    return settingsCache.data;
  }

  const records = await pb
    .collection('app_settings')
    .getFullList<SettingRecord>({ sort: 'category,key' });

  const result: SettingsByCategoryMap = {
    general: [],
    esim_providers: [],
    notifications: [],
    integrations: [],
  };

  // Add existing records
  for (const record of records) {
    const definition = getDefinition(record.category, record.key);
    const parsed = recordToParsedSetting(record, definition);
    result[record.category].push(parsed);
  }

  // Add missing settings with default values
  for (const definition of SETTING_DEFINITIONS) {
    const exists = result[definition.category].some(
      (s) => s.key === definition.key
    );
    if (!exists) {
      result[definition.category].push({
        id: '',
        category: definition.category,
        key: definition.key,
        value: parseValue(definition.defaultValue ?? '', definition.valueType),
        displayValue: definition.isSensitive
          ? ''
          : (definition.defaultValue ?? ''),
        isSensitive: definition.isSensitive,
        valueType: definition.valueType,
        label: definition.label,
        description: definition.description,
        updatedAt: '',
      });
    }
  }

  // Update cache
  settingsCache = {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return result;
}

/**
 * Update a setting
 */
export async function updateSetting(
  pb: PocketBase,
  category: SettingCategory,
  key: string,
  value: string | number | boolean | object,
  updatedBy: string
): Promise<ParsedSetting> {
  const definition = getDefinition(category, key);
  if (!definition) {
    throw new Error(`Unknown setting: ${category}.${key}`);
  }

  const stringValue = stringifyValue(value, definition.valueType);
  const shouldEncrypt = definition.isSensitive && stringValue.length > 0;
  const storedValue = shouldEncrypt ? encryptSetting(stringValue) : stringValue;

  // Check if setting exists
  let existingRecord: SettingRecord | null = null;
  try {
    existingRecord = await pb
      .collection('app_settings')
      .getFirstListItem<SettingRecord>(`category="${category}" && key="${key}"`);
  } catch {
    // Not found
  }

  let record: SettingRecord;
  let action: 'create' | 'update';

  if (existingRecord) {
    // Update existing
    record = await pb
      .collection('app_settings')
      .update<SettingRecord>(existingRecord.id, {
        value: storedValue,
        is_encrypted: shouldEncrypt,
        updated_by: updatedBy,
      });
    action = 'update';
  } else {
    // Create new
    record = await pb.collection('app_settings').create<SettingRecord>({
      category,
      key,
      value: storedValue,
      is_encrypted: shouldEncrypt,
      value_type: definition.valueType,
      description: definition.description ?? '',
      updated_by: updatedBy,
    });
    action = 'create';
  }

  // Create audit log
  const oldValue = existingRecord
    ? existingRecord.is_encrypted
      ? maskSensitiveValue(decryptSetting(existingRecord.value))
      : existingRecord.value
    : '';

  const newValueForLog = shouldEncrypt
    ? maskSensitiveValue(stringValue)
    : stringValue;

  await pb.collection('settings_audit_logs').create({
    setting_id: record.id,
    category,
    key,
    old_value: oldValue,
    new_value: newValueForLog,
    changed_by: updatedBy,
    action,
  });

  // Invalidate cache
  invalidateCache();

  return recordToParsedSetting(record, definition);
}

/**
 * Batch update multiple settings
 */
export async function updateSettings(
  pb: PocketBase,
  updates: Array<{
    category: SettingCategory;
    key: string;
    value: string | number | boolean | object;
  }>,
  updatedBy: string
): Promise<ParsedSetting[]> {
  const results: ParsedSetting[] = [];

  for (const update of updates) {
    const result = await updateSetting(
      pb,
      update.category,
      update.key,
      update.value,
      updatedBy
    );
    results.push(result);
  }

  return results;
}

/**
 * Get audit logs for settings
 */
export async function getSettingsAuditLogs(
  pb: PocketBase,
  options?: {
    category?: SettingCategory;
    key?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  items: Array<{
    id: string;
    category: SettingCategory;
    key: string;
    oldValue: string;
    newValue: string;
    changedBy: string;
    action: 'create' | 'update' | 'delete';
    createdAt: string;
  }>;
  totalItems: number;
}> {
  let filter = '';
  if (options?.category) {
    filter = `category="${options.category}"`;
  }
  if (options?.key) {
    filter += filter ? ` && key="${options.key}"` : `key="${options.key}"`;
  }

  const result = await pb.collection('settings_audit_logs').getList(
    Math.floor((options?.offset ?? 0) / (options?.limit ?? 20)) + 1,
    options?.limit ?? 20,
    {
      filter: filter || undefined,
      sort: '-created',
    }
  );

  return {
    items: result.items.map((item) => ({
      id: item.id,
      category: item.category as SettingCategory,
      key: item.key,
      oldValue: item.old_value,
      newValue: item.new_value,
      changedBy: item.changed_by,
      action: item.action as 'create' | 'update' | 'delete',
      createdAt: item.created,
    })),
    totalItems: result.totalItems,
  };
}

// =============================================================================
// Export for convenience
// =============================================================================

export { invalidateCache };
