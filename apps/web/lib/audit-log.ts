/**
 * Audit Logging Module
 *
 * Records all admin actions for security compliance and forensic analysis.
 * Logs are stored in PocketBase with 90-day retention policy.
 *
 * Usage:
 * ```typescript
 * await auditLog({
 *   actor: { id: 'admin-123', email: 'admin@example.com' },
 *   action: 'UPDATE',
 *   resource: { type: 'orders', id: 'order-456' },
 *   changes: { status: { from: 'pending', to: 'completed' } },
 *   request: { ip: '1.2.3.4', userAgent: 'Mozilla/5.0...' },
 * });
 * ```
 */

import { NextRequest } from 'next/server';
import { getAdminPocketBase } from './pocketbase';
import { logger } from './logger';
import { pbRetry } from './pocketbase-retry';

// =============================================================================
// Types
// =============================================================================

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'BULK_ACTION';

export interface AuditActor {
  id: string;
  email?: string;
}

export interface AuditResource {
  type: string;
  id?: string;
}

export interface AuditChanges {
  [field: string]: {
    from?: unknown;
    to?: unknown;
  };
}

export interface AuditRequestInfo {
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
}

export interface AuditLogEntry {
  actor: AuditActor;
  action: AuditAction;
  resource: AuditResource;
  changes?: AuditChanges;
  request?: AuditRequestInfo;
  statusCode?: number;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Constants
// =============================================================================

const COLLECTION = 'audit_logs';
const RETENTION_DAYS = 90;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Extract request information for audit logging.
 */
export function extractRequestInfo(request: NextRequest): AuditRequestInfo {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  return {
    ip,
    userAgent: request.headers.get('user-agent') || undefined,
    path: request.nextUrl.pathname,
    method: request.method,
  };
}

/**
 * Calculate changes between before and after states.
 * Only includes fields that actually changed.
 */
export function calculateChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): AuditChanges | undefined {
  const changes: AuditChanges = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    // Skip system fields
    if (['id', 'created', 'updated', 'collectionId', 'collectionName'].includes(key)) {
      continue;
    }

    const fromValue = before[key];
    const toValue = after[key];

    // Compare values (simple JSON comparison)
    if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
      changes[key] = { from: fromValue, to: toValue };
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}

/**
 * Log an admin action to the audit log.
 * Fails silently to avoid blocking the main operation.
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const pb = await getAdminPocketBase();

    await pbRetry(async () => {
      await pb.collection(COLLECTION).create({
        actor_id: entry.actor.id,
        actor_email: entry.actor.email || null,
        action: entry.action,
        resource_type: entry.resource.type,
        resource_id: entry.resource.id || null,
        changes: entry.changes || null,
        ip_address: entry.request?.ip || null,
        user_agent: entry.request?.userAgent?.substring(0, 500) || null,
        request_path: entry.request?.path || null,
        request_method: entry.request?.method || null,
        status_code: entry.statusCode || null,
        correlation_id: entry.correlationId || null,
        metadata: entry.metadata || null,
      });
    });

    logger.debug('audit_log_created', {
      actor: entry.actor.id,
      action: entry.action,
      resource: `${entry.resource.type}/${entry.resource.id || '*'}`,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    logger.error('audit_log_failed', error, {
      actor: entry.actor.id,
      action: entry.action,
      resource: entry.resource.type,
    });
  }
}

/**
 * Create an audit logger scoped to a specific request.
 * Automatically includes request info in all logs.
 */
export function createAuditLogger(
  request: NextRequest,
  actor: AuditActor,
  correlationId?: string
) {
  const requestInfo = extractRequestInfo(request);

  return {
    log: (
      action: AuditAction,
      resource: AuditResource,
      options?: {
        changes?: AuditChanges;
        statusCode?: number;
        metadata?: Record<string, unknown>;
      }
    ) =>
      auditLog({
        actor,
        action,
        resource,
        changes: options?.changes,
        request: requestInfo,
        statusCode: options?.statusCode,
        correlationId,
        metadata: options?.metadata,
      }),

    create: (resource: AuditResource, metadata?: Record<string, unknown>) =>
      auditLog({
        actor,
        action: 'CREATE',
        resource,
        request: requestInfo,
        statusCode: 201,
        correlationId,
        metadata,
      }),

    update: (
      resource: AuditResource,
      changes?: AuditChanges,
      metadata?: Record<string, unknown>
    ) =>
      auditLog({
        actor,
        action: 'UPDATE',
        resource,
        changes,
        request: requestInfo,
        statusCode: 200,
        correlationId,
        metadata,
      }),

    delete: (resource: AuditResource, metadata?: Record<string, unknown>) =>
      auditLog({
        actor,
        action: 'DELETE',
        resource,
        request: requestInfo,
        statusCode: 200,
        correlationId,
        metadata,
      }),

    read: (resource: AuditResource, metadata?: Record<string, unknown>) =>
      auditLog({
        actor,
        action: 'READ',
        resource,
        request: requestInfo,
        statusCode: 200,
        correlationId,
        metadata,
      }),
  };
}

// =============================================================================
// Cleanup Function
// =============================================================================

/**
 * Delete audit logs older than retention period.
 * Should be called by a scheduled cron job.
 *
 * @returns Number of records deleted
 */
export async function cleanupOldAuditLogs(): Promise<number> {
  try {
    const pb = await getAdminPocketBase();
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();

    // Get old records
    const oldRecords = await pbRetry(async () => {
      return pb.collection(COLLECTION).getList(1, 100, {
        filter: `created < "${cutoffIso}"`,
      });
    });

    if (oldRecords.items.length === 0) {
      logger.info('audit_log_cleanup_none_expired');
      return 0;
    }

    // Delete old records
    let deleted = 0;
    for (const record of oldRecords.items) {
      try {
        await pb.collection(COLLECTION).delete(record.id);
        deleted++;
      } catch (error) {
        logger.warn('audit_log_cleanup_delete_failed', {
          recordId: record.id,
          error: String(error),
        });
      }
    }

    logger.info('audit_log_cleanup_completed', {
      deleted,
      totalExpired: oldRecords.totalItems,
      retentionDays: RETENTION_DAYS,
    });

    return deleted;
  } catch (error) {
    logger.error('audit_log_cleanup_failed', error);
    throw error;
  }
}
