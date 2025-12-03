/**
 * Resend Email Service
 *
 * Handles email delivery for eSIM QR codes.
 *
 * Task: T028
 */

import { Resend } from 'resend';
import { getConfig } from './config';
import { createEsimDeliveryEmail } from './email-templates/esim-delivery';

let resendInstance: Resend | null = null;

/**
 * Get Resend client singleton
 */
export function getResend(): Resend {
  if (!resendInstance) {
    const config = getConfig();
    resendInstance = new Resend(config.email.resendApiKey);
  }
  return resendInstance;
}

/**
 * eSIM delivery email data
 */
export interface EsimEmailData {
  qrCodeUrl: string;
  iccid: string;
  productName: string;
  activationCode?: string;
}

/**
 * Send eSIM delivery email
 */
export async function sendEsimEmail(
  customerEmail: string,
  esimData: EsimEmailData,
  correlationId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();
  const resend = getResend();

  const { subject, html, text } = createEsimDeliveryEmail(esimData);

  try {
    const result = await resend.emails.send({
      from: config.email.fromEmail,
      to: customerEmail,
      subject,
      html,
      text,
      headers: {
        'X-Correlation-ID': correlationId,
      },
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
