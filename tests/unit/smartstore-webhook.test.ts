import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock modules before importing the route
vi.mock('@/lib/pocketbase', () => ({
  getAdminPocketBase: vi.fn(),
  Collections: {
    ORDERS: 'orders',
  },
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('@services/sales-channels/smartstore', () => ({
  getSmartStoreClient: vi.fn(),
  getSmartStoreAuth: vi.fn(),
  normalizeNaverOrder: vi.fn(),
  isEligibleForFulfillment: vi.fn(),
  createPocketBaseProductMapper: vi.fn(),
}));

vi.mock('@services/order-fulfillment', () => ({
  createFulfillmentService: vi.fn(),
  fulfillWithTimeout: vi.fn(),
  isTimeoutResult: vi.fn(),
}));

vi.mock('@services/logging', () => ({
  createAutomationLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('uuid', () => ({
  v4: () => 'test-correlation-id',
}));

describe('SmartStore Webhook Endpoint', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('POST /api/webhooks/smartstore', () => {
    it('should return 503 when SmartStore integration is disabled', async () => {
      const { getConfig } = await import('@/lib/config');
      vi.mocked(getConfig).mockReturnValue({
        smartStore: { enabled: false },
      } as any);

      const { POST } = await import(
        '@/app/api/webhooks/smartstore/route'
      );

      const request = new NextRequest('http://localhost/api/webhooks/smartstore', {
        method: 'POST',
        body: JSON.stringify({ type: 'ORDER_PAYMENT_COMPLETE' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('SmartStore integration disabled');
    });

    it('should return 401 for invalid signature', async () => {
      const { getConfig } = await import('@/lib/config');
      vi.mocked(getConfig).mockReturnValue({
        smartStore: { enabled: true },
      } as any);

      const { getSmartStoreAuth } = await import(
        '@services/sales-channels/smartstore'
      );
      vi.mocked(getSmartStoreAuth).mockReturnValue({
        verifyWebhookSignature: vi.fn().mockReturnValue(false),
      } as any);

      const { POST } = await import(
        '@/app/api/webhooks/smartstore/route'
      );

      const request = new NextRequest('http://localhost/api/webhooks/smartstore', {
        method: 'POST',
        body: JSON.stringify({ type: 'ORDER_PAYMENT_COMPLETE' }),
        headers: {
          'x-naver-signature': 'invalid-signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });

    it('should return 400 for invalid JSON payload', async () => {
      const { getConfig } = await import('@/lib/config');
      vi.mocked(getConfig).mockReturnValue({
        smartStore: { enabled: true },
      } as any);

      const { getSmartStoreAuth } = await import(
        '@services/sales-channels/smartstore'
      );
      vi.mocked(getSmartStoreAuth).mockReturnValue({
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
      } as any);

      const { POST } = await import(
        '@/app/api/webhooks/smartstore/route'
      );

      const request = new NextRequest('http://localhost/api/webhooks/smartstore', {
        method: 'POST',
        body: 'not valid json {{{',
        headers: {
          'x-naver-signature': 'valid-signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('should acknowledge ORDER_DELIVERING event', async () => {
      const { getConfig } = await import('@/lib/config');
      vi.mocked(getConfig).mockReturnValue({
        smartStore: { enabled: true },
      } as any);

      const { getSmartStoreAuth } = await import(
        '@services/sales-channels/smartstore'
      );
      vi.mocked(getSmartStoreAuth).mockReturnValue({
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
      } as any);

      const { POST } = await import(
        '@/app/api/webhooks/smartstore/route'
      );

      const payload = {
        type: 'ORDER_DELIVERING',
        productOrderIds: ['order123'],
      };

      const request = new NextRequest('http://localhost/api/webhooks/smartstore', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'x-naver-signature': 'valid-signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.handled).toBe(true);
      expect(data.type).toBe('ORDER_DELIVERING');
    });

    it('should acknowledge ORDER_DELIVERED event', async () => {
      const { getConfig } = await import('@/lib/config');
      vi.mocked(getConfig).mockReturnValue({
        smartStore: { enabled: true },
      } as any);

      const { getSmartStoreAuth } = await import(
        '@services/sales-channels/smartstore'
      );
      vi.mocked(getSmartStoreAuth).mockReturnValue({
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
      } as any);

      const { POST } = await import(
        '@/app/api/webhooks/smartstore/route'
      );

      const payload = {
        type: 'ORDER_DELIVERED',
        productOrderIds: ['order123'],
      };

      const request = new NextRequest('http://localhost/api/webhooks/smartstore', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'x-naver-signature': 'valid-signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.handled).toBe(true);
      expect(data.type).toBe('ORDER_DELIVERED');
    });

    it('should handle unrecognized event types gracefully', async () => {
      const { getConfig } = await import('@/lib/config');
      vi.mocked(getConfig).mockReturnValue({
        smartStore: { enabled: true },
      } as any);

      const { getSmartStoreAuth } = await import(
        '@services/sales-channels/smartstore'
      );
      vi.mocked(getSmartStoreAuth).mockReturnValue({
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
      } as any);

      const { POST } = await import(
        '@/app/api/webhooks/smartstore/route'
      );

      const payload = {
        type: 'UNKNOWN_EVENT_TYPE',
        productOrderIds: ['order123'],
      };

      const request = new NextRequest('http://localhost/api/webhooks/smartstore', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'x-naver-signature': 'valid-signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.handled).toBe(false);
      expect(data.type).toBe('UNKNOWN_EVENT_TYPE');
    });

    it('should acknowledge ORDER_CLAIM_REQUESTED event', async () => {
      const { getConfig } = await import('@/lib/config');
      vi.mocked(getConfig).mockReturnValue({
        smartStore: { enabled: true },
      } as any);

      const { getSmartStoreAuth } = await import(
        '@services/sales-channels/smartstore'
      );
      vi.mocked(getSmartStoreAuth).mockReturnValue({
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
      } as any);

      const { POST } = await import(
        '@/app/api/webhooks/smartstore/route'
      );

      const payload = {
        type: 'ORDER_CLAIM_REQUESTED',
        productOrderIds: ['order123'],
      };

      const request = new NextRequest('http://localhost/api/webhooks/smartstore', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'x-naver-signature': 'valid-signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.handled).toBe(true);
      expect(data.type).toBe('ORDER_CLAIM_REQUESTED');
      expect(data.message).toContain('manual review required');
    });

    it('should return 400 when no product order IDs provided for payment complete', async () => {
      const { getConfig } = await import('@/lib/config');
      vi.mocked(getConfig).mockReturnValue({
        smartStore: { enabled: true },
        fulfillment: {
          webhookTimeoutMs: 25000,
          enableEmailNotification: true,
          enableDiscordAlerts: true,
        },
      } as any);

      const { getSmartStoreAuth } = await import(
        '@services/sales-channels/smartstore'
      );
      vi.mocked(getSmartStoreAuth).mockReturnValue({
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
      } as any);

      const { POST } = await import(
        '@/app/api/webhooks/smartstore/route'
      );

      const payload = {
        type: 'ORDER_PAYMENT_COMPLETE',
        productOrderIds: [],
      };

      const request = new NextRequest('http://localhost/api/webhooks/smartstore', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'x-naver-signature': 'valid-signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No product order IDs provided');
    });
  });
});
