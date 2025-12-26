/**
 * Automation Logger Service
 *
 * Provides structured logging for order processing with:
 * - Correlation ID tracking
 * - Sensitive data redaction
 * - Duration tracking
 * - PocketBase integration
 *
 * Tasks: T047, T053, T054
 */

import type {
  StepName,
  LogStatus,
  ErrorType,
  CreateLogInput,
} from '../esim-providers/types';
import { createHash } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface LoggerConfig {
  orderId: string;
  correlationId: string;
}

export interface StepLogger {
  start(payload?: Record<string, unknown>): void;
  success(payload?: Record<string, unknown>): void;
  fail(error: { message: string; type?: ErrorType }, payload?: Record<string, unknown>): void;
  skip(reason?: string): void;
}

// =============================================================================
// Validation
// =============================================================================

const VALID_STEPS: StepName[] = [
  'webhook_received',
  'order_created',
  'provider_call_started',
  'provider_call_success',
  'provider_call_failed',
  'failover_triggered',
  'email_sent',
  'email_failed',
  'order_completed',
  'order_failed',
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateCorrelationId(correlationId: string): void {
  if (!UUID_REGEX.test(correlationId)) {
    throw new Error('Invalid correlation ID format');
  }
}

function validateStepName(stepName: string): asserts stepName is StepName {
  if (!VALID_STEPS.includes(stepName as StepName)) {
    throw new Error(`Invalid step name: ${stepName}`);
  }
}

// =============================================================================
// Sensitive Data Redaction (T054)
// =============================================================================

const SENSITIVE_PATTERNS = {
  email: /email/i,
  apiKey: /api[_-]?key|token|authorization|bearer/i,
  secret: /password|secret|credential/i,
};

/**
 * Hash an email for logging (first 8 chars of SHA256)
 */
function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex').substring(0, 8);
}

/**
 * Redact sensitive data from payloads
 */
