/**
 * Kakao Alimtalk Notification Service
 *
 * Sends eSIM delivery notifications to customers via Kakao Alimtalk.
 * Uses SOLAPI as the messaging gateway.
 *
 * @see https://developers.solapi.dev/
 */

import SolapiMessageService from 'solapi';

// =============================================================================
// Types
// =============================================================================

export interface AlimtalkSendParams {
  /** Korean phone number (010XXXXXXXX or +82XXXXXXXXXX) */
  to: string;
  /** Order ID for template variable */
  orderId: string;
  /** URL to order detail page */
  orderDetailUrl: string;
  /** Optional customer name for personalization */
  customerName?: string;
}

export interface AlimtalkSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type AlimtalkSendFn = (params: AlimtalkSendParams) => Promise<AlimtalkSendResult>;

export interface AlimtalkConfig {
  enabled: boolean;
  solapi: {
    apiKey: string;
    apiSecret: string;
  };
  kakao: {
    pfId: string;
    senderKey: string;
    esimDeliveryTemplateId: string;
  };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT_MS = 10000;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize Korean phone number to 010XXXXXXXX format
 *
 * @param phone - Phone number in various formats
 * @returns Normalized phone number or null if invalid
 *
 * @example
 * formatKoreanPhone('010-1234-5678') // '01012345678'
 * formatKoreanPhone('+821012345678') // '01012345678'
 * formatKoreanPhone('821012345678')  // '01012345678'
 * formatKoreanPhone('01012345678')   // '01012345678'
 * formatKoreanPhone('invalid')       // null
 */
export function formatKoreanPhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle +82 or 82 country code prefix
  if (digits.startsWith('82') && digits.length >= 11) {
    const withoutCountryCode = '0' + digits.slice(2);
    if (withoutCountryCode.length === 11 && withoutCountryCode.startsWith('010')) {
      return withoutCountryCode;
    }
  }

  // Handle direct 010 format
  if (digits.startsWith('010') && digits.length === 11) {
    return digits;
  }

  // Invalid format
  return null;
}

/**
 * Check if Kakao Alimtalk is properly configured
 */
export function isAlimtalkConfigured(config: AlimtalkConfig): boolean {
  return (
    config.enabled &&
    !!config.solapi.apiKey &&
    !!config.solapi.apiSecret &&
    !!config.kakao.pfId &&
    !!config.kakao.senderKey &&
    !!config.kakao.esimDeliveryTemplateId
  );
}

/**
 * Create a SOLAPI message service client
 */
function createSolapiClient(config: AlimtalkConfig): SolapiMessageService {
  return new SolapiMessageService(config.solapi.apiKey, config.solapi.apiSecret);
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Send eSIM delivery notification via Kakao Alimtalk
 *
 * @param params - Send parameters
 * @param config - Alimtalk configuration
 * @returns Send result with success status and message ID
 */
export async function sendEsimDeliveryAlimtalk(
  params: AlimtalkSendParams,
  config: AlimtalkConfig
): Promise<AlimtalkSendResult> {
  // Check configuration
  if (!isAlimtalkConfigured(config)) {
    return {
      success: false,
      error: 'Kakao Alimtalk is not properly configured',
    };
  }

  // Validate and format phone number
  const formattedPhone = formatKoreanPhone(params.to);
  if (!formattedPhone) {
    return {
      success: false,
      error: `Invalid Korean phone number format: ${params.to}`,
    };
  }

  try {
    const client = createSolapiClient(config);

    // Send Alimtalk message
    const result = await client.send({
      to: formattedPhone,
      from: config.kakao.senderKey,
      kakaoOptions: {
        pfId: config.kakao.pfId,
        templateId: config.kakao.esimDeliveryTemplateId,
        variables: {
          '#{orderId}': params.orderId,
          '#{customerName}': params.customerName || '고객',
        },
        buttons: [
          {
            buttonType: 'WL',
            buttonName: '설치 가이드 보기',
            linkMo: params.orderDetailUrl,
            linkPc: params.orderDetailUrl,
          },
        ],
      },
    });

    return {
      success: true,
      messageId: result.groupId || result.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Kakao Alimtalk] Send failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create an Alimtalk send function with pre-configured settings
 *
 * @param config - Alimtalk configuration
 * @returns Function that sends Alimtalk messages
 */
export function createAlimtalkSendFn(config: AlimtalkConfig): AlimtalkSendFn {
  return async (params: AlimtalkSendParams) => {
    return sendEsimDeliveryAlimtalk(params, config);
  };
}

/**
 * Test Alimtalk configuration by validating credentials
 * Note: This doesn't actually send a message, just validates the config
 */
export async function testAlimtalkConnection(config: AlimtalkConfig): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isAlimtalkConfigured(config)) {
    return {
      success: false,
      error: 'Kakao Alimtalk is not properly configured. Check environment variables.',
    };
  }

  try {
    const client = createSolapiClient(config);
    // Try to get balance to verify credentials
    await client.getBalance();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to connect to SOLAPI: ${errorMessage}`,
    };
  }
}
