/**
 * Manual Provider Unit Tests
 *
 * Tests for the ManualProvider fallback mechanism that sends
 * Discord notifications for manual order fulfillment.
 *
 * Week 2 - ManualProvider TDD tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set environment before imports
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/token';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after setting environment
import { ManualProvider, isManualFulfillmentPending } from '../../services/esim-providers/manual';
import type { EsimProvider, EsimPurchaseRequest, EsimManualFulfillmentPending } from '../../services/esim-providers/types';

describe('ManualProvider', () => {
  let provider: ManualProvider;
  const mockConfig: EsimProvider = {
    id: 'manual-001',
    name: 'Manual Provider',
    slug: 'manual',
    priority: 999, // Lowest priority - fallback only
    apiEndpoint: '',
    apiKeyEnvVar: '',
    timeoutMs: 10000,
    maxRetries: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ManualProvider(mockConfig);

    // Default successful webhook response
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '',
    });
  });

  afterEach(() => {
    // Restore env
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/token';
  });

  describe('purchase', () => {
    const baseRequest: EsimPurchaseRequest = {
      providerSku: 'test-sku',
      quantity: 1,
      customerEmail: 'test@example.com',
      correlationId: 'corr-123',
    };

    it('should send Discord notification and return pending_manual status', async () => {
      const result = await provider.purchase({
        ...baseRequest,
        orderId: 'order-123',
        productName: 'Japan 5GB 7days',
        country: 'JP',
        dataAmount: '5GB',
        attemptedProviders: ['airalo', 'esimcard'],
        failureReason: 'All providers returned rate limit errors',
      } as any);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Check the notification payload
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.embeds[0].title).toBe('🔧 Manual Fulfillment Required');
      expect(body.embeds[0].description).toContain('order-123');

      // Verify result
      expect(result.success).toBe('pending_manual');
      if (isManualFulfillmentPending(result)) {
        expect(result.orderId).toBe('order-123');
        expect(result.notificationSent).toBe(true);
      }
    });

    it('should use correlationId as orderId if orderId not provided', async () => {
      const result = await provider.purchase(baseRequest);

      expect(result.success).toBe('pending_manual');
      if (isManualFulfillmentPending(result)) {
        expect(result.orderId).toBe('corr-123');
      }
    });

    it('should include attempted providers in notification', async () => {
      await provider.purchase({
        ...baseRequest,
        attemptedProviders: ['airalo', 'esimcard', 'mobimatter'],
      } as any);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const attemptedField = body.embeds[0].fields.find(
        (f: any) => f.name === 'Attempted Providers'
      );
      expect(attemptedField.value).toContain('airalo');
      expect(attemptedField.value).toContain('esimcard');
      expect(attemptedField.value).toContain('mobimatter');
    });

    it('should handle Discord webhook failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await provider.purchase(baseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorType).toBe('provider_error');
        expect(result.errorMessage).toContain('Failed to send manual fulfillment notification');
        expect(result.isRetryable).toBe(true);
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.purchase(baseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorType).toBe('provider_error');
        expect(result.errorMessage).toContain('Network error');
      }
    });

    it('should return error if Discord webhook not configured', async () => {
      const originalUrl = process.env.DISCORD_WEBHOOK_URL;
      process.env.DISCORD_WEBHOOK_URL = '';

      const newProvider = new ManualProvider(mockConfig);
      const result = await newProvider.purchase(baseRequest);

      // Restore
      process.env.DISCORD_WEBHOOK_URL = originalUrl;

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorMessage).toContain('not configured');
        expect(result.isRetryable).toBe(false);
      }
    });

    it('should mask customer email in notification', async () => {
      await provider.purchase({
        ...baseRequest,
        customerEmail: 'johndoe@example.com',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const customerField = body.embeds[0].fields.find(
        (f: any) => f.name === 'Customer'
      );
      // Email should be masked
      expect(customerField.value).not.toBe('johndoe@example.com');
      expect(customerField.value).toContain('jo***');
    });

    it('should include action items in notification', async () => {
      await provider.purchase(baseRequest);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const actionField = body.embeds[0].fields.find(
        (f: any) => f.name === '📋 Action Required'
      );
      expect(actionField).toBeDefined();
      expect(actionField.value).toContain('Log into provider dashboard');
      expect(actionField.value).toContain('Purchase eSIM manually');
    });
  });

  describe('healthCheck', () => {
    it('should return true when Discord is configured', async () => {
      const result = await provider.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when Discord is not configured', async () => {
      const originalUrl = process.env.DISCORD_WEBHOOK_URL;
      process.env.DISCORD_WEBHOOK_URL = '';

      const newProvider = new ManualProvider(mockConfig);
      const result = await newProvider.healthCheck();

      // Restore
      process.env.DISCORD_WEBHOOK_URL = originalUrl;

      expect(result).toBe(false);
    });
  });

  describe('isManualFulfillmentPending helper', () => {
    it('should return true for pending_manual result', () => {
      const result: EsimManualFulfillmentPending = {
        success: 'pending_manual',
        orderId: 'order-123',
        notificationSent: true,
        message: 'Test message',
      };
      expect(isManualFulfillmentPending(result)).toBe(true);
    });

    it('should return false for success result', () => {
      const result = {
        success: true as const,
        qrCodeUrl: 'http://example.com/qr',
        iccid: '1234567890',
        providerOrderId: 'prov-123',
      };
      expect(isManualFulfillmentPending(result)).toBe(false);
    });

    it('should return false for error result', () => {
      const result = {
        success: false as const,
        errorType: 'provider_error' as const,
        errorMessage: 'Test error',
        isRetryable: false,
      };
      expect(isManualFulfillmentPending(result)).toBe(false);
    });
  });
});

describe('ManualProvider Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '',
    });
  });

  it('should be registered in provider factory', async () => {
    // Import to trigger registration
    await import('../../services/esim-providers/manual');
    const { createProvider } = await import('../../services/esim-providers/provider-factory');

    const config: EsimProvider = {
      id: 'manual-001',
      name: 'Manual Provider',
      slug: 'manual',
      priority: 999,
      apiEndpoint: '',
      apiKeyEnvVar: '',
      timeoutMs: 10000,
      maxRetries: 1,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const provider = createProvider(config);
    expect(provider).toBeDefined();
    expect(provider.slug).toBe('manual');
  });
});
