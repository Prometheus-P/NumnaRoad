/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase Hook: Orders Collection
 *
 * Triggers n8n workflow on order creation.
 *
 * Task: T024
 */

/**
 * After order creation, trigger n8n order processing workflow
 *
 * This is a backup trigger in case the webhook handler fails to call n8n.
 * The n8n workflow is idempotent, so duplicate triggers are safe.
 */
onRecordAfterCreateRequest((e) => {
  const record = e.record;

  // Only trigger for pending orders (new orders)
  if (record.get("status") !== "pending") {
    return;
  }

  const n8nWebhookUrl = $os.getenv("N8N_WEBHOOK_URL");
  const n8nApiKey = $os.getenv("N8N_API_KEY");

  if (!n8nWebhookUrl) {
    console.log("N8N_WEBHOOK_URL not configured, skipping n8n trigger");
    return;
  }

  const orderId = record.id;
  const correlationId = record.get("correlation_id");

  console.log("Triggering n8n for order " + orderId + " (correlation: " + correlationId + ")");

  try {
    const res = $http.send({
      url: n8nWebhookUrl + "/webhook/order-processing",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + n8nApiKey,
      },
      body: JSON.stringify({
        orderId: orderId,
        correlationId: correlationId,
        source: "pocketbase_hook",
        timestamp: new Date().toISOString(),
      }),
      timeout: 10,
    });

    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("n8n triggered successfully for order " + orderId);
    } else {
      console.error("n8n trigger failed with status " + res.statusCode + ": " + res.raw);
    }
  } catch (err) {
    console.error("Failed to trigger n8n for order " + orderId + ":", err);
  }
}, "orders");

/**
 * Validate order state transitions
 *
 * Valid transitions:
 * - pending -> processing
 * - processing -> completed
 * - processing -> failed
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

  // Define valid transitions
  const validTransitions = {
    pending: ["processing"],
    processing: ["completed", "failed"],
    completed: [],
    failed: [],
  };

  const allowedNextStates = validTransitions[oldStatus] || [];

  if (allowedNextStates.indexOf(newStatus) === -1) {
    const allowedStr = allowedNextStates.length > 0 ? allowedNextStates.join(", ") : "none (terminal state)";
    throw new BadRequestError(
      "Invalid state transition: " + oldStatus + " -> " + newStatus + ". Allowed: " + allowedStr
    );
  }

  // Auto-set completed_at when transitioning to completed
  if (newStatus === "completed" && !record.get("completed_at")) {
    record.set("completed_at", new Date().toISOString());
  }
}, "orders");
