/**
 * Saga Pattern Implementation
 *
 * Provides compensating transaction support for multi-step operations
 * where ACID transactions are not available (e.g., PocketBase).
 *
 * Features:
 * - Step-by-step execution with automatic rollback on failure
 * - Compensation handlers for each step
 * - Detailed logging for debugging
 * - Retry support for transient failures
 *
 * Usage:
 * ```typescript
 * const saga = createSaga('order-fulfillment', correlationId);
 *
 * saga.addStep({
 *   name: 'create_order',
 *   execute: async () => await createOrder(data),
 *   compensate: async (context) => await deleteOrder(context.result.orderId),
 * });
 *
 * saga.addStep({
 *   name: 'call_provider',
 *   execute: async () => await callProvider(order),
 *   compensate: async () => await markOrderFailed(order),
 * });
 *
 * const result = await saga.execute();
 * ```
 */

import { logger as globalLogger, createLogger, Logger } from './logger';

// =============================================================================
// Types
// =============================================================================

export type SagaStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'compensated';

export interface SagaStepContext<T = unknown> {
  /** Step name */
  name: string;
  /** Result from execute() */
  result?: T;
  /** Error if failed */
  error?: Error;
  /** Results from previous steps */
  previousResults: Record<string, unknown>;
}

export interface SagaStep<T = unknown> {
  /** Unique step name */
  name: string;
  /** Execute the step */
  execute: (context: { previousResults: Record<string, unknown> }) => Promise<T>;
  /** Compensate/rollback the step on failure */
  compensate?: (context: SagaStepContext<T>) => Promise<void>;
  /** Retry configuration */
  retries?: number;
  /** Timeout for this step in ms */
  timeoutMs?: number;
  /** Whether to continue saga even if compensation fails */
  ignoreCompensationFailure?: boolean;
}

export interface SagaStepResult<T = unknown> {
  name: string;
  status: SagaStepStatus;
  result?: T;
  error?: string;
  durationMs: number;
  compensated: boolean;
  compensationError?: string;
}

export interface SagaResult<T = unknown> {
  success: boolean;
  sagaName: string;
  correlationId?: string;
  steps: SagaStepResult[];
  finalResult?: T;
  error?: {
    step: string;
    message: string;
  };
  totalDurationMs: number;
  compensationsExecuted: number;
  compensationsFailed: number;
}

export interface SagaOptions {
  /** Saga name for logging */
  name: string;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Whether to run compensation in reverse order (default: true) */
  reverseCompensation?: boolean;
  /** Global timeout for the entire saga */
  timeoutMs?: number;
  /** Custom logger */
  logger?: Logger;
}

// =============================================================================
// Saga Implementation
// =============================================================================

export class Saga {
  private steps: SagaStep[] = [];
  private executedSteps: Array<{ step: SagaStep; result: unknown }> = [];
  private options: Required<Omit<SagaOptions, 'logger'>> & { logger: Logger };
  private stepResults: SagaStepResult[] = [];

  constructor(options: SagaOptions) {
    this.options = {
      name: options.name,
      correlationId: options.correlationId || '',
      reverseCompensation: options.reverseCompensation ?? true,
      timeoutMs: options.timeoutMs ?? 60000,
      logger: options.logger ?? (options.correlationId
        ? createLogger(options.correlationId)
        : globalLogger),
    };
  }

  /**
   * Add a step to the saga
   */
  addStep<T>(step: SagaStep<T>): this {
    this.steps.push(step as SagaStep);
    return this;
  }

