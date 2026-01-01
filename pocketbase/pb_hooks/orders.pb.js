/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase Hook: Orders Collection
 *
 * Order processing is now handled by the inline fulfillment service
 * triggered from the Stripe webhook handler (/api/webhooks/stripe).
 *
 * The n8n workflow trigger has been removed as part of the security fix
 * to prevent "Free Lunch" attacks where eSIMs could be provisioned
 * without payment verification.
 *
 * See: https://github.com/numna-road/numnaroad/issues/94
 *
 * Task: T024 (Updated)
 */

/**
 * Security: Prevent order creation without payment
 *
 * Orders should only be created by the Stripe webhook handler
 * with payment_status = 'paid'. This hook logs any attempts
 * to create orders with unpaid status as a security measure.
 */
onRecordAfterCreateRequest((e) => {
  const record = e.record;
  const paymentStatus = record.get("payment_status");

  // Log security warning if order created without payment
  if (paymentStatus !== "paid") {
    console.warn(JSON.stringify({
      level: "warn",
      event: "unpaid_order_created",
      orderId: record.id,
      paymentStatus: paymentStatus,
      message: "Order created without paid payment_status - investigate source",
      timestamp: new Date().toISOString(),
    }));
  }
}, "orders");

/**
 * Validate order state transitions
 *
 * Valid transitions (Inline Fulfillment Flow):
 * - payment_received -> fulfillment_started (Stripe direct)
 * - payment_received -> awaiting_confirmation (SmartStore deferred)
 * - awaiting_confirmation -> fulfillment_started (customer confirms purchase)
 * - fulfillment_started -> provider_confirmed, provider_failed
 * - provider_confirmed -> email_sent
 * - provider_failed -> fulfillment_started (retry), pending_manual_fulfillment
 * - email_sent -> delivered
 * - pending_manual_fulfillment -> delivered, refund_needed
 * - refund_needed -> refunded
 *
 * Legacy transitions (deprecated, kept for compatibility):
 * - pending -> payment_received
 *
 * Invalid transitions throw an error.
 */
onRecordBeforeUpdateRequest((e) => {
  const record = e.record;
  const originalRecord = e.record.originalCopy();

  const oldStatus = originalRecord.get("status");
  const newStatus = record.get("status");

  // If status hasn't changed, allow
  if (oldStatus === newStatus) {
    return;
  }

  // Define valid transitions for inline fulfillment flow
  const validTransitions = {
    // Legacy
    pending: ["payment_received"],
    // Inline fulfillment flow (Stripe direct or after SmartStore confirmation)
    payment_received: ["fulfillment_started", "awaiting_confirmation"],
    // SmartStore deferred fulfillment: wait for customer purchase confirmation
    awaiting_confirmation: ["fulfillment_started", "refund_needed"],
    fulfillment_started: ["provider_confirmed", "provider_failed"],
    provider_confirmed: ["email_sent"],
    provider_failed: ["fulfillment_started", "pending_manual_fulfillment"],
    email_sent: ["delivered"],
    pending_manual_fulfillment: ["delivered", "refund_needed"],
    refund_needed: ["refunded"],
    // Terminal states
    delivered: [],
    refunded: [],
  };

  const allowedNextStates = validTransitions[oldStatus] || [];

  if (allowedNextStates.indexOf(newStatus) === -1) {
    const allowedStr = allowedNextStates.length > 0 ? allowedNextStates.join(", ") : "none (terminal state)";
    throw new BadRequestError(
      "Invalid state transition: " + oldStatus + " -> " + newStatus + ". Allowed: " + allowedStr
    );
  }

  // Auto-set completed_at when transitioning to delivered
  if (newStatus === "delivered" && !record.get("completed_at")) {
    record.set("completed_at", new Date().toISOString());
  }
}, "orders");
