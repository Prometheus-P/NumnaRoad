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
import {
  createOrderFailedEmail,
  OrderFailedEmailData,
} from './email-templates/order-failed';
import {
  createAdminNotificationEmail,
  AdminNotificationData,
} from './email-templates/admin-notification';

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

/**
 * Send order failed email to customer
 */
export async function sendOrderFailedEmail(
  customerEmail: string,
  data: OrderFailedEmailData,
  correlationId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();
  const resend = getResend();

  const { subject, html, text } = createOrderFailedEmail(data);

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

/**
 * Send admin notification email
 */
export async function sendAdminNotificationEmail(
  data: AdminNotificationData,
  correlationId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();
  const resend = getResend();

  const adminEmail = process.env.ADMIN_EMAIL || config.email.fromEmail;
  const { subject, html, text } = createAdminNotificationEmail(data);

  try {
    const result = await resend.emails.send({
      from: config.email.fromEmail,
      to: adminEmail,
      subject,
      html,
      text,
      headers: correlationId
        ? {
            'X-Correlation-ID': correlationId,
          }
        : undefined,
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
