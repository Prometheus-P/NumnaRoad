import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Reset config singleton between tests
vi.mock('@/lib/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/config')>();
  return {
    ...original,
    getConfig: vi.fn().mockImplementation(() => ({
      pocketbase: {
        url: 'http://localhost:8090',
        adminEmail: 'admin@test.com',
        adminPassword: 'test_password',
      },
      stripe: {
        secretKey: 'sk_test_mock',
        publishableKey: 'pk_test_mock',
        webhookSecret: 'whsec_test_mock_secret',
      },
      esimProviders: {
        esimCard: {
          apiKey: 'test_esimcard_key',
          apiUrl: 'https://api.esimcard.test',
        },
        mobimatter: {
          apiKey: 'test_mobimatter_key',
          apiUrl: 'https://api.mobimatter.test',
        },
        airalo: {
          apiKey: 'test_airalo_key',
          apiUrl: 'https://api.airalo.test',
        },
      },
      email: {
        resendApiKey: 'test_resend_key',
        fromEmail: 'test@numnaroad.test',
      },
      n8n: {
        webhookUrl: 'http://localhost:5678/webhook',
        apiKey: 'test_n8n_key',
      },
      sentry: {
        dsn: '',
      },
      app: {
        nodeEnv: 'test',
        url: 'http://localhost:3000',
        isProduction: false,
        isDevelopment: false,
      },
    })),
    resetConfig: vi.fn(),
  };
});
