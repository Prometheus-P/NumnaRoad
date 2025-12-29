import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { sendEsimEmail } from '@/lib/resend';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pb = await getAdminPocketBase();

    // Fetch order
    const order = await pb.collection(Collections.ORDERS).getOne(id);

    // Validate eSIM data exists
    if (!order.esim_iccid || !order.esim_activation_code) {
      return NextResponse.json(
        { error: 'Order does not have eSIM data to send' },
        { status: 400 }
      );
    }

    // Validate customer email exists
    if (!order.customer_email) {
      return NextResponse.json(
        { error: 'Order does not have customer email' },
        { status: 400 }
      );
    }

    // Send email
    const correlationId = `resend-${id}-${Date.now()}`;
    const result = await sendEsimEmail(
      order.customer_email,
      {
        qrCodeUrl: order.esim_qr_code || '',
        iccid: order.esim_iccid,
        productName: order.product_name || 'eSIM',
        activationCode: order.esim_activation_code,
      },
      correlationId
    );

    // Log the resend attempt
    try {
      await pb.collection(Collections.AUTOMATION_LOGS).create({
        orderId: id,
        stepName: 'email_resend',
        status: result.success ? 'success' : 'error',
        errorMessage: result.error,
        metadata: {
          correlationId,
          messageId: result.messageId,
          customerEmail: order.customer_email,
        },
      });
    } catch {
      console.warn('Failed to create automation log for email resend');
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Failed to resend email:', error);
    return NextResponse.json(
      { error: 'Failed to resend email' },
      { status: 500 }
    );
  }
}
