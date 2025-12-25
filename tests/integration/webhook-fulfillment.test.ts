/**
 * Webhook Fulfillment Integration Tests
 *
 * Tests for the inline fulfillment flow in the Stripe webhook handler.
 * Covers: happy path, failover, all-fail scenarios, and timeout handling.
 *
 * Tasks: Phase 3 - Task 4.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import type {
  FulfillmentOrder,
  FulfillmentResult,
  OrderState,
} from '../../services/order-fulfillment/types';
import {
  FulfillmentService,
  createFulfillmentService,
  fulfillWithTimeout,
  isTimeoutResult,
  type TimeoutResult,
} from '../../services/order-fulfillment';
import type { EsimProvider, EsimPurchaseResult } from '../../services/esim-providers/types';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the provider factory
vi.mock('../../services/esim-providers', async () => {
  const actual = await vi.importActual('../../services/esim-providers');
  return {
    ...actual,
    purchaseWithFailover: vi.fn(),
  };
});

// Mock Discord notifications (both index and direct module)
vi.mock('../../services/notifications', () => ({
  notifyOrderFailure: vi.fn().mockResolvedValue(undefined),
  notifyManualFulfillmentRequired: vi.fn().mockResolvedValue(undefined),
  isDiscordConfigured: vi.fn().mockReturnValue(true),
}));

// Also mock the direct discord-notifier import for ManualProvider
vi.mock('../../services/notifications/discord-notifier', () => ({
  notifyOrderFailure: vi.fn().mockResolvedValue(undefined),
  notifyManualFulfillmentRequired: vi.fn().mockResolvedValue(undefined),
  isDiscordConfigured: vi.fn().mockReturnValue(true),
  notifyProviderHealth: vi.fn().mockResolvedValue(undefined),
  notifyCircuitBreakerStateChange: vi.fn().mockResolvedValue(undefined),
  notifyCustom: vi.fn().mockResolvedValue(undefined),
  testWebhookConnection: vi.fn().mockResolvedValue(true),
}));

// Import mocked modules
import { purchaseWithFailover } from '../../services/esim-providers';
import {
  notifyOrderFailure,
  notifyManualFulfillmentRequired,
  isDiscordConfigured,
} from '../../services/notifications';

const mockPurchaseWithFailover = vi.mocked(purchaseWithFailover);
const mockNotifyOrderFailure = vi.mocked(notifyOrderFailure);
const mockNotifyManualFulfillmentRequired = vi.mocked(notifyManualFulfillmentRequired);
const mockIsDiscordConfigured = vi.mocked(isDiscordConfigured);

// =============================================================================
// Test Utilities
// =============================================================================

function createTestOrder(overrides?: Partial<FulfillmentOrder>): FulfillmentOrder {
  return {
    id: `rec_${uuidv4().slice(0, 8)}`,
    orderId: `NR-${Date.now()}-TEST`,
    customerEmail: 'test@example.com',
    productId: 'prod_test_123',
    providerSku: 'test_japan_5gb',
    amount: 2500,
    currency: 'USD',
    status: 'payment_received',
    correlationId: uuidv4(),
    stripePaymentIntent: `pi_test_${uuidv4().slice(0, 8)}`,
    ...overrides,
  };
}

function createTestProviders(): EsimProvider[] {
  return [
    {
      id: 'prov_airalo',
      name: 'Airalo',
      slug: 'airalo',
      priority: 1,
      apiEndpoint: 'https://api.airalo.com/v2',
      apiKeyEnvVar: 'AIRALO_API_KEY',
      timeoutMs: 10000,
      maxRetries: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prov_esimcard',
      name: 'eSIMCard',
      slug: 'esimcard',
      priority: 2,
      apiEndpoint: 'https://api.esimcard.com/v1',
      apiKeyEnvVar: 'ESIM_CARD_API_KEY',
      timeoutMs: 10000,
      maxRetries: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prov_mobimatter',
      name: 'MobiMatter',
      slug: 'mobimatter',
      priority: 3,
      apiEndpoint: 'https://api.mobimatter.com/v1',
      apiKeyEnvVar: 'MOBIMATTER_API_KEY',
      timeoutMs: 10000,
      maxRetries: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// =============================================================================
// Tests
// =============================================================================

describe('Webhook Fulfillment Integration', () => {
  let stateStore: Map<string, OrderState>;
  let metadataStore: Map<string, Record<string, unknown>>;
  let service: FulfillmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset stores
    stateStore = new Map();
    metadataStore = new Map();

    // Create service with mock persistence
    service = createFulfillmentService({
      persistFn: async (orderId, state, metadata) => {
        stateStore.set(orderId, state);
        if (metadata) {
          const existing = metadataStore.get(orderId) || {};
          metadataStore.set(orderId, { ...existing, ...metadata });
        }
      },
      loadFn: async (orderId) => {
        return stateStore.get(orderId) || 'payment_received';
      },
      emailFn: async (params) => {
        return { success: true, messageId: `msg_${uuidv4().slice(0, 8)}` };
      },
      config: {
        webhookTimeoutMs: 25000,
        providerTimeoutMs: 10000,
        maxRetries: 3,
        enableEmailNotification: true,
        enableDiscordAlerts: true,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // Happy Path: Primary Provider Success
  // ===========================================================================

  describe('Happy path: Primary provider success', () => {
    it('should complete fulfillment when primary provider succeeds', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      mockPurchaseWithFailover.mockResolvedValue({
        success: true,
        qrCodeUrl: 'https://provider.com/qr/test123',
        iccid: '89012345678901234567',
        activationCode: 'LPA:1$provider.com$CODE123',
        providerOrderId: 'prov_order_123',
        providerUsed: 'airalo',
        directAppleInstallationUrl: 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=...',
        attemptedProviders: ['airalo'],
        failureReasons: {},
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(true);
      expect(result.finalState).toBe('delivered');
      expect(result.providerUsed).toBe('airalo');
      expect(result.esimData).toBeDefined();
      expect(result.esimData?.qrCodeUrl).toBe('https://provider.com/qr/test123');
      expect(result.esimData?.iccid).toBe('89012345678901234567');
      expect(result.emailSent).toBe(true);
      expect(result.emailMessageId).toBeDefined();
    });

    it('should transition through correct states: payment_received -> fulfillment_started -> provider_confirmed -> email_sent -> delivered', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();
      const stateTransitions: OrderState[] = [];

      const trackingService = createFulfillmentService({
        persistFn: async (orderId, state) => {
          stateTransitions.push(state);
          stateStore.set(orderId, state);
        },
        loadFn: async (orderId) => stateStore.get(orderId) || 'payment_received',
        emailFn: async () => ({ success: true, messageId: 'msg_test' }),
        config: {
          webhookTimeoutMs: 25000,
          providerTimeoutMs: 10000,
          maxRetries: 3,
          enableEmailNotification: true,
          enableDiscordAlerts: true,
        },
      });

      mockPurchaseWithFailover.mockResolvedValue({
        success: true,
        qrCodeUrl: 'https://provider.com/qr/states',
        iccid: '89012345678901234567',
        providerOrderId: 'prov_states_123',
        providerUsed: 'airalo',
        attemptedProviders: ['airalo'],
        failureReasons: {},
      });

      // Act
      const resultPromise = trackingService.fulfill(order, providers);
      await vi.runAllTimersAsync();
      await resultPromise;

      // Assert - verify state transition order
      expect(stateTransitions).toContain('fulfillment_started');
      expect(stateTransitions).toContain('provider_confirmed');
      expect(stateTransitions).toContain('email_sent');
      expect(stateTransitions).toContain('delivered');

      // Verify order of transitions
      const startedIdx = stateTransitions.indexOf('fulfillment_started');
      const confirmedIdx = stateTransitions.indexOf('provider_confirmed');
      const emailIdx = stateTransitions.indexOf('email_sent');
      const deliveredIdx = stateTransitions.indexOf('delivered');

      expect(startedIdx).toBeLessThan(confirmedIdx);
      expect(confirmedIdx).toBeLessThan(emailIdx);
      expect(emailIdx).toBeLessThan(deliveredIdx);
    });

    it('should store eSIM data in order metadata', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();
      const expectedQrUrl = 'https://provider.com/qr/metadata_test';
      const expectedIccid = '89012345678901234567';
      const expectedActivationCode = 'LPA:1$provider.com$METADATA';

      mockPurchaseWithFailover.mockResolvedValue({
        success: true,
        qrCodeUrl: expectedQrUrl,
        iccid: expectedIccid,
        activationCode: expectedActivationCode,
        providerOrderId: 'prov_meta_123',
        providerUsed: 'airalo',
        attemptedProviders: ['airalo'],
        failureReasons: {},
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      await resultPromise;

      // Assert
      const storedMetadata = metadataStore.get(order.id);
      expect(storedMetadata).toBeDefined();
      expect(storedMetadata?.qrCodeUrl).toBe(expectedQrUrl);
      expect(storedMetadata?.iccid).toBe(expectedIccid);
      expect(storedMetadata?.activationCode).toBe(expectedActivationCode);
    });

    it('should track total duration', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      mockPurchaseWithFailover.mockImplementation(async () => {
        // Simulate 500ms provider response
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          success: true,
          qrCodeUrl: 'https://provider.com/qr/duration',
          iccid: '89012345678901234567',
          providerOrderId: 'prov_dur_123',
          providerUsed: 'airalo',
          attemptedProviders: ['airalo'],
          failureReasons: {},
        };
      });

      // Act
      vi.useRealTimers(); // Use real timers for duration tracking
      const result = await service.fulfill(order, providers);

      // Assert
      expect(result.totalDurationMs).toBeDefined();
      expect(result.totalDurationMs).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Failover: Primary Fails → Secondary Succeeds
  // ===========================================================================

  describe('Failover: Primary fails → Secondary succeeds', () => {
    it('should failover to secondary provider when primary fails', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      mockPurchaseWithFailover.mockResolvedValue({
        success: true,
        qrCodeUrl: 'https://secondary.com/qr/failover',
        iccid: '89012345678901234568',
        providerOrderId: 'sec_failover_123',
        providerUsed: 'esimcard', // Secondary provider
        attemptedProviders: ['airalo', 'esimcard'],
        failureReasons: {
          airalo: 'Service temporarily unavailable',
        },
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(true);
      expect(result.providerUsed).toBe('esimcard');
      expect(result.attempts.length).toBeGreaterThan(0);
    });

    it('should record all provider attempts', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();
      let onFailoverCalled = false;

      mockPurchaseWithFailover.mockImplementation(async (provs, req, opts) => {
        // Simulate failover callback
        if (opts?.onFailover) {
          onFailoverCalled = true;
          opts.onFailover({
            fromProvider: 'airalo',
            toProvider: 'esimcard',
            reason: 'timeout',
          });
        }
        return {
          success: true,
          qrCodeUrl: 'https://secondary.com/qr/attempts',
          iccid: '89012345678901234569',
          providerOrderId: 'sec_attempts_123',
          providerUsed: 'esimcard',
          attemptedProviders: ['airalo', 'esimcard'],
          failureReasons: {
            airalo: 'Request timed out',
          },
        };
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(true);
      expect(onFailoverCalled).toBe(true);
      expect(result.attempts.length).toBeGreaterThan(0);
      expect(result.attempts.some((a) => a.providerName === 'airalo')).toBe(true);
    });

    it('should complete order even after multiple failovers', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      mockPurchaseWithFailover.mockResolvedValue({
        success: true,
        qrCodeUrl: 'https://tertiary.com/qr/multi',
        iccid: '89012345678901234570',
        providerOrderId: 'ter_multi_123',
        providerUsed: 'mobimatter', // Third provider
        attemptedProviders: ['airalo', 'esimcard', 'mobimatter'],
        failureReasons: {
          airalo: 'Service unavailable',
          esimcard: 'Rate limited',
        },
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(true);
      expect(result.providerUsed).toBe('mobimatter');
      expect(result.finalState).toBe('delivered');
    });
  });

  // ===========================================================================
  // All Fail: All Providers Fail → Discord Alert
  // ===========================================================================

  describe('All fail: All providers fail → Discord alert (without ManualProvider)', () => {
    beforeEach(() => {
      // Disable Discord for these tests to test pure provider_failed behavior
      mockIsDiscordConfigured.mockReturnValue(false);
    });

    afterEach(() => {
      // Restore Discord configuration
      mockIsDiscordConfigured.mockReturnValue(true);
    });

    it('should transition to provider_failed when all providers fail', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'All providers failed to fulfill order',
        errorType: 'provider_error',
        attemptedProviders: ['airalo', 'esimcard', 'mobimatter'],
        failureReasons: {
          airalo: 'Service unavailable',
          esimcard: 'Out of stock',
          mobimatter: 'Rate limited',
        },
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(false);
      expect(result.finalState).toBe('provider_failed');
      expect(result.error?.message).toContain('All providers failed');
    });

    it('should NOT send Discord notification when Discord is disabled', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'All providers exhausted',
        errorType: 'provider_error',
        attemptedProviders: ['airalo', 'esimcard', 'mobimatter'],
        failureReasons: {
          airalo: 'Timeout',
          esimcard: 'Server error',
          mobimatter: 'Authentication failed',
        },
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      await resultPromise;

      // Assert - Discord notifications should NOT be sent when disabled
      expect(mockNotifyOrderFailure).not.toHaveBeenCalled();
      expect(mockNotifyManualFulfillmentRequired).not.toHaveBeenCalled();
    });

    it('should include all failure reasons in result', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();
      const expectedReasons = {
        airalo: 'Connection refused',
        esimcard: 'Invalid API key',
        mobimatter: 'Product not found',
      };

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'All providers failed',
        errorType: 'provider_error',
        attemptedProviders: ['airalo', 'esimcard', 'mobimatter'],
        failureReasons: expectedReasons,
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(false);
      // 3 provider attempts + 1 manual provider attempt = 4 total (or 3 if manual disabled)
      expect(result.attempts.length).toBeGreaterThanOrEqual(3);
      expect(result.attempts.find((a) => a.providerName === 'airalo')?.errorMessage).toBe(
        expectedReasons.airalo
      );
    });

    it('should not send email when fulfillment fails', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();
      let emailCalled = false;

      // Disable Discord for this test to prevent ManualProvider fallback
      mockIsDiscordConfigured.mockReturnValue(false);

      const noEmailService = createFulfillmentService({
        persistFn: async (orderId, state) => stateStore.set(orderId, state),
        loadFn: async (orderId) => stateStore.get(orderId) || 'payment_received',
        emailFn: async () => {
          emailCalled = true;
          return { success: true, messageId: 'msg_fail' };
        },
        config: {
          webhookTimeoutMs: 25000,
          providerTimeoutMs: 10000,
          maxRetries: 3,
          enableEmailNotification: true,
          enableDiscordAlerts: true,
        },
      });

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'All providers failed',
        errorType: 'provider_error',
        attemptedProviders: ['airalo', 'esimcard', 'mobimatter'],
        failureReasons: {},
      });

      // Act
      const resultPromise = noEmailService.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(false);
      expect(emailCalled).toBe(false);
      expect(result.emailSent).toBeUndefined();

      // Restore mock
      mockIsDiscordConfigured.mockReturnValue(true);
    });
  });

  // ===========================================================================
  // ManualProvider Fallback: Discord notification for manual fulfillment
  // ===========================================================================

  describe('ManualProvider fallback: Discord notification for manual fulfillment', () => {
    beforeEach(() => {
      // Ensure Discord is configured for manual fallback tests
      mockIsDiscordConfigured.mockReturnValue(true);
      mockNotifyManualFulfillmentRequired.mockClear();
    });

    it('should transition to pending_manual_fulfillment when all providers fail', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      // Explicitly reset mocks to ensure clean state
      mockIsDiscordConfigured.mockReturnValue(true);
      mockNotifyManualFulfillmentRequired.mockResolvedValue(undefined);

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'All providers exhausted',
        errorType: 'provider_error',
        attemptedProviders: ['airalo', 'esimcard', 'mobimatter'],
        failureReasons: {
          airalo: 'Service unavailable',
          esimcard: 'Out of stock',
          mobimatter: 'Rate limited',
        },
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(false);
      expect(result.finalState).toBe('pending_manual_fulfillment');
      expect(result.pendingManualFulfillment).toBe(true);
      expect(result.manualFulfillmentNotificationSent).toBe(true);
    });

    it('should send Discord notification via ManualProvider', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'All providers failed',
        errorType: 'provider_error',
        attemptedProviders: ['airalo', 'esimcard'],
        failureReasons: {
          airalo: 'Timeout',
          esimcard: 'Server error',
        },
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      await resultPromise;

      // Assert
      expect(mockNotifyManualFulfillmentRequired).toHaveBeenCalled();
      expect(mockNotifyManualFulfillmentRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: order.orderId,
          correlationId: order.correlationId,
          attemptedProviders: ['airalo', 'esimcard'],
        })
      );
    });

    it('should include manual attempt in result attempts', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'All providers failed',
        errorType: 'provider_error',
        attemptedProviders: ['airalo'],
        failureReasons: { airalo: 'Failed' },
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.attempts.some((a) => a.providerName === 'manual')).toBe(true);
      const manualAttempt = result.attempts.find((a) => a.providerName === 'manual');
      expect(manualAttempt?.success).toBe(true);
    });

    it('should fall back to provider_failed when Discord is not configured', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      // Disable Discord configuration
      mockIsDiscordConfigured.mockReturnValue(false);

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'All providers failed',
        errorType: 'provider_error',
        attemptedProviders: ['airalo'],
        failureReasons: { airalo: 'Failed' },
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(false);
      expect(result.finalState).toBe('provider_failed');
      expect(result.pendingManualFulfillment).toBeUndefined();

      // Restore mock
      mockIsDiscordConfigured.mockReturnValue(true);
    });

    it('should fall back to provider_failed when ManualProvider notification fails', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      // Make manual notification fail
      mockNotifyManualFulfillmentRequired.mockRejectedValueOnce(
        new Error('Discord webhook failed')
      );

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'All providers failed',
        errorType: 'provider_error',
        attemptedProviders: ['airalo'],
        failureReasons: { airalo: 'Failed' },
      });

      // Act
      const resultPromise = service.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert - should fall back to provider_failed when ManualProvider fails
      expect(result.success).toBe(false);
      expect(result.finalState).toBe('provider_failed');
      expect(mockNotifyOrderFailure).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Timeout: 25-second webhook timeout graceful handling
  // ===========================================================================

  describe('Timeout: 25s timeout graceful handling', () => {
    it('should return timeout result when fulfillment exceeds timeout', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      // Mock slow provider that takes 30 seconds
      mockPurchaseWithFailover.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        return {
          success: true,
          qrCodeUrl: 'https://provider.com/qr/slow',
          iccid: '89012345678901234571',
          providerOrderId: 'slow_123',
          providerUsed: 'airalo',
          attemptedProviders: ['airalo'],
          failureReasons: {},
        };
      });

      // Act
      const resultPromise = fulfillWithTimeout(service, order, providers, 25000);

      // Advance time past timeout
      await vi.advanceTimersByTimeAsync(26000);

      const result = await resultPromise;

      // Assert
      expect(isTimeoutResult(result)).toBe(true);
      if (isTimeoutResult(result)) {
        expect(result.timedOut).toBe(true);
        expect(result.orderId).toBe(order.orderId);
        expect(result.elapsedMs).toBeGreaterThanOrEqual(25000);
        expect(result.message).toContain('timed out');
      }
    });

    it('should return fulfillment result when completed within timeout', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      // Mock fast provider
      mockPurchaseWithFailover.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return {
          success: true,
          qrCodeUrl: 'https://provider.com/qr/fast',
          iccid: '89012345678901234572',
          providerOrderId: 'fast_123',
          providerUsed: 'airalo',
          attemptedProviders: ['airalo'],
          failureReasons: {},
        };
      });

      // Act
      const resultPromise = fulfillWithTimeout(service, order, providers, 25000);

      // Advance time to complete fulfillment
      await vi.advanceTimersByTimeAsync(6000);

      const result = await resultPromise;

      // Assert
      expect(isTimeoutResult(result)).toBe(false);
      expect((result as FulfillmentResult).success).toBe(true);
    });

    it('should preserve order in fulfillment_started state on timeout', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      mockPurchaseWithFailover.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        return {
          success: true,
          qrCodeUrl: 'https://provider.com/qr/preserved',
          iccid: '89012345678901234573',
          providerOrderId: 'preserved_123',
          providerUsed: 'airalo',
          attemptedProviders: ['airalo'],
          failureReasons: {},
        };
      });

      // Act
      const resultPromise = fulfillWithTimeout(service, order, providers, 25000);

      // Advance time past timeout but not past fulfillment
      await vi.advanceTimersByTimeAsync(26000);

      await resultPromise;

      // Assert - order should still be in fulfillment_started
      const currentState = stateStore.get(order.id);
      expect(currentState).toBe('fulfillment_started');
    });

    it('should allow subsequent cron job to pick up timed-out orders', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      // First attempt times out
      mockPurchaseWithFailover.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        return {
          success: true,
          qrCodeUrl: 'https://provider.com/qr/timeout1',
          iccid: '89012345678901234574',
          providerOrderId: 'timeout1_123',
          providerUsed: 'airalo',
          attemptedProviders: ['airalo'],
          failureReasons: {},
        };
      });

      // Act - First attempt (times out)
      const firstResultPromise = fulfillWithTimeout(service, order, providers, 25000);
      await vi.advanceTimersByTimeAsync(26000);
      const firstResult = await firstResultPromise;

      // Verify timeout
      expect(isTimeoutResult(firstResult)).toBe(true);

      // Verify order is in fulfillment_started state (can be picked up by cron)
      expect(stateStore.get(order.id)).toBe('fulfillment_started');

      // Note: In real scenario, cron job would create a new fulfillment service
      // and call fulfill() on the same order. The order's state being
      // 'fulfillment_started' allows the cron to identify it as stuck.
      // This test verifies the order remains in a recoverable state.
    });
  });

  // ===========================================================================
  // Feature Flag Behavior
  // ===========================================================================

  describe('Feature flag behavior', () => {
    it('should use configurable timeout from config', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();
      const customTimeoutMs = 100; // Short timeout for test

      mockPurchaseWithFailover.mockImplementation(async () => {
        // This will take longer than the timeout
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          success: true,
          qrCodeUrl: 'https://provider.com/qr/custom',
          iccid: '89012345678901234576',
          providerOrderId: 'custom_123',
          providerUsed: 'airalo',
          attemptedProviders: ['airalo'],
          failureReasons: {},
        };
      });

      // Act
      const resultPromise = fulfillWithTimeout(service, order, providers, customTimeoutMs);
      await vi.advanceTimersByTimeAsync(200); // Advance past custom timeout
      const result = await resultPromise;

      // Assert - should timeout after custom timeout (100ms), not default (25s)
      expect(isTimeoutResult(result)).toBe(true);
      if (isTimeoutResult(result)) {
        expect(result.elapsedMs).toBeGreaterThanOrEqual(customTimeoutMs);
      }
    });
  });

  // ===========================================================================
  // Error Handling Edge Cases
  // ===========================================================================

  describe('Error handling edge cases', () => {
    it('should handle state machine transition failure', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      const failingService = createFulfillmentService({
        persistFn: async () => {
          throw new Error('Database connection lost');
        },
        loadFn: async () => 'payment_received',
        config: {
          webhookTimeoutMs: 25000,
          providerTimeoutMs: 10000,
          maxRetries: 3,
          enableEmailNotification: false,
          enableDiscordAlerts: false,
        },
      });

      mockPurchaseWithFailover.mockResolvedValue({
        success: true,
        qrCodeUrl: 'https://provider.com/qr/dbfail',
        iccid: '89012345678901234577',
        providerOrderId: 'dbfail_123',
        providerUsed: 'airalo',
        attemptedProviders: ['airalo'],
        failureReasons: {},
      });

      // Act
      const resultPromise = failingService.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert - should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error?.message).toBeDefined();
    });

    it('should handle email sending failure gracefully', async () => {
      // Arrange
      const order = createTestOrder();
      const providers = createTestProviders();

      const emailFailService = createFulfillmentService({
        persistFn: async (orderId, state) => stateStore.set(orderId, state),
        loadFn: async (orderId) => stateStore.get(orderId) || 'payment_received',
        emailFn: async () => {
          throw new Error('Email service unavailable');
        },
        config: {
          webhookTimeoutMs: 25000,
          providerTimeoutMs: 10000,
          maxRetries: 3,
          enableEmailNotification: true,
          enableDiscordAlerts: true,
        },
      });

      mockPurchaseWithFailover.mockResolvedValue({
        success: true,
        qrCodeUrl: 'https://provider.com/qr/emailfail',
        iccid: '89012345678901234578',
        providerOrderId: 'emailfail_123',
        providerUsed: 'airalo',
        attemptedProviders: ['airalo'],
        failureReasons: {},
      });

      // Act
      const resultPromise = emailFailService.fulfill(order, providers);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert - order should still be delivered, email failed
      expect(result.success).toBe(true);
      expect(result.finalState).toBe('delivered');
      expect(result.emailSent).toBe(false);
    });

    it('should handle empty provider list', async () => {
      // Arrange
      const order = createTestOrder();
      const emptyProviders: EsimProvider[] = [];

      mockPurchaseWithFailover.mockResolvedValue({
        success: false,
        errorMessage: 'No providers available',
        errorType: 'provider_error',
        attemptedProviders: [],
        failureReasons: {},
      });

      // Act
      const resultPromise = service.fulfill(order, emptyProviders);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