export function redactSensitiveData(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) {
      result[key] = value;
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactSensitiveData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? redactSensitiveData(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'string') {
      if (SENSITIVE_PATTERNS.email.test(key)) {
        result[key] = hashEmail(value);
      } else if (
        SENSITIVE_PATTERNS.apiKey.test(key) ||
        SENSITIVE_PATTERNS.secret.test(key)
      ) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

// =============================================================================
// Log Entry Creation
// =============================================================================

/**
 * Create a log entry with validation
 */
export function createLogEntry(input: CreateLogInput): CreateLogInput & { createdAt: string } {
  validateCorrelationId(input.correlationId);
  validateStepName(input.stepName);

  // Redact sensitive data in payloads
  const redactedRequest = input.requestPayload
    ? redactSensitiveData(input.requestPayload)
    : undefined;
  const redactedResponse = input.responsePayload
    ? redactSensitiveData(input.responsePayload)
    : undefined;

  return {
    ...input,
    requestPayload: redactedRequest,
    responsePayload: redactedResponse,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Serialize log entry for PocketBase
 */
export function serializeForPocketBase(
  logEntry: CreateLogInput & { createdAt: string }
): Record<string, string | number | null> {
  return {
    order_id: logEntry.orderId,
    correlation_id: logEntry.correlationId,
    step_name: logEntry.stepName,
    status: logEntry.status,
    provider_name: logEntry.providerName ?? null,
    request_payload: logEntry.requestPayload
      ? JSON.stringify(logEntry.requestPayload)
      : null,
    response_payload: logEntry.responsePayload
      ? JSON.stringify(logEntry.responsePayload)
      : null,
    error_message: logEntry.errorMessage ?? null,
    error_type: logEntry.errorType ?? null,
    duration_ms: logEntry.durationMs ?? null,
    retry_count: logEntry.retryCount ?? null,
  };
}

// =============================================================================
// JSON Output Format (T066, US3-AS4)
// =============================================================================

/**
 * Structured JSON log format per US3-AS4
 * Fields: timestamp, correlation_id, step_name, status, duration_ms, metadata
 */
export interface StructuredLogOutput {
  timestamp: string;
  correlation_id: string;
  step_name: StepName;
  status: LogStatus;
  duration_ms: number | null;
  metadata: {
    order_id: string;
    provider_name?: string;
    error_message?: string;
    error_type?: ErrorType;
    request_payload?: Record<string, unknown>;
    response_payload?: Record<string, unknown>;
    retry_count?: number;
  };
}

/**
 * Convert log entry to structured JSON format per US3-AS4
 */
export function toStructuredJSON(
  logEntry: CreateLogInput & { createdAt: string }
): StructuredLogOutput {
  const metadata: StructuredLogOutput['metadata'] = {
    order_id: logEntry.orderId,
  };

  if (logEntry.providerName) metadata.provider_name = logEntry.providerName;
  if (logEntry.errorMessage) metadata.error_message = logEntry.errorMessage;
  if (logEntry.errorType) metadata.error_type = logEntry.errorType;
  if (logEntry.requestPayload) metadata.request_payload = logEntry.requestPayload;
  if (logEntry.responsePayload) metadata.response_payload = logEntry.responsePayload;
  if (logEntry.retryCount !== undefined) metadata.retry_count = logEntry.retryCount;

  return {
    timestamp: logEntry.createdAt,
    correlation_id: logEntry.correlationId,
    step_name: logEntry.stepName,
    status: logEntry.status,
    duration_ms: logEntry.durationMs ?? null,
    metadata,
  };
}

/**
 * Serialize log entry to JSON string
 */
export function toJSONString(
  logEntry: CreateLogInput & { createdAt: string }
): string {
  return JSON.stringify(toStructuredJSON(logEntry));
}

/**
 * Validate that a JSON string conforms to the structured log format
 */
export function isValidStructuredLog(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    return (
      typeof parsed.timestamp === 'string' &&
      typeof parsed.correlation_id === 'string' &&
      typeof parsed.step_name === 'string' &&
      typeof parsed.status === 'string' &&
      (parsed.duration_ms === null || typeof parsed.duration_ms === 'number') &&
      typeof parsed.metadata === 'object' &&
      typeof parsed.metadata.order_id === 'string'
    );
  } catch {
    return false;
  }
}

// =============================================================================
// Automation Logger Class (T047, T053)
// =============================================================================

/**
 * Logger for tracking order processing steps
 *
 * Usage:
 * ```typescript
 * const logger = new AutomationLogger({ orderId, correlationId });
 *
 * const step = logger.step('webhook_received');
 * step.start({ event_type: 'checkout.session.completed' });
 * // ... process webhook
 * step.success({ order_created: true });
 * ```
 */
export class AutomationLogger {
  private readonly config: LoggerConfig;
  private readonly logs: Array<CreateLogInput & { createdAt: string }> = [];
  private persistFn?: (log: Record<string, string | number | null>) => Promise<void>;

  constructor(config: LoggerConfig) {
    validateCorrelationId(config.correlationId);
    this.config = config;
  }

  /**
   * Set persistence function for saving logs to database
   */
  setPersistFunction(
    fn: (log: Record<string, string | number | null>) => Promise<void>
  ): void {
    this.persistFn = fn;
  }

  /**
   * Create a step logger for a specific processing step
   */
  step(stepName: StepName, providerName?: string): StepLogger {
    validateStepName(stepName);

    let startTime: number | undefined;

    const log = async (
      status: LogStatus,
      payload?: Record<string, unknown>,
      error?: { message: string; type?: ErrorType }
    ) => {
      const durationMs = startTime ? Date.now() - startTime : undefined;

      const entry = createLogEntry({
        orderId: this.config.orderId,
        correlationId: this.config.correlationId,
        stepName,
        status,
        providerName,
        requestPayload: status === 'started' ? payload : undefined,
        responsePayload: status !== 'started' ? payload : undefined,
        errorMessage: error?.message,
        errorType: error?.type,
        durationMs,
      });

      this.logs.push(entry);

      // Persist to database if function is set
      if (this.persistFn) {
        await this.persistFn(serializeForPocketBase(entry));
      }
    };

    return {
      start: (payload) => {
        startTime = Date.now();
        log('started', payload);
      },
      success: (payload) => {
        log('success', payload);
      },
      fail: (error, payload) => {
        log('failed', payload, error);
      },
      skip: (reason) => {
        log('skipped', reason ? { reason } : undefined);
      },
    };
  }

  /**
   * Log webhook received
   */
  webhookReceived(payload?: Record<string, unknown>): void {
    const step = this.step('webhook_received');
    step.start(payload);
    step.success();
  }

  /**
   * Log order created
   */
  orderCreated(orderId: string): void {
    const step = this.step('order_created');
    step.start();
    step.success({ order_id: orderId });
  }

  /**
   * Log provider call started
   */
  providerCallStarted(providerName: string, _request?: Record<string, unknown>): StepLogger {
    return this.step('provider_call_started', providerName);
  }

  /**
   * Log failover triggered
   */
  failoverTriggered(fromProvider: string, toProvider: string, reason: string): void {
    const step = this.step('failover_triggered', fromProvider);
    step.start({ from_provider: fromProvider, to_provider: toProvider });
    step.success({ reason });
  }

  /**
   * Log email sent
   */
  emailSent(messageId?: string): void {
    const step = this.step('email_sent');
    step.start();
    step.success({ message_id: messageId });
  }

  /**
   * Log email failed
   */
  emailFailed(error: string): void {
    const step = this.step('email_failed');
    step.start();
    step.fail({ message: error, type: 'provider_error' });
  }

  /**
   * Log order completed
   */
  orderCompleted(providerUsed: string): void {
    const step = this.step('order_completed');
    step.start();
    step.success({ provider_used: providerUsed });
  }

  /**
   * Log order failed
   */
  orderFailed(reason: string, attemptedProviders: string[]): void {
    const step = this.step('order_failed');
    step.start();
    step.fail(
      { message: reason, type: 'provider_error' },
      { attempted_providers: attemptedProviders }
    );
  }

  /**
   * Get all logged entries
   */
  getLogs(): Array<CreateLogInput & { createdAt: string }> {
    return [...this.logs];
  }

  /**
   * Get total duration from first to last log
   */
  getTotalDuration(): number {
    if (this.logs.length < 2) return 0;
    const first = new Date(this.logs[0].createdAt).getTime();
    const last = new Date(this.logs[this.logs.length - 1].createdAt).getTime();
    return last - first;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new automation logger
 */
export function createAutomationLogger(config: LoggerConfig): AutomationLogger {
  return new AutomationLogger(config);
}
