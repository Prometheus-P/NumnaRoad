import Stripe from 'stripe';
import { getConfig } from './config';

/**
 * Stripe client singleton
 *
 * IMPORTANT: This client is for server-side only (API routes).
 * Never expose the secret key to the client.
 */
let stripeInstance: Stripe | null = null;

/**
 * Get Stripe client singleton
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const config = getConfig();
    stripeInstance = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Verify Stripe webhook signature
 *
 * @param payload - Raw request body as Buffer
 * @param signature - Stripe-Signature header value
 * @returns Parsed Stripe event
 * @throws Error if signature verification fails
 */
export function verifyWebhookSignature(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const config = getConfig();
  const stripe = getStripe();

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
}

/**
 * Event types we handle
 */
export const WebhookEvents = {
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
} as const;

export type WebhookEventType = typeof WebhookEvents[keyof typeof WebhookEvents];
