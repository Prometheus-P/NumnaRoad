import { AiraloProvider } from '../../services/esim-providers/airalo';
import { EsimProvider, EsimPurchaseRequest, AiraloPackageResponse, EsimProduct } from '../../services/esim-providers/types';
import { vi, expect, test, describe, beforeEach, afterEach } from 'vitest';

describe('AiraloProvider', () => {
    const config: EsimProvider = {
        id: '1',
        name: 'Airalo',
        slug: 'airalo',
        priority: 1,
        apiEndpoint: 'https://api.airalo.com/v2', // Corrected to match AIRALO_API_URL
        apiKeyEnvVar: 'AIRALO_API_KEY',
        timeoutMs: 10000,
        maxRetries: 3,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    // Set up environment variables for testing
    const originalEnv = process.env;

    beforeEach(() => {
        // Set up mock environment variables before each test
        process.env = {
            ...originalEnv,
            AIRALO_API_KEY: 'test-api-key',
            AIRALO_API_SECRET_KEY: 'test-api-secret',
        };
    });

    afterEach(() => {
        // Restore original environment after each test
        process.env = originalEnv;
    });

    const mockAccessTokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
    };

    const mockAiraloPackageResponse: AiraloPackageResponse = {
        pricing: { model: 'test', discount_percentage: 0 },
        data: [
            {
                slug: 'country-package',
                country_code: 'US',
                title: 'USA Package',
                image: { width: 100, height: 100, url: 'img.url' },
                operators: [
                    {
                        id: 101,
                        style: 'style1',
                        gradient_start: 'start',
                        gradient_end: 'end',
                        type: 'local',
                        is_prepaid: true,
                        title: 'Operator A',
                        esim_type: 'data',
                        warning: null,
                        apn_type: 'type',
                        apn_value: 'value',
                        is_roaming: false,
                        info: [],
                        image: { width: 50, height: 50, url: 'op.url' },
                        plan_type: 'planA',
                        activation_policy: 'policy',
                        is_kyc_verify: false,
                        rechargeability: true,
                        other_info: null,
                        coverages: [],
                        install_window_days: null,
                        topup_grace_window_days: null,
                        apn: {
                            ios: { apn_type: 'ios_type', apn_value: null },
                            android: { apn_type: 'android_type', apn_value: null },
                        },
                        packages: [
                            {
                                id: 'pkg-100gb-30d',
                                type: 'data',
                                price: 30.0,
                                amount: 100,
                                day: 30,
                                is_unlimited: false,
                                title: '100GB / 30 Days',
                                short_info: 'High data for long trip',
                                qr_installation: 'qr-link',
                                manual_installation: 'manual-link',
                                is_fair_usage_policy: false,
                                fair_usage_policy: null,
                                data: '100 GB',
                                voice: null,
                                text: null,
                                net_price: 28.5,
                                prices: {
                                    net_price: {
                                        AUD: 40, BRL: 150, GBP: 25, CAD: 35, AED: 110,
                                        EUR: 27, ILS: 100, JPY: 3500, MXN: 500, USD: 30, VND: 700000
                                    },
                                    recommended_retail_price: {
                                        AUD: 45, BRL: 160, GBP: 28, CAD: 38, AED: 120,
                                        EUR: 30, ILS: 110, JPY: 3800, MXN: 530, USD: 33, VND: 750000
                                    },
                                },
                            },
                            {
                                id: 'pkg-50gb-15d',
                                type: 'data',
                                price: 15.0,
                                amount: 50,
                                day: 15,
                                is_unlimited: false,
                                title: '50GB / 15 Days',
                                short_info: 'Medium data for short trip',
                                qr_installation: 'qr-link',
                                manual_installation: 'manual-link',
                                is_fair_usage_policy: false,
                                fair_usage: null,
                                fair_usage_policy: null,
                                data: '50 GB',
                                voice: null,
                                text: null,
                                net_price: 14.25,
                                prices: {
                                    net_price: {
                                        AUD: 20, BRL: 75, GBP: 12, CAD: 17, AED: 55,
                                        EUR: 13, ILS: 50, JPY: 1750, MXN: 250, USD: 15, VND: 350000
                                    },
                                    recommended_retail_price: {
                                        AUD: 22, BRL: 80, GBP: 14, CAD: 19, AED: 60,
                                        EUR: 15, ILS: 55, JPY: 1900, MXN: 265, USD: 16, VND: 375000
                                    },
                                },
                            },
                        ],
                        countries: [{ country_code: 'US', title: 'United States', image: { width: 50, height: 50, url: 'us.url' } }],
                    },
                ],
            },
            {
                slug: 'global-package',
                country_code: '', // Global packages have empty country_code
                title: 'Global Package',
                image: { width: 100, height: 100, url: 'global-img.url' },
                operators: [
                    {
                        id: 201,
                        style: 'style2',
                        gradient_start: 'start2',
                        gradient_end: 'end2',
                        type: 'global',
                        is_prepaid: true,
                        title: 'Operator B',
                        esim_type: 'data',
                        warning: null,
                        apn_type: 'type',
                        apn_value: 'value',
                        is_roaming: false,
                        info: [],
                        image: { width: 50, height: 50, url: 'op2.url' },
                        plan_type: 'planB',
                        activation_policy: 'policy',
                        is_kyc_verify: false,
                        rechargeability: true,
                        other_info: null,
                        coverages: [],
                        install_window_days: null,
                        topup_grace_window_days: null,
                        apn: {
                            ios: { apn_type: 'ios_type', apn_value: null },
                            android: { apn_type: 'android_type', apn_value: null },
                        },
                        packages: [
                            {
                                id: 'pkg-20gb-30d-global',
                                type: 'data',
                                price: 50.0,
                                amount: 20,
                                day: 30,
                                is_unlimited: false,
                                title: '20GB / 30 Days Global',
                                short_info: 'Global data plan',
                                qr_installation: 'qr-link-global',
                                manual_installation: 'manual-link-global',
                                is_fair_usage_policy: false,
                                fair_usage_policy: null,
                                data: '20 GB',
                                voice: null,
                                text: null,
                                net_price: 47.5,
                                prices: {
                                    net_price: {
                                        AUD: 70, BRL: 250, GBP: 40, CAD: 55, AED: 190,
                                        EUR: 45, ILS: 170, JPY: 6000, MXN: 900, USD: 50, VND: 1200000
                                    },
                                    recommended_retail_price: {
                                        AUD: 75, BRL: 260, GBP: 43, CAD: 58, AED: 200,
                                        EUR: 48, ILS: 180, JPY: 6300, MXN: 950, USD: 53, VND: 1250000
                                    },
                                },
                            },
                        ],
                        countries: [],
                    },
                ],
            },
        ],
        links: { first: 'link', last: 'link', prev: null, next: null },
        meta: {
            message: 'success', current_page: 1, from: 1,
            last_page: 1, path: 'path', per_page: '1000', to: 1, total: 2
        },
    };


    beforeEach(() => {
        vi.restoreAllMocks();
        // Ensure environment is reset for each test
        process.env = {
            ...originalEnv,
            AIRALO_API_KEY: 'test-api-key',
            AIRALO_API_SECRET_KEY: 'test-api-secret',
        };
    });

    test('healthCheck should return true when API is healthy', async () => {
        const provider = new AiraloProvider(config);

        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockAccessTokenResponse),
            } as Response)
        );

        const isHealthy = await provider.healthCheck();
        expect(isHealthy).toBe(true);
    });

    test('healthCheck should return false when API is not healthy', async () => {
        const provider = new AiraloProvider(config);

        global.fetch = vi.fn(() => Promise.reject('API is down'));

        const isHealthy = await provider.healthCheck();
        expect(isHealthy).toBe(false);
    });

    test('purchase should return a successful result', async () => {
        const provider = new AiraloProvider(config);
        const request: EsimPurchaseRequest = {
            providerSku: 'test-sku',
            customerEmail: 'test@example.com',
            correlationId: 'test-correlation-id',
            quantity: 1, // Added quantity
        };

        const mockAiraloOrderResponse = {
            data: {
                package_id: 'test-sku',
                quantity: '1',
                type: 'sim',
                description: 'Order for test@example.com, SKU: test-sku',
                esim_type: 'data',
                validity: 30,
                package: 'Test Package',
                data: '1GB',
                price: 5.00,
                pricing_model: 'retail',
                created_at: new Date().toISOString(),
                id: 12345, // Airalo order ID
                code: 'ABCDEF',
                currency: 'USD',
                manual_installation: 'manual-link',
                qrcode_installation: 'qr-link',
                installation_guides: { en: 'guide-link' },
                brand_settings_name: '',
                sims: [
                    {
                        id: 1,
                        created_at: new Date().toISOString(),
                        iccid: 'test-iccid',
                        lpa: 'test-lpa',
                        imsis: null,
                        matching_id: 'test-matching-id',
                        qrcode: 'test-qrcode',
                        qrcode_url: 'https://example.com/qr.png',
                        direct_apple_installation_url: 'https://example.com/direct-apple',
                        airalo_code: null,
                        apn_type: 'general',
                        apn_value: null,
                        is_roaming: false,
                        confirmation_code: null,
                    },
                ],
            },
            meta: { message: 'Order submitted successfully' },
        };

        global.fetch = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockAccessTokenResponse),
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockAiraloOrderResponse),
            } as Response);

        const result = await provider.purchase(request);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.providerOrderId).toBe('12345');
            expect(result.qrCodeUrl).toBe('https://example.com/qr.png');
            expect(result.iccid).toBe('test-iccid');
            expect(result.activationCode).toBe('test-lpa');
            expect(result.directAppleInstallationUrl).toBe('https://example.com/direct-apple');
        }
    });

    describe('getPackages', () => {
        test('should return Airalo packages on success', async () => {
            const provider = new AiraloProvider(config);

            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAccessTokenResponse),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAiraloPackageResponse),
                } as Response);

            const packages = await provider.getPackages();
            expect(packages).toEqual(mockAiraloPackageResponse);
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(global.fetch).toHaveBeenCalledWith(
                `${config.apiEndpoint}/packages?limit=1000`,
                expect.any(Object)
            );
        });

        test('should throw an error on API failure', async () => {
            const provider = new AiraloProvider(config);

            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAccessTokenResponse),
                } as Response)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    json: () => Promise.resolve({ meta: { message: 'Failed to fetch' } }),
                } as Response);

            await expect(provider.getPackages()).rejects.toThrow(
                'Failed to fetch Airalo packages: HTTP 500 - Failed to fetch'
            );
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('syncProducts', () => {
        test('should return a flattened array of EsimProduct objects', async () => {
            const provider = new AiraloProvider(config);

            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAccessTokenResponse),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAiraloPackageResponse),
                } as Response);

            const esimProducts = await provider.syncProducts(config.id);

            expect(esimProducts).toHaveLength(3); // 2 from US, 1 from Global
            expect(esimProducts[0]).toEqual(
                expect.objectContaining<EsimProduct>({
                    id: `${config.id}-pkg-100gb-30d`,
                    name: 'USA Package - 100GB / 30 Days',
                    slug: 'country-package',
                    country: 'US',
                    providerId: config.id,
                    providerSku: '101',
                    providerPackageId: 'pkg-100gb-30d',
                    price: 30, // USD net price from mock
                    dataAmount: 100,
                    dataUnit: 'GB',
                    durationDays: 30,
                    isActive: true,
                })
            );

            expect(esimProducts[1]).toEqual(
                expect.objectContaining<EsimProduct>({
                    id: `${config.id}-pkg-50gb-15d`,
                    name: 'USA Package - 50GB / 15 Days',
                    slug: 'country-package',
                    country: 'US',
                    providerId: config.id,
                    providerSku: '101',
                    providerPackageId: 'pkg-50gb-15d',
                    price: 15, // USD net price from mock
                    dataAmount: 50,
                    dataUnit: 'GB',
                    durationDays: 15,
                    isActive: true,
                })
            );

            expect(esimProducts[2]).toEqual(
                expect.objectContaining<EsimProduct>({
                    id: `${config.id}-pkg-20gb-30d-global`,
                    name: 'Global Package - 20GB / 30 Days Global',
                    slug: 'global-package',
                    country: '',
                    providerId: config.id,
                    providerSku: '201',
                    providerPackageId: 'pkg-20gb-30d-global',
                    price: 50, // USD net price from mock
                    dataAmount: 20,
                    dataUnit: 'GB',
                    durationDays: 30,
                    isActive: true,
                })
            );

            // Check that createdAt and updatedAt are present and are valid ISO strings
            esimProducts.forEach(product => {
                expect(product.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
                expect(product.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
            });
        });

        test('should throw an error if getPackages fails', async () => {
            const provider = new AiraloProvider(config);

            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAccessTokenResponse),
                } as Response)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    json: () => Promise.resolve({ meta: { message: 'Failed to fetch' } }),
                } as Response);

            await expect(provider.syncProducts(config.id)).rejects.toThrow(
                'Failed to fetch Airalo packages: HTTP 500 - Failed to fetch'
            );
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('getSimInstructions', () => {
        const mockSimInstructionsResponse = {
            data: {
                instructions: {
                    en: 'Step 1: Turn on roaming. Step 2: Enjoy!',
                },
            },
            meta: {
                message: 'Instructions retrieved successfully',
            },
        };

        test('should return SIM instructions on success', async () => {
            const provider = new AiraloProvider(config);
            const simId = 'test-sim-id-123';

            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAccessTokenResponse),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockSimInstructionsResponse),
                } as Response);

            const instructions = await provider.getSimInstructions(simId);
            expect(instructions).toEqual(mockSimInstructionsResponse);
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(global.fetch).toHaveBeenCalledWith(
                `${config.apiEndpoint}/sims/${simId}/instructions`,
                expect.any(Object)
            );
        });

        test('should throw an error on API failure', async () => {
            const provider = new AiraloProvider(config);
            const simId = 'test-sim-id-123';

            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAccessTokenResponse),
                } as Response)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 404,
                    statusText: 'Not Found',
                    json: () => Promise.resolve({ meta: { message: 'SIM not found' } }),
                } as Response);

            await expect(provider.getSimInstructions(simId)).rejects.toThrow(
                'Failed to fetch Airalo SIM instructions: HTTP 404 - SIM not found'
            );
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    // =========================================================================
    // TDD Error Handling Tests (Part 3 - Task T.1)
    // =========================================================================

    describe('Error Handling', () => {
        const request: EsimPurchaseRequest = {
            providerSku: 'test-sku',
            customerEmail: 'test@example.com',
            correlationId: 'test-correlation-id',
            quantity: 1,
        };

        describe('Authentication Errors', () => {
            test('purchase should handle 401 authentication error', async () => {
                const provider = new AiraloProvider(config);

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 401,
                        json: () => Promise.resolve({ error: { message: 'Invalid or expired token' } }),
                    } as Response);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('authentication');
                    expect(result.isRetryable).toBe(false);
                }
            });

            test('purchase should handle 403 forbidden error', async () => {
                const provider = new AiraloProvider(config);

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 403,
                        json: () => Promise.resolve({ error: { message: 'Access denied' } }),
                    } as Response);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('authentication');
                    expect(result.isRetryable).toBe(false);
                }
            });
        });

        describe('Rate Limit Errors', () => {
            test('purchase should handle 429 rate limit error as retryable', async () => {
                const provider = new AiraloProvider(config);

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 429,
                        json: () => Promise.resolve({ error: { message: 'Too many requests' } }),
                    } as Response);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('rate_limit');
                    expect(result.isRetryable).toBe(true);
                }
            });
        });

        describe('Server Errors', () => {
            test('purchase should handle 500 server error as retryable', async () => {
                const provider = new AiraloProvider(config);

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 500,
                        json: () => Promise.resolve({ error: { message: 'Internal server error' } }),
                    } as Response);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('provider_error');
                    expect(result.isRetryable).toBe(true);
                }
            });

            test('purchase should handle 503 service unavailable as retryable', async () => {
                const provider = new AiraloProvider(config);

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 503,
                        json: () => Promise.resolve({ error: { message: 'Service unavailable' } }),
                    } as Response);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('provider_error');
                    expect(result.isRetryable).toBe(true);
                }
            });
        });

        describe('Validation Errors', () => {
            test('purchase should handle 400 bad request as non-retryable', async () => {
                const provider = new AiraloProvider(config);

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 400,
                        json: () => Promise.resolve({ error: { message: 'Invalid package_id' } }),
                    } as Response);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('validation');
                    expect(result.isRetryable).toBe(false);
                }
            });

            test('purchase should handle 422 validation error as non-retryable', async () => {
                const provider = new AiraloProvider(config);

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 422,
                        json: () => Promise.resolve({ error: { message: 'Unprocessable entity' } }),
                    } as Response);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('validation');
                    expect(result.isRetryable).toBe(false);
                }
            });
        });

        describe('Network Errors', () => {
            test('purchase should handle network timeout', async () => {
                const provider = new AiraloProvider(config);

                const abortError = new Error('The operation was aborted');
                abortError.name = 'AbortError';

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockRejectedValueOnce(abortError);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('timeout');
                    expect(result.isRetryable).toBe(true);
                }
            });

            test('purchase should handle fetch network error', async () => {
                const provider = new AiraloProvider(config);

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockRejectedValueOnce(new Error('fetch failed: network error'));

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('network_error');
                    expect(result.isRetryable).toBe(true);
                }
            });
        });

        describe('Empty Response Handling', () => {
            test('purchase should handle empty sims array', async () => {
                const provider = new AiraloProvider(config);

                const emptySimsResponse = {
                    data: {
                        id: 12345,
                        sims: [], // Empty array
                    },
                    meta: { message: 'Order created but no SIMs available' },
                };

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(emptySimsResponse),
                    } as Response);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('provider_error');
                    // Error message comes from meta.message or default
                    expect(result.errorMessage).toBeTruthy();
                    expect(result.isRetryable).toBe(false);
                }
            });

            test('purchase should handle missing data field', async () => {
                const provider = new AiraloProvider(config);

                const missingDataResponse = {
                    meta: { message: 'Error' },
                };

                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(mockAccessTokenResponse),
                    } as Response)
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(missingDataResponse),
                    } as Response);

                const result = await provider.purchase(request);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorType).toBe('provider_error');
                }
            });
        });
    });

    describe('Token Management', () => {
        test('should cache access token until expiry', async () => {
            const provider = new AiraloProvider(config);

            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAccessTokenResponse),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAiraloPackageResponse),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockAiraloPackageResponse),
                } as Response);

            // First call - should request token
            await provider.getPackages();
            // Second call - should reuse cached token
            await provider.getPackages();

            // Token endpoint should only be called once
            const tokenCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
                (call) => call[0].includes('/token')
            );
            expect(tokenCalls.length).toBe(1);
        });

        test('should handle token refresh failure gracefully', async () => {
            const provider = new AiraloProvider(config);

            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    json: () => Promise.resolve({ error: { message: 'Invalid credentials' } }),
                } as Response);

            await expect(provider.healthCheck()).resolves.toBe(false);
        });

        test('getAccessToken should throw error when token response missing access_token', async () => {
            const provider = new AiraloProvider(config);

            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ expires_in: 3600 }), // Missing access_token
                } as Response);

            await expect(provider.healthCheck()).resolves.toBe(false);
        });
    });
});