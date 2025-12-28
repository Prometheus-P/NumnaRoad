import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pb = await getAdminPocketBase();

    const order = await pb.collection(Collections.ORDERS).getOne(id, {
      expand: 'product_id',
    });

    // Fetch automation logs for this order
    let logs: Array<{
      id: string;
      stepName: string;
      status: string;
      providerName?: string;
      errorMessage?: string;
      durationMs?: number;
      created: string;
    }> = [];

    try {
      const logsResult = await pb.collection(Collections.AUTOMATION_LOGS).getFullList({
        filter: `orderId = "${id}"`,
        sort: 'created',
      });
      logs = logsResult.map((log) => ({
        id: log.id,
        stepName: log.stepName,
        status: log.status,
        providerName: log.providerName,
        errorMessage: log.errorMessage,
        durationMs: log.durationMs,
        created: log.created,
      }));
    } catch {
      // Logs collection might not exist
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.order_number || order.id,
      externalOrderId: order.external_order_id,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      productId: order.product_id,
      productName: order.product_name || order.expand?.product_id?.name || 'Unknown',
      quantity: order.quantity || 1,
      totalPrice: order.total_price || 0,
      currency: order.currency || 'KRW',
      status: order.status,
      paymentStatus: order.payment_status,
      salesChannel: order.sales_channel || 'stripe',
      providerUsed: order.provider_used,
      esimIccid: order.esim_iccid,
      esimQrCode: order.esim_qr_code,
      esimActivationCode: order.esim_activation_code,
      errorMessage: order.error_message,
      metadata: order.metadata,
      created: order.created,
      updated: order.updated,
      logs,
    });
  } catch (error) {
    console.error('Failed to fetch order:', error);
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pb = await getAdminPocketBase();
    const body = await request.json();

    const order = await pb.collection(Collections.ORDERS).update(id, body);

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
