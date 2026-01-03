/**
 * Distributed Tracing Module
 *
 * Provides request-scoped tracing with correlation ID propagation
 * and span-based timing for observability.
 *
 * Features:
 * - Automatic correlation ID generation and propagation
 * - Span-based timing for service calls
 * - Integration with structured logger
 * - HTTP header propagation (X-Correlation-ID)
 *
 * Usage:
 * ```typescript
 * import { withTracing, createSpan } from '@/lib/tracing';
 *
 * // In API route
 * export const POST = withTracing(async (request, trace) => {
 *   const span = trace.startSpan('provider_call');
 *   try {
 *     const result = await callProvider();
 *     span.success({ provider: 'airalo' });
 *     return NextResponse.json(result);
 *   } catch (error) {
 *     span.fail(error);
 *     throw error;
 *   }
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, Logger } from './logger';

// =============================================================================
// Types
// =============================================================================

export interface Span {
  /** Span name/operation */
  name: string;
  /** Span ID */
  spanId: string;
  /** Parent span ID (if nested) */
  parentSpanId?: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime?: number;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Status */
  status: 'running' | 'success' | 'failed';
  /** Error if failed */
  error?: string;
  /** Additional attributes */
  attributes: Record<string, unknown>;
}

export interface SpanHandle {
  /** Mark span as successful */
  success: (attributes?: Record<string, unknown>) => void;
  /** Mark span as failed */
  fail: (error: Error | unknown, attributes?: Record<string, unknown>) => void;
  /** Add attributes to span */
  addAttribute: (key: string, value: unknown) => void;
  /** Create a child span */
  startChildSpan: (name: string) => SpanHandle;
  /** Get span ID */
  getSpanId: () => string;
}

export interface TraceContext {
  /** Correlation ID for the request */
  correlationId: string;
  /** Logger with correlation ID */
  logger: Logger;
  /** Start a new span */
  startSpan: (name: string, attributes?: Record<string, unknown>) => SpanHandle;
  /** Get all completed spans */
  getSpans: () => Span[];
  /** Get trace summary */
  getSummary: () => TraceSummary;
}

export interface TraceSummary {
  correlationId: string;
  totalSpans: number;
  successSpans: number;
  failedSpans: number;
  totalDurationMs: number;
  spans: Array<{
    name: string;
    durationMs: number;
    status: string;
  }>;
}

// =============================================================================
// Constants
// =============================================================================

/** HTTP header for correlation ID */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/** HTTP header for parent span */
export const SPAN_ID_HEADER = 'x-span-id';

// =============================================================================
// Correlation ID Functions
// =============================================================================

/**
 * Generate a new correlation ID.
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Extract correlation ID from request headers or generate new one.
 */
export function getOrCreateCorrelationId(request: NextRequest): string {
  const existing = request.headers.get(CORRELATION_ID_HEADER);
  return existing || generateCorrelationId();
}

/**
 * Add correlation ID header to outgoing request.
 */
export function addCorrelationIdHeader(
  headers: Headers | Record<string, string>,
  correlationId: string
): void {
  if (headers instanceof Headers) {
    headers.set(CORRELATION_ID_HEADER, correlationId);
  } else {
    headers[CORRELATION_ID_HEADER] = correlationId;
  }
}

// =============================================================================
// Span Implementation
// =============================================================================

/**
 * Create a span handle for tracking an operation.
 */
function createSpanHandle(
  span: Span,
  logger: Logger,
  onComplete: (span: Span) => void,
  createChild: (name: string, parentSpanId: string) => SpanHandle
): SpanHandle {
  return {
    success(attributes?: Record<string, unknown>): void {
      if (span.status !== 'running') return;

      span.endTime = Date.now();
      span.durationMs = span.endTime - span.startTime;
      span.status = 'success';

      if (attributes) {
        Object.assign(span.attributes, attributes);
      }

      logger.debug(`span.${span.name}.completed`, {
        spanId: span.spanId,
        durationMs: span.durationMs,
        ...span.attributes,
      });

      onComplete(span);
    },

    fail(error: Error | unknown, attributes?: Record<string, unknown>): void {
      if (span.status !== 'running') return;

      span.endTime = Date.now();
      span.durationMs = span.endTime - span.startTime;
      span.status = 'failed';
      span.error = error instanceof Error ? error.message : String(error);

      if (attributes) {
        Object.assign(span.attributes, attributes);
      }

      logger.error(`span.${span.name}.failed`, error, {
        spanId: span.spanId,
        durationMs: span.durationMs,
        ...span.attributes,
      });

      onComplete(span);
    },

    addAttribute(key: string, value: unknown): void {
      span.attributes[key] = value;
    },

    startChildSpan(name: string): SpanHandle {
      return createChild(name, span.spanId);
    },

    getSpanId(): string {
      return span.spanId;
    },
  };
}

