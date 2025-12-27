/**
 * Webhook Signature Verification Utilities
 *
 * Provides HMAC-SHA256 signature verification for webhook payloads
 * from various eSIM providers (Airalo, etc.)
 */

import crypto from 'crypto';

/**
 * Verify Airalo webhook signature using HMAC-SHA256
 *
 * @param payload - Raw request body as string
 * @param signature - Signature from x-airalo-signature header
 * @param secret - AIRALO_WEBHOOK_SECRET environment variable
 * @returns boolean indicating if signature is valid
 */
export function verifyAiraloWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('[Webhook Verification] Error verifying signature:', error);
    return false;
  }
}

/**
 * Verify Stripe webhook signature
 * Note: Stripe SDK has built-in verification, but this is a fallback
 *
 * @param payload - Raw request body as string
 * @param signature - Stripe-Signature header value
 * @param secret - Stripe webhook signing secret
 * @returns boolean indicating if signature is valid
 */
export function verifyStripeWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    // Parse Stripe signature header format: t=timestamp,v1=signature
    const elements = signature.split(',');
    const timestampElement = elements.find(e => e.startsWith('t='));
    const signatureElement = elements.find(e => e.startsWith('v1='));

    if (!timestampElement || !signatureElement) {
      return false;
    }

    const timestamp = timestampElement.split('=')[1];
    const receivedSignature = signatureElement.split('=')[1];

    // Create the signed payload
    const signedPayload = `${timestamp}.${payload}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('[Webhook Verification] Error verifying Stripe signature:', error);
    return false;
  }
}

/**
 * Generic HMAC-SHA256 webhook verification
 *
 * @param payload - Raw request body as string
 * @param signature - Signature from header
 * @param secret - Webhook secret
 * @param encoding - Signature encoding (default: 'hex')
 * @returns boolean indicating if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  encoding: 'hex' | 'base64' = 'hex'
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest(encoding);

    // Handle both hex and base64 encoded signatures
    if (encoding === 'hex') {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } else {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );
    }
  } catch (error) {
    console.error('[Webhook Verification] Error verifying signature:', error);
    return false;
  }
}

/**
 * Check if webhook timestamp is within acceptable window
 * Helps prevent replay attacks
 *
 * @param timestamp - Unix timestamp from webhook
 * @param toleranceSeconds - Acceptable time difference (default: 300 = 5 minutes)
 * @returns boolean indicating if timestamp is valid
 */
export function isTimestampValid(
  timestamp: number,
  toleranceSeconds: number = 300
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const difference = Math.abs(now - timestamp);
  return difference <= toleranceSeconds;
}
