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
  sentry: {
    dsn: string;
  };
  app: {
    nodeEnv: string;
    url: string;
    isProduction: boolean;
    isDevelopment: boolean;
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
 * Load and validate all configuration
 * Throws on first access if any required variable is missing
 */
export function getConfig(): Config {
  if (configInstance) {
    return configInstance;
  }

  const nodeEnv = optionalEnv('NODE_ENV', 'development');

  configInstance = {
    pocketbase: {
      url: requireEnv('POCKETBASE_URL'),
      adminEmail: requireEnv('POCKETBASE_ADMIN_EMAIL'),
      adminPassword: requireEnv('POCKETBASE_ADMIN_PASSWORD'),
    },
    stripe: {
      secretKey: requireEnv('STRIPE_SECRET_KEY'),
      publishableKey: requireEnv('STRIPE_PUBLISHABLE_KEY'),
      webhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET'),
    },
    esimProviders: {
      esimCard: {
        apiKey: requireEnv('ESIM_CARD_API_KEY'),
        apiUrl: requireEnv('ESIM_CARD_API_URL'),
      },
      mobimatter: {
        apiKey: requireEnv('MOBIMATTER_API_KEY'),
        apiUrl: requireEnv('MOBIMATTER_API_URL'),
      },
      airalo: {
        apiKey: requireEnv('AIRALO_API_KEY'),
        apiUrl: requireEnv('AIRALO_API_URL'),
      },
    },
    email: {
      resendApiKey: requireEnv('RESEND_API_KEY'),
      fromEmail: requireEnv('RESEND_FROM_EMAIL'),
    },
    n8n: {
      webhookUrl: requireEnv('N8N_WEBHOOK_URL'),
      apiKey: requireEnv('N8N_API_KEY'),
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
