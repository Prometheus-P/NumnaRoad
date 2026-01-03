/**
 * Environment configuration loader with validation
 *
 * All environment variables are validated at startup to fail fast
 * if required configuration is missing.
 */

interface Config {
  pocketbase: {
    url: string;
    adminEmail: string;
    adminPassword: string;
  };
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  esimProviders: {
    esimCard: {
      apiKey: string;
      apiUrl: string;
    };
    mobimatter: {
      apiKey: string;
      apiUrl: string;
    };
    airalo: {
      apiKey: string;
      apiUrl: string;
    };
  };
  email: {
    resendApiKey: string;
    fromEmail: string;
  };
  n8n: {
    webhookUrl: string;
    apiKey: string;
  };
  notifications: {
    discordWebhookUrl: string;
  };
  sentry: {
    dsn: string;
  };
  app: {
    nodeEnv: string;
    url: string;
    isProduction: boolean;
    isDevelopment: boolean;
  };
  cors: {
    allowedOrigins: string[];
  };
  featureFlags: {
    useInlineFulfillment: boolean;
  };
  fulfillment: {
    webhookTimeoutMs: number;
    enableEmailNotification: boolean;
    enableDiscordAlerts: boolean;
  };
  smartStore: {
    enabled: boolean;
    appId: string;
    appSecret: string;
    sellerId: string;
    webhookSecret: string;
    apiUrl: string;
  };
  kakaoAlimtalk: {
    enabled: boolean;
    solapi: {
      apiKey: string;
      apiSecret: string;
    };
    kakao: {
      pfId: string;
      senderKey: string;
      esimDeliveryTemplateId: string;
      /** Template for SmartStore order received notification */
      orderReceivedTemplateId: string;
    };
  };
}

let configInstance: Config | null = null;

/**
 * Get required environment variable or throw
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

/**
 * Get CORS allowed origins based on environment
 */
function getCorsOrigins(nodeEnv: string): string[] {
  // Custom origins from environment variable (comma-separated)
  const customOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (customOrigins) {
    return customOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
  }

  // Default origins based on environment
  if (nodeEnv === 'production') {
    return [
      'https://numnaroad.com',
      'https://www.numnaroad.com',
      'https://admin.numnaroad.com',
    ];
  }

  // Development: allow localhost
  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
}

/**
 * Load and validate all configuration
 * Throws on first access if any required variable is missing
 */
export function getConfig(): Config {
  if (configInstance) {
    return configInstance;
  }

  const nodeEnv = optionalEnv('NODE_ENV', 'development');

  // Check if inline fulfillment is enabled
  const useInlineFulfillment = optionalEnv('FEATURE_INLINE_FULFILLMENT', 'false') === 'true';

  configInstance = {
    pocketbase: {
      url: requireEnv('POCKETBASE_URL'),
      adminEmail: requireEnv('POCKETBASE_ADMIN_EMAIL'),
      adminPassword: requireEnv('POCKETBASE_ADMIN_PASSWORD'),
    },
    stripe: {
      secretKey: optionalEnv('STRIPE_SECRET_KEY', ''),
      publishableKey: optionalEnv('STRIPE_PUBLISHABLE_KEY', ''),
      webhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET', ''),
    },
    esimProviders: {
      esimCard: {
        apiKey: optionalEnv('ESIM_CARD_API_KEY', ''),
        apiUrl: optionalEnv('ESIM_CARD_API_URL', ''),
      },
      mobimatter: {
        apiKey: optionalEnv('MOBIMATTER_API_KEY', ''),
        apiUrl: optionalEnv('MOBIMATTER_API_URL', ''),
      },
      airalo: {
        apiKey: optionalEnv('AIRALO_API_KEY', ''),
        apiUrl: optionalEnv('AIRALO_API_URL', 'https://partners-api.airalo.com/v2'),
      },
    },
    email: {
      resendApiKey: requireEnv('RESEND_API_KEY'),
      fromEmail: requireEnv('RESEND_FROM_EMAIL'),
    },
    n8n: {
      // n8n is optional when inline fulfillment is enabled
      webhookUrl: useInlineFulfillment ? optionalEnv('N8N_WEBHOOK_URL', '') : requireEnv('N8N_WEBHOOK_URL'),
      apiKey: useInlineFulfillment ? optionalEnv('N8N_API_KEY', '') : requireEnv('N8N_API_KEY'),
    },
    notifications: {
      discordWebhookUrl: optionalEnv('DISCORD_WEBHOOK_URL', ''),
    },
    sentry: {
      dsn: optionalEnv('SENTRY_DSN', ''),
    },
    app: {
      nodeEnv,
      url: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
      isProduction: nodeEnv === 'production',
      isDevelopment: nodeEnv === 'development',
    },
    cors: {
      allowedOrigins: getCorsOrigins(nodeEnv),
    },
    featureFlags: {
      useInlineFulfillment,
    },
    fulfillment: {
      webhookTimeoutMs: parseInt(optionalEnv('FULFILLMENT_TIMEOUT_MS', '25000'), 10),
      enableEmailNotification: optionalEnv('FULFILLMENT_EMAIL_ENABLED', 'true') === 'true',
      enableDiscordAlerts: optionalEnv('FULFILLMENT_DISCORD_ALERTS', 'true') === 'true',
    },
    smartStore: {
      enabled: optionalEnv('SMARTSTORE_ENABLED', 'false') === 'true',
      appId: optionalEnv('NAVER_COMMERCE_APP_ID', ''),
      appSecret: optionalEnv('NAVER_COMMERCE_APP_SECRET', ''),
      sellerId: optionalEnv('SMARTSTORE_SELLER_ID', ''),
      webhookSecret: optionalEnv('NAVER_COMMERCE_WEBHOOK_SECRET', ''),
      apiUrl: optionalEnv('NAVER_COMMERCE_API_URL', 'https://api.commerce.naver.com/external/v1'),
    },
    kakaoAlimtalk: {
      enabled: optionalEnv('KAKAO_ALIMTALK_ENABLED', 'false') === 'true',
      solapi: {
        apiKey: optionalEnv('SOLAPI_API_KEY', ''),
        apiSecret: optionalEnv('SOLAPI_API_SECRET', ''),
      },
      kakao: {
        pfId: optionalEnv('KAKAO_CHANNEL_PF_ID', ''),
        senderKey: optionalEnv('KAKAO_ALIMTALK_SENDER_KEY', ''),
        esimDeliveryTemplateId: optionalEnv('KAKAO_ESIM_DELIVERY_TEMPLATE_ID', ''),
        orderReceivedTemplateId: optionalEnv('KAKAO_ORDER_RECEIVED_TEMPLATE_ID', ''),
      },
    },
  };

  return configInstance;
}

/**
 * Get provider API key by environment variable name
 * Used by provider adapters to look up their keys dynamically
 */
export function getProviderApiKey(envVarName: string): string {
  const value = process.env[envVarName];
  if (!value) {
    throw new Error(`Missing provider API key: ${envVarName}`);
  }
  return value;
}

/**
 * Reset config singleton (for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}