// =============================================================================
// Trace Context Implementation
// =============================================================================

/**
 * Create a trace context for a request.
 */
export function createTraceContext(correlationId: string): TraceContext {
  const logger = createLogger(correlationId);
  const spans: Span[] = [];

  function createSpan(
    name: string,
    parentSpanId?: string,
    attributes?: Record<string, unknown>
  ): SpanHandle {
    const span: Span = {
      name,
      spanId: uuidv4().slice(0, 8),
      parentSpanId,
      startTime: Date.now(),
      status: 'running',
      attributes: attributes || {},
    };

    logger.debug(`span.${name}.started`, {
      spanId: span.spanId,
      parentSpanId,
      ...span.attributes,
    });

    const onComplete = (completedSpan: Span) => {
      spans.push(completedSpan);
    };

    const createChild = (childName: string, parentId: string) => {
      return createSpan(childName, parentId);
    };

    return createSpanHandle(span, logger, onComplete, createChild);
  }

  return {
    correlationId,
    logger,

    startSpan(name: string, attributes?: Record<string, unknown>): SpanHandle {
      return createSpan(name, undefined, attributes);
    },

    getSpans(): Span[] {
      return [...spans];
    },

    getSummary(): TraceSummary {
      const successSpans = spans.filter((s) => s.status === 'success').length;
      const failedSpans = spans.filter((s) => s.status === 'failed').length;
      const totalDurationMs = spans.reduce((sum, s) => sum + (s.durationMs || 0), 0);

      return {
        correlationId,
        totalSpans: spans.length,
        successSpans,
        failedSpans,
        totalDurationMs,
        spans: spans.map((s) => ({
          name: s.name,
          durationMs: s.durationMs || 0,
          status: s.status,
        })),
      };
    },
  };
}

// =============================================================================
// Middleware/HOF Wrapper
// =============================================================================

type TracedHandler = (
  request: NextRequest,
  trace: TraceContext
) => Promise<NextResponse>;

/**
 * Wrap a request handler with tracing.
 *
 * @example
 * ```typescript
 * export const POST = withTracing(async (request, trace) => {
 *   trace.logger.info('processing_request');
 *
 *   const span = trace.startSpan('database_query');
 *   const result = await db.query();
 *   span.success({ rows: result.length });
 *
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withTracing(handler: TracedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const correlationId = getOrCreateCorrelationId(request);
    const trace = createTraceContext(correlationId);

    // Create root span for the request
    const rootSpan = trace.startSpan('request', {
      method: request.method,
      path: request.nextUrl.pathname,
    });

    try {
      const response = await handler(request, trace);

      rootSpan.success({
        status: response.status,
      });

      // Add correlation ID to response headers
      response.headers.set(CORRELATION_ID_HEADER, correlationId);

      // Log trace summary
      const summary = trace.getSummary();
      if (summary.failedSpans > 0) {
        trace.logger.warn('request.completed_with_errors', {
          summary,
        });
      }

      return response;
    } catch (error) {
      rootSpan.fail(error);

      // Log trace summary
      trace.logger.error('request.failed', error, {
        summary: trace.getSummary(),
      });

      throw error;
    }
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a fetch wrapper that propagates correlation ID.
 */
export function createTracedFetch(trace: TraceContext) {
  return async (
    url: string | URL,
    init?: RequestInit & { spanName?: string }
  ): Promise<Response> => {
    const spanName = init?.spanName || 'http_request';
    const span = trace.startSpan(spanName, {
      url: url.toString(),
      method: init?.method || 'GET',
    });

    // Add correlation ID header
    const headers = new Headers(init?.headers);
    headers.set(CORRELATION_ID_HEADER, trace.correlationId);

    try {
      const response = await fetch(url, {
        ...init,
        headers,
      });

      span.success({
        status: response.status,
        ok: response.ok,
      });

      return response;
    } catch (error) {
      span.fail(error);
      throw error;
    }
  };
}

/**
 * Wrap an async function with a span.
 */
export async function withSpan<T>(
  trace: TraceContext,
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, unknown>
): Promise<T> {
  const span = trace.startSpan(name, attributes);

  try {
    const result = await fn();
    span.success();
    return result;
  } catch (error) {
    span.fail(error);
    throw error;
  }
}

// =============================================================================
// AsyncLocalStorage for Request Context (optional enhancement)
// =============================================================================

// Note: For more advanced use cases, consider using AsyncLocalStorage
// to propagate trace context without explicit parameter passing.
// This would allow accessing trace context anywhere in the call stack.
//
// Example:
// import { AsyncLocalStorage } from 'async_hooks';
// const traceStorage = new AsyncLocalStorage<TraceContext>();
// export function getTrace(): TraceContext | undefined {
//   return traceStorage.getStore();
// }
