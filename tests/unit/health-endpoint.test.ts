import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing the route
vi.mock('@/lib/pocketbase', () => ({
  getAdminPocketBase: vi.fn(),
}));

// Mock dynamic import for SmartStore
vi.mock('@services/sales-channels/smartstore', () => ({
  getSmartStoreClient: vi.fn(),
}));

describe('Health Check Endpoint', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('GET /api/health', () => {
    it('should return healthy when all services are ok', async () => {
      // Setup environment
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('NAVER_COMMERCE_APP_ID', 'test_app_id');
      vi.stubEnv('NAVER_COMMERCE_APP_SECRET', 'test_app_secret');

      // Mock PocketBase
      const { getAdminPocketBase } = await import('@/lib/pocketbase');
      vi.mocked(getAdminPocketBase).mockResolvedValue({
        health: {
          check: vi.fn().mockResolvedValue({ code: 200 }),
        },
      } as any);

      // Mock SmartStore - need to mock the dynamic import
      const smartstoreMock = {
        getSmartStoreClient: vi.fn().mockReturnValue({
          healthCheck: vi.fn().mockResolvedValue(true),
        }),
      };
      vi.doMock('@services/sales-channels/smartstore', () => smartstoreMock);

      // Import the route handler after mocks are set up
      const { GET } = await import('@/app/api/health/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.services.pocketbase.status).toBe('ok');
      expect(data.services.stripe.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded when optional services fail', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', ''); // Invalid
      vi.stubEnv('NAVER_COMMERCE_APP_ID', '');
      vi.stubEnv('NAVER_COMMERCE_APP_SECRET', '');

      const { getAdminPocketBase } = await import('@/lib/pocketbase');
      vi.mocked(getAdminPocketBase).mockResolvedValue({
        health: {
          check: vi.fn().mockResolvedValue({ code: 200 }),
        },
      } as any);

      const { GET } = await import('@/app/api/health/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.services.pocketbase.status).toBe('ok');
      expect(data.services.stripe.status).toBe('error');
      expect(data.services.smartstore.status).toBe('error');
    });

    it('should return unhealthy when PocketBase is down', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('NAVER_CLIENT_ID', 'test_client_id');
      vi.stubEnv('NAVER_CLIENT_SECRET', 'test_client_secret');

      const { getAdminPocketBase } = await import('@/lib/pocketbase');
      vi.mocked(getAdminPocketBase).mockRejectedValue(new Error('Connection refused'));

      const { GET } = await import('@/app/api/health/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.services.pocketbase.status).toBe('error');
      expect(data.services.pocketbase.error).toContain('Connection refused');
    });

    it('should validate Stripe key format', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'invalid_key'); // Should start with sk_
      vi.stubEnv('NAVER_CLIENT_ID', '');
      vi.stubEnv('NAVER_CLIENT_SECRET', '');

      const { getAdminPocketBase } = await import('@/lib/pocketbase');
      vi.mocked(getAdminPocketBase).mockResolvedValue({
        health: {
          check: vi.fn().mockResolvedValue({ code: 200 }),
        },
      } as any);

      const { GET } = await import('@/app/api/health/route');
      const response = await GET();
      const data = await response.json();

      expect(data.services.stripe.status).toBe('error');
      expect(data.services.stripe.error).toContain('Invalid Stripe API key format');
    });

    it('should include latency measurements', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('NAVER_CLIENT_ID', '');
      vi.stubEnv('NAVER_CLIENT_SECRET', '');

      const { getAdminPocketBase } = await import('@/lib/pocketbase');
      vi.mocked(getAdminPocketBase).mockResolvedValue({
        health: {
          check: vi.fn().mockResolvedValue({ code: 200 }),
        },
      } as any);

      const { GET } = await import('@/app/api/health/route');
      const response = await GET();
      const data = await response.json();

      expect(data.services.pocketbase.latencyMs).toBeGreaterThanOrEqual(0);
      expect(data.services.stripe.latencyMs).toBeGreaterThanOrEqual(0);
      expect(data.services.smartstore.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return correct response structure', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('NAVER_CLIENT_ID', '');
      vi.stubEnv('NAVER_CLIENT_SECRET', '');

      const { getAdminPocketBase } = await import('@/lib/pocketbase');
      vi.mocked(getAdminPocketBase).mockResolvedValue({
        health: {
          check: vi.fn().mockResolvedValue({ code: 200 }),
        },
      } as any);

      const { GET } = await import('@/app/api/health/route');
      const response = await GET();
      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('uptime');

      // Verify services structure
      expect(data.services).toHaveProperty('pocketbase');
      expect(data.services).toHaveProperty('stripe');
      expect(data.services).toHaveProperty('smartstore');

      // Verify timestamp format (ISO 8601)
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });
  });
});
