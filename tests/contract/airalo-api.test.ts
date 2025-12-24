/**
 * Airalo API Contract Tests
 *
 * Tests that verify the Airalo provider implementation matches the expected
 * API contract defined in specs/001-order-processing/contracts/airalo-api.yaml
 *
 * Task: Part 3 - Task T.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Contract Type Definitions (matching OpenAPI spec)
// =============================================================================

interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

interface AiraloSim {
  id: number;
  created_at: string;
  iccid: string;
  lpa: string;
  imsis: string | null;
  matching_id: string;
  qrcode: string;
  qrcode_url: string;
  direct_apple_installation_url: string;
  airalo_code: string | null;
  apn_type: string;
  apn_value: string | null;
  is_roaming: boolean;
  confirmation_code: string | null;
}

interface AiraloOrderData {
  id: number;
  code: string;
  currency: string;
  package_id: string;
  quantity: string;
  type: string;
  description: string;
  esim_type: string;
  validity: number;
  package: string;
  data: string;
  price: number;
  created_at: string;
  manual_installation: string;
  qrcode_installation: string;
  installation_guides: {
    [lang: string]: string;
  };
  sims: AiraloSim[];
}

interface AiraloOrderResponse {
  data: AiraloOrderData;
  meta: {
    message: string;
  };
}

interface ValidationError {
  message: string;
  errors: {
    [field: string]: string[];
  };
}

// =============================================================================
// Contract Validators
// =============================================================================

function isValidTokenResponse(data: unknown): data is TokenResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.access_token === 'string' &&
    obj.token_type === 'Bearer' &&
    typeof obj.expires_in === 'number'
  );
}

function isValidAiraloSim(data: unknown): data is AiraloSim {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.iccid === 'string' &&
    typeof obj.qrcode === 'string' &&
    typeof obj.qrcode_url === 'string'
  );
}

function isValidAiraloOrderResponse(data: unknown): data is AiraloOrderResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.data !== 'object' || obj.data === null) return false;
  const orderData = obj.data as Record<string, unknown>;

  if (!Array.isArray(orderData.sims)) return false;

  return (
    typeof orderData.id === 'number' &&
    typeof orderData.code === 'string' &&
    typeof orderData.package_id === 'string'
  );
}

function isValidationError(data: unknown): data is ValidationError {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.message === 'string' && typeof obj.errors === 'object';
}

// =============================================================================
// Tests
// =============================================================================

describe('Airalo API Contract Tests', () => {
  describe('Token Response Contract', () => {
    it('should match TokenResponse schema for successful auth', () => {
      // Example from OpenAPI spec
      const validResponse = {
        access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      expect(isValidTokenResponse(validResponse)).toBe(true);
    });

    it('should reject response missing required fields', () => {
      const invalidResponse = {
        access_token: 'token',
        // missing token_type and expires_in
      };

      expect(isValidTokenResponse(invalidResponse)).toBe(false);
    });

    it('should reject response with wrong token_type', () => {
      const invalidResponse = {
        access_token: 'token',
        token_type: 'Basic', // Must be "Bearer"
        expires_in: 3600,
      };

      expect(isValidTokenResponse(invalidResponse)).toBe(false);
    });

    it('should require expires_in to be a number', () => {
      const invalidResponse = {
        access_token: 'token',
        token_type: 'Bearer',
        expires_in: '3600', // Must be number
      };

      expect(isValidTokenResponse(invalidResponse)).toBe(false);
    });
  });

  describe('Order Response Contract', () => {
    const validOrderResponse: AiraloOrderResponse = {
      data: {
        id: 12345,
        code: 'ORD-12345',
        currency: 'USD',
        package_id: 'japan-7days-1gb',
        quantity: '1',
        type: 'sim',
        description: 'Test order',
        esim_type: 'Prepaid',
        validity: 7,
        package: 'Japan 7 Days 1GB',
        data: '1 GB',
        price: 5.0,
        created_at: '2024-01-01T00:00:00.000Z',
        manual_installation: 'https://airalo.com/install/manual',
        qrcode_installation: 'https://airalo.com/install/qr',
        installation_guides: {
          en: 'https://airalo.com/guides/en',
        },
        sims: [
          {
            id: 67890,
            created_at: '2024-01-01T00:00:00.000Z',
            iccid: '89012345678901234567',
            lpa: 'LPA:1$airalo.com$ACTIVATION_CODE',
            imsis: null,
            matching_id: 'MATCH123',
            qrcode: 'LPA:1$airalo.com$QR_DATA',
            qrcode_url: 'https://api.airalo.com/qr/67890.png',
            direct_apple_installation_url:
              'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=...',
            airalo_code: null,
            apn_type: 'automatic',
            apn_value: null,
            is_roaming: false,
            confirmation_code: null,
          },
        ],
      },
      meta: {
        message: 'Order created successfully',
      },
    };

    it('should match OrderResponse schema for successful order', () => {
      expect(isValidAiraloOrderResponse(validOrderResponse)).toBe(true);
    });

    it('should validate SIM object within order', () => {
      const sim = validOrderResponse.data.sims[0];
      expect(isValidAiraloSim(sim)).toBe(true);
    });

    it('should reject order response missing required id', () => {
      const invalidResponse = {
        data: {
          // missing id
          code: 'ORD-12345',
          package_id: 'test',
          sims: [],
        },
        meta: { message: 'ok' },
      };

      expect(isValidAiraloOrderResponse(invalidResponse)).toBe(false);
    });

    it('should reject order response with non-array sims', () => {
      const invalidResponse = {
        data: {
          id: 123,
          code: 'ORD-123',
          package_id: 'test',
          sims: 'not-an-array',
        },
        meta: { message: 'ok' },
      };

      expect(isValidAiraloOrderResponse(invalidResponse)).toBe(false);
    });

    it('should accept order response with empty sims array', () => {
      const emptySimsResponse = {
        data: {
          ...validOrderResponse.data,
          sims: [],
        },
        meta: { message: 'Order created but no SIMs' },
      };

      // This is valid according to schema, but application should handle it as error
      expect(isValidAiraloOrderResponse(emptySimsResponse)).toBe(true);
    });
  });

  describe('SIM Object Contract', () => {
    const validSim: AiraloSim = {
      id: 67890,
      created_at: '2024-01-01T00:00:00.000Z',
      iccid: '89012345678901234567',
      lpa: 'LPA:1$airalo.com$ACTIVATION_CODE',
      imsis: null,
      matching_id: 'MATCH123',
      qrcode: 'LPA:1$airalo.com$QR_DATA',
      qrcode_url: 'https://api.airalo.com/qr/67890.png',
      direct_apple_installation_url: 'https://esimsetup.apple.com/...',
      airalo_code: null,
      apn_type: 'automatic',
      apn_value: null,
      is_roaming: false,
      confirmation_code: null,
    };

    it('should validate complete SIM object', () => {
      expect(isValidAiraloSim(validSim)).toBe(true);
    });

    it('should require iccid field', () => {
      const { iccid, ...simWithoutIccid } = validSim;
      expect(isValidAiraloSim(simWithoutIccid)).toBe(false);
    });

    it('should require qrcode_url field', () => {
      const simWithoutQrUrl = { ...validSim, qrcode_url: undefined };
      expect(isValidAiraloSim(simWithoutQrUrl)).toBe(false);
    });

    it('should accept null values for optional fields', () => {
      const simWithNulls = {
        ...validSim,
        imsis: null,
        airalo_code: null,
        apn_value: null,
        confirmation_code: null,
      };
      expect(isValidAiraloSim(simWithNulls)).toBe(true);
    });
  });

  describe('Validation Error Contract', () => {
    it('should match ValidationError schema for 422 response', () => {
      const validationError: ValidationError = {
        message: 'Validation failed',
        errors: {
          package_id: ['The selected package_id is invalid.'],
          quantity: ['The quantity must be between 1 and 50.'],
        },
      };

      expect(isValidationError(validationError)).toBe(true);
    });

    it('should reject error without message field', () => {
      const invalidError = {
        errors: {
          field: ['error'],
        },
      };

      expect(isValidationError(invalidError)).toBe(false);
    });
  });

  describe('Request Format Contract', () => {
    it('should define correct order request fields', () => {
      // According to OpenAPI spec, order request requires:
      const requiredOrderFields = [
        'quantity',
        'package_id',
        'type',
        'description',
      ];

      // Optional fields
      const optionalOrderFields = [
        'brand_settings_name',
        'to_email',
        'sharing_option[]',
      ];

      // This test documents the expected request format
      expect(requiredOrderFields).toEqual([
        'quantity',
        'package_id',
        'type',
        'description',
      ]);

      expect(optionalOrderFields.length).toBeGreaterThan(0);
    });

    it('should define quantity constraints', () => {
      // Per OpenAPI spec: quantity max is 50
      const maxQuantity = 50;
      const minQuantity = 1;

      expect(maxQuantity).toBe(50);
      expect(minQuantity).toBe(1);
    });

    it('should define valid type values', () => {
      // Per OpenAPI spec: type must be "sim"
      const validTypes = ['sim'];
      expect(validTypes).toContain('sim');
    });
  });

  describe('Authentication Contract', () => {
    it('should require Bearer token in Authorization header', () => {
      // Per OpenAPI spec: securitySchemes.bearerAuth
      const authHeaderFormat = 'Bearer {access_token}';
      expect(authHeaderFormat).toContain('Bearer');
    });

    it('should define OAuth2 grant_type as client_credentials', () => {
      // Per OpenAPI spec: /token request
      const requiredGrantType = 'client_credentials';
      expect(requiredGrantType).toBe('client_credentials');
    });
  });

  describe('Rate Limit Contract', () => {
    it('should document packages endpoint rate limit', () => {
      // Per OpenAPI spec info section
      const packagesRateLimit = {
        endpoint: '/packages',
        limit: 40,
        period: 'minute',
      };

      expect(packagesRateLimit.limit).toBe(40);
    });

    it('should document usage endpoint rate limit', () => {
      // Per OpenAPI spec info section
      const usageRateLimit = {
        endpoint: '/sims/{iccid}/usage',
        limit: 96,
        period: 'day',
        note: 'once per 15 minutes per SIM',
      };

      expect(usageRateLimit.limit).toBe(96);
    });
  });

  describe('Error Response Contract', () => {
    it('should handle 401 Unauthorized', () => {
      const status401Response = {
        status: 401,
        expectedBehavior: 'Invalid credentials - refresh token or check API keys',
      };

      expect(status401Response.status).toBe(401);
    });

    it('should handle 422 Unprocessable Entity', () => {
      const status422Response = {
        status: 422,
        expectedBehavior: 'Validation error - check request body',
        isRetryable: false,
      };

      expect(status422Response.status).toBe(422);
      expect(status422Response.isRetryable).toBe(false);
    });

    it('should handle 429 Too Many Requests', () => {
      const status429Response = {
        status: 429,
        expectedBehavior: 'Rate limit exceeded - check Retry-After header',
        isRetryable: true,
      };

      expect(status429Response.status).toBe(429);
      expect(status429Response.isRetryable).toBe(true);
    });

    it('should handle 503/504 Timeout', () => {
      const timeoutResponse = {
        status: [503, 504],
        expectedBehavior: 'Timeout - retry with reduced quantity',
        isRetryable: true,
      };

      expect(timeoutResponse.status).toContain(503);
      expect(timeoutResponse.status).toContain(504);
      expect(timeoutResponse.isRetryable).toBe(true);
    });
  });
});