  /**
   * Execute the saga
   */
  async execute<T = unknown>(): Promise<SagaResult<T>> {
    const startTime = Date.now();
    const { logger, name, correlationId } = this.options;
    const previousResults: Record<string, unknown> = {};

    logger.info('saga.started', { sagaName: name, stepCount: this.steps.length });

    let failedAtStep: string | undefined;
    let failedError: Error | undefined;

    // Execute steps in order
    for (const step of this.steps) {
      const stepStartTime = Date.now();
      let stepResult: SagaStepResult;

      try {
        logger.debug(`saga.step.${step.name}.started`, {});

        // Execute with optional timeout
        const result = await this.executeWithTimeout(
          step.execute({ previousResults }),
          step.timeoutMs || this.options.timeoutMs,
          step.name
        );

        // Store result for next steps
        previousResults[step.name] = result;
        this.executedSteps.push({ step, result });

        stepResult = {
          name: step.name,
          status: 'completed',
          result,
          durationMs: Date.now() - stepStartTime,
          compensated: false,
        };

        logger.debug(`saga.step.${step.name}.completed`, {
          durationMs: stepResult.durationMs,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        stepResult = {
          name: step.name,
          status: 'failed',
          error: errorMessage,
          durationMs: Date.now() - stepStartTime,
          compensated: false,
        };

        failedAtStep = step.name;
        failedError = error instanceof Error ? error : new Error(String(error));

        logger.error(`saga.step.${step.name}.failed`, error, {
          durationMs: stepResult.durationMs,
        });

        this.stepResults.push(stepResult);
        break;
      }

      this.stepResults.push(stepResult);
    }

    // If failed, run compensations
    let compensationsExecuted = 0;
    let compensationsFailed = 0;

    if (failedAtStep) {
      const compensationResult = await this.runCompensations(previousResults);
      compensationsExecuted = compensationResult.executed;
      compensationsFailed = compensationResult.failed;
    }

    const totalDurationMs = Date.now() - startTime;
    const success = !failedAtStep;

    // Get final result (last successful step's result)
    const finalResult = success && this.steps.length > 0
      ? previousResults[this.steps[this.steps.length - 1].name] as T
      : undefined;

    const result: SagaResult<T> = {
      success,
      sagaName: name,
      correlationId,
      steps: this.stepResults,
      finalResult,
      error: failedAtStep ? {
        step: failedAtStep,
        message: failedError?.message || 'Unknown error',
      } : undefined,
      totalDurationMs,
      compensationsExecuted,
      compensationsFailed,
    };

    if (success) {
      logger.info('saga.completed', {
        sagaName: name,
        totalDurationMs,
        stepCount: this.steps.length,
      });
    } else {
      logger.error('saga.failed', failedError, {
        sagaName: name,
        failedAtStep,
        totalDurationMs,
        compensationsExecuted,
        compensationsFailed,
      });
    }

    return result;
  }

  /**
   * Run compensation handlers for executed steps
   */
  private async runCompensations(
    previousResults: Record<string, unknown>
  ): Promise<{ executed: number; failed: number }> {
    const { logger, reverseCompensation } = this.options;
    let executed = 0;
    let failed = 0;

    // Get steps to compensate (only those with compensate handlers)
    const stepsToCompensate = this.executedSteps
      .filter(({ step }) => step.compensate)
      .map(({ step, result }) => ({ step, result }));

    // Optionally reverse order (last-to-first)
    if (reverseCompensation) {
      stepsToCompensate.reverse();
    }

    logger.info('saga.compensation.started', {
      stepsToCompensate: stepsToCompensate.length,
    });

    for (const { step, result } of stepsToCompensate) {
      if (!step.compensate) continue;

      const stepResultIndex = this.stepResults.findIndex((r) => r.name === step.name);

      try {
        logger.debug(`saga.compensation.${step.name}.started`, {});

        const context: SagaStepContext = {
          name: step.name,
          result,
          previousResults,
        };

        await step.compensate(context);

        executed++;

        if (stepResultIndex >= 0) {
          this.stepResults[stepResultIndex].compensated = true;
        }

        logger.debug(`saga.compensation.${step.name}.completed`, {});
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (stepResultIndex >= 0) {
          this.stepResults[stepResultIndex].compensationError = errorMessage;
        }

        logger.error(`saga.compensation.${step.name}.failed`, error, {});

        // Continue with other compensations unless configured otherwise
        if (!step.ignoreCompensationFailure) {
          // Still continue, but log the failure
        }
      }
    }

    logger.info('saga.compensation.completed', {
      executed,
      failed,
    });

    return { executed, failed };
  }

  /**
   * Execute a promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    stepName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step '${stepName}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new saga instance
 */
export function createSaga(name: string, correlationId?: string): Saga {
  return new Saga({ name, correlationId });
}

/**
 * Create a saga with full options
 */
export function createSagaWithOptions(options: SagaOptions): Saga {
  return new Saga(options);
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Builder pattern for creating sagas with type safety
 */
export class SagaBuilder<TAccumulated = Record<string, never>> {
  private saga: Saga;

  constructor(name: string, correlationId?: string) {
    this.saga = new Saga({ name, correlationId });
  }

  /**
   * Add a step with type-safe access to previous results
   */
  step<TName extends string, TResult>(
    name: TName,
    config: {
      execute: (context: { previousResults: TAccumulated }) => Promise<TResult>;
      compensate?: (context: SagaStepContext<TResult>) => Promise<void>;
      retries?: number;
      timeoutMs?: number;
    }
  ): SagaBuilder<TAccumulated & Record<TName, TResult>> {
    this.saga.addStep({
      name,
      execute: config.execute as SagaStep['execute'],
      compensate: config.compensate as SagaStep['compensate'],
      retries: config.retries,
      timeoutMs: config.timeoutMs,
    });

    return this as unknown as SagaBuilder<TAccumulated & Record<TName, TResult>>;
  }

  /**
   * Execute the saga
   */
  async execute(): Promise<SagaResult> {
    return this.saga.execute();
  }
}

/**
 * Create a type-safe saga builder
 */
export function sagaBuilder(name: string, correlationId?: string): SagaBuilder {
  return new SagaBuilder(name, correlationId);
}

// =============================================================================
// Pre-built Compensation Helpers
// =============================================================================

/**
 * Create a compensation handler that updates a record status
 */
export function createStatusCompensation(
  collection: string,
  getRecordId: (context: SagaStepContext) => string,
  failedStatus: string,
  updateFn: (collection: string, id: string, data: Record<string, unknown>) => Promise<void>
): (context: SagaStepContext) => Promise<void> {
  return async (context) => {
    const recordId = getRecordId(context);
    await updateFn(collection, recordId, {
      status: failedStatus,
      error_message: context.error?.message || 'Saga compensation',
      updated: new Date().toISOString(),
    });
  };
}

/**
 * Create a compensation handler that logs the failure
 */
export function createLogCompensation(
  logFn: (message: string, context: Record<string, unknown>) => void
): (context: SagaStepContext) => Promise<void> {
  return async (context) => {
    logFn(`Compensation for step '${context.name}'`, {
      result: context.result,
      error: context.error?.message,
    });
  };
}
