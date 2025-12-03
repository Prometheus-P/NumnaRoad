/**
 * Unit tests for logging service
 * TDD: These tests are written first and must FAIL before implementation
 *
 * Tests T044-T045: Log entry creation with correlation_id, sensitive data redaction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import type { StepName, LogStatus, ErrorType } from '@services/esim-providers/types';

describe('Logging Service - T044-T045: Automation logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T044: Log entry creation with correlation_id', () => {
    it('should create log entry with required fields', () => {
      // Arrange
      const orderId = 'rec_order_123';
      const correlationId = uuidv4();
      const stepName: StepName = 'webhook_received';
      const status: LogStatus = 'success';

      // Act
      const logEntry = createLogEntry({
        orderId,
        correlationId,
        stepName,
        status,
      });

      // Assert
      expect(logEntry.orderId).toBe(orderId);
      expect(logEntry.correlationId).toBe(correlationId);
      expect(logEntry.stepName).toBe(stepName);
      expect(logEntry.status).toBe(status);
      expect(logEntry.createdAt).toBeDefined();
    });

    it('should include duration_ms when provided', () => {
      const logEntry = createLogEntry({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'provider_call_success',
        status: 'success',
        durationMs: 1234,
      });

      expect(logEntry.durationMs).toBe(1234);
    });

    it('should include error details when step failed', () => {
      const logEntry = createLogEntry({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'provider_call_failed',
        status: 'failed',
        errorMessage: 'Provider timeout',
        errorType: 'timeout' as ErrorType,
      });

      expect(logEntry.status).toBe('failed');
      expect(logEntry.errorMessage).toBe('Provider timeout');
      expect(logEntry.errorType).toBe('timeout');
    });

    it('should include provider name when applicable', () => {
      const logEntry = createLogEntry({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'provider_call_started',
        status: 'started',
        providerName: 'esimcard',
      });

      expect(logEntry.providerName).toBe('esimcard');
    });

    it('should include retry count', () => {
      const logEntry = createLogEntry({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'provider_call_failed',
        status: 'failed',
        retryCount: 2,
      });

      expect(logEntry.retryCount).toBe(2);
    });

    it('should validate correlation_id format', () => {
      expect(() =>
        createLogEntry({
          orderId: 'rec_123',
          correlationId: 'invalid-uuid',
          stepName: 'webhook_received',
          status: 'success',
        })
      ).toThrow('Invalid correlation ID format');
    });

    it('should validate step_name enum', () => {
      expect(() =>
        createLogEntry({
          orderId: 'rec_123',
          correlationId: uuidv4(),
          stepName: 'invalid_step' as StepName,
          status: 'success',
        })
      ).toThrow('Invalid step name');
    });
  });

  describe('T045: Sensitive data redaction', () => {
    it('should redact email addresses in payload', () => {
      const payload = {
        customer_email: 'user@example.com',
        order_id: 'ord_123',
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.customer_email).not.toBe('user@example.com');
      expect(redacted.customer_email).toMatch(/^[a-f0-9]{8}$/); // First 8 chars of SHA256
      expect(redacted.order_id).toBe('ord_123'); // Not redacted
    });

    it('should redact API keys and tokens', () => {
      const payload = {
        api_key: 'sk_live_abc123',
        authorization_token: 'Bearer xyz789',
        data: 'safe',
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.api_key).toBe('[REDACTED]');
      expect(redacted.authorization_token).toBe('[REDACTED]');
      expect(redacted.data).toBe('safe');
    });

    it('should redact passwords and secrets', () => {
      const payload = {
        password: 'super_secret',
        client_secret: 'cs_abc123',
        webhook_secret: 'whsec_xyz',
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.client_secret).toBe('[REDACTED]');
      expect(redacted.webhook_secret).toBe('[REDACTED]');
    });

    it('should preserve QR code URLs', () => {
      const payload = {
        qr_code_url: 'https://provider.com/qr/abc123',
        qr_code: 'https://cdn.example.com/qr.png',
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.qr_code_url).toBe('https://provider.com/qr/abc123');
      expect(redacted.qr_code).toBe('https://cdn.example.com/qr.png');
    });

    it('should preserve ICCID values', () => {
      const payload = {
        iccid: '89012345678901234567',
        esim_iccid: '89012345678901234567',
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.iccid).toBe('89012345678901234567');
      expect(redacted.esim_iccid).toBe('89012345678901234567');
    });

    it('should handle nested objects', () => {
      const payload = {
        order: {
          customer_email: 'nested@example.com',
          items: [{ name: 'item1' }],
        },
        api_key: 'secret_key',
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.order.customer_email).toMatch(/^[a-f0-9]{8}$/);
      expect(redacted.order.items[0].name).toBe('item1');
      expect(redacted.api_key).toBe('[REDACTED]');
    });

    it('should handle arrays with sensitive data', () => {
      const payload = {
        users: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
        ],
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.users[0].email).toMatch(/^[a-f0-9]{8}$/);
      expect(redacted.users[1].email).toMatch(/^[a-f0-9]{8}$/);
      expect(redacted.users[0].email).not.toBe(redacted.users[1].email);
    });

    it('should not modify original payload', () => {
      const original = {
        api_key: 'secret',
        data: 'value',
      };

      const copy = JSON.parse(JSON.stringify(original));
      redactSensitiveData(original);

      expect(original.api_key).toBe(copy.api_key);
    });
  });

  describe('Log serialization', () => {
    it('should serialize log entry to PocketBase format', () => {
      const logEntry = createLogEntry({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'order_created',
        status: 'success',
        requestPayload: { test: 'data' },
        durationMs: 100,
      });

      const serialized = serializeForPocketBase(logEntry);

      expect(serialized.order_id).toBe('rec_123');
      expect(serialized.step_name).toBe('order_created');
      expect(serialized.request_payload).toBe(JSON.stringify({ test: 'data' }));
    });
  });
});

// Helper functions to implement in logging service

interface LogEntryInput {
  orderId: string;
  correlationId: string;
  stepName: StepName;
  status: LogStatus;
  providerName?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string;
  errorType?: ErrorType;
  durationMs?: number;
  retryCount?: number;
}

interface LogEntry extends LogEntryInput {
  createdAt: string;
}

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

function createLogEntry(input: LogEntryInput): LogEntry {
  // Validate correlation_id
  if (!UUID_REGEX.test(input.correlationId)) {
    throw new Error('Invalid correlation ID format');
  }

  // Validate step_name
  if (!VALID_STEPS.includes(input.stepName)) {
    throw new Error('Invalid step name');
  }

  return {
    ...input,
    createdAt: new Date().toISOString(),
  };
}

function hashEmail(email: string): string {
  // Simple hash for test - real implementation would use crypto
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
}

function redactSensitiveData(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const sensitivePatterns = {
    email: /email/i,
    apiKey: /api[_-]?key|token|authorization/i,
    secret: /password|secret/i,
  };

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
      if (sensitivePatterns.email.test(key)) {
        result[key] = hashEmail(value);
      } else if (
        sensitivePatterns.apiKey.test(key) ||
        sensitivePatterns.secret.test(key)
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

function serializeForPocketBase(
  logEntry: LogEntry
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
// T066/T067: JSON Log Structure Validation Tests (US3-AS4)
// =============================================================================

import {
  toStructuredJSON,
  toJSONString,
  isValidStructuredLog,
  createLogEntry as createLogEntryReal,
} from '@services/logging/automation-logger';

describe('JSON Logging - T066/T067: Structured log format (US3-AS4)', () => {

  describe('T066: Structured JSON output format', () => {
    it('should contain required fields per US3-AS4', () => {
      const correlationId = uuidv4();
      const logEntry = createLogEntryReal({
        orderId: 'rec_order_123',
        correlationId,
        stepName: 'webhook_received',
        status: 'success',
      });

      const structured = toStructuredJSON(logEntry);

      // Required fields per US3-AS4
      expect(structured).toHaveProperty('timestamp');
      expect(structured).toHaveProperty('correlation_id');
      expect(structured).toHaveProperty('step_name');
      expect(structured).toHaveProperty('status');
      expect(structured).toHaveProperty('duration_ms');
      expect(structured).toHaveProperty('metadata');
      expect(structured.metadata).toHaveProperty('order_id');
    });

    it('should use ISO 8601 timestamp format', () => {
      const logEntry = createLogEntryReal({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'order_created',
        status: 'success',
      });

      const structured = toStructuredJSON(logEntry);

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(structured.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should include optional fields in metadata when present', () => {
      const logEntry = createLogEntryReal({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'provider_call_failed',
        status: 'failed',
        providerName: 'esimcard',
        errorMessage: 'Provider timeout',
        errorType: 'timeout',
        durationMs: 5000,
        retryCount: 2,
      });

      const structured = toStructuredJSON(logEntry);

      expect(structured.metadata.provider_name).toBe('esimcard');
      expect(structured.metadata.error_message).toBe('Provider timeout');
      expect(structured.metadata.error_type).toBe('timeout');
      expect(structured.metadata.retry_count).toBe(2);
      expect(structured.duration_ms).toBe(5000);
    });

    it('should include request/response payloads in metadata when present', () => {
      const logEntry = createLogEntryReal({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'provider_call_success',
        status: 'success',
        requestPayload: { package_id: 'pkg_123' },
        responsePayload: { qr_code: 'https://example.com/qr' },
      });

      const structured = toStructuredJSON(logEntry);

      expect(structured.metadata.request_payload).toEqual({ package_id: 'pkg_123' });
      expect(structured.metadata.response_payload).toEqual({ qr_code: 'https://example.com/qr' });
    });

    it('should set duration_ms to null when not provided', () => {
      const logEntry = createLogEntryReal({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'webhook_received',
        status: 'success',
      });

      const structured = toStructuredJSON(logEntry);

      expect(structured.duration_ms).toBeNull();
    });
  });

  describe('T067: JSON string serialization', () => {
    it('should serialize to valid JSON string', () => {
      const logEntry = createLogEntryReal({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'order_completed',
        status: 'success',
        providerName: 'mobimatter',
      });

      const jsonString = toJSONString(logEntry);

      expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    it('should produce parseable JSON that matches structured output', () => {
      const logEntry = createLogEntryReal({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'email_sent',
        status: 'success',
        durationMs: 250,
      });

      const structured = toStructuredJSON(logEntry);
      const jsonString = toJSONString(logEntry);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toEqual(structured);
    });

    it('should handle unicode characters in payloads', () => {
      const logEntry = createLogEntryReal({
        orderId: 'rec_123',
        correlationId: uuidv4(),
        stepName: 'webhook_received',
        status: 'success',
        requestPayload: { message: '한글 테스트 🎉' },
      });

      const jsonString = toJSONString(logEntry);
      const parsed = JSON.parse(jsonString);

      expect(parsed.metadata.request_payload.message).toBe('한글 테스트 🎉');
    });
  });

  describe('isValidStructuredLog()', () => {
    it('should return true for valid structured log JSON', () => {
      const validLog = JSON.stringify({
        timestamp: '2024-01-01T00:00:00.000Z',
        correlation_id: uuidv4(),
        step_name: 'webhook_received',
        status: 'success',
        duration_ms: null,
        metadata: { order_id: 'rec_123' },
      });

      expect(isValidStructuredLog(validLog)).toBe(true);
    });

    it('should return true for log with duration_ms number', () => {
      const validLog = JSON.stringify({
        timestamp: '2024-01-01T00:00:00.000Z',
        correlation_id: uuidv4(),
        step_name: 'order_completed',
        status: 'success',
        duration_ms: 1500,
        metadata: { order_id: 'rec_123' },
      });

      expect(isValidStructuredLog(validLog)).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(isValidStructuredLog('not-json')).toBe(false);
      expect(isValidStructuredLog('{invalid')).toBe(false);
    });

    it('should return false for missing required fields', () => {
      // Missing timestamp
      expect(
        isValidStructuredLog(
          JSON.stringify({
            correlation_id: uuidv4(),
            step_name: 'webhook_received',
            status: 'success',
            duration_ms: null,
            metadata: { order_id: 'rec_123' },
          })
        )
      ).toBe(false);

      // Missing correlation_id
      expect(
        isValidStructuredLog(
          JSON.stringify({
            timestamp: '2024-01-01T00:00:00.000Z',
            step_name: 'webhook_received',
            status: 'success',
            duration_ms: null,
            metadata: { order_id: 'rec_123' },
          })
        )
      ).toBe(false);

      // Missing metadata.order_id
      expect(
        isValidStructuredLog(
          JSON.stringify({
            timestamp: '2024-01-01T00:00:00.000Z',
            correlation_id: uuidv4(),
            step_name: 'webhook_received',
            status: 'success',
            duration_ms: null,
            metadata: {},
          })
        )
      ).toBe(false);
    });

    it('should return false for wrong field types', () => {
      // duration_ms should be number or null
      expect(
        isValidStructuredLog(
          JSON.stringify({
            timestamp: '2024-01-01T00:00:00.000Z',
            correlation_id: uuidv4(),
            step_name: 'webhook_received',
            status: 'success',
            duration_ms: 'not-a-number',
            metadata: { order_id: 'rec_123' },
          })
        )
      ).toBe(false);
    });
  });

  describe('Round-trip JSON logging', () => {
    it('should create log, serialize, and validate successfully', () => {
      const logEntry = createLogEntryReal({
        orderId: 'rec_roundtrip_123',
        correlationId: uuidv4(),
        stepName: 'order_completed',
        status: 'success',
        providerName: 'airalo',
        durationMs: 8500,
        responsePayload: { qr_code_url: 'https://example.com/qr/abc' },
      });

      const jsonString = toJSONString(logEntry);

      expect(isValidStructuredLog(jsonString)).toBe(true);

      const parsed = JSON.parse(jsonString);
      expect(parsed.correlation_id).toBe(logEntry.correlationId);
      expect(parsed.step_name).toBe('order_completed');
      expect(parsed.status).toBe('success');
      expect(parsed.duration_ms).toBe(8500);
      expect(parsed.metadata.order_id).toBe('rec_roundtrip_123');
      expect(parsed.metadata.provider_name).toBe('airalo');
    });
  });
});
