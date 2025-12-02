import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * POST /api/webhook/stripe
 * Stripe webhook 처리
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // TODO: Stripe webhook 서명 검증
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    //
    // const event = stripe.webhooks.constructEvent(
    //   body,
    //   signature,
    //   webhookSecret
    // );

    // TODO: 이벤트 타입별 처리
    // switch (event.type) {
    //   case 'checkout.session.completed': {
    //     const session = event.data.object;
    //     const orderId = session.metadata?.order_id;
    //
    //     if (orderId) {
    //       // PocketBase에서 주문 업데이트
    //       await pb.collection('orders').update(orderId, {
    //         payment_status: 'paid',
    //         status: 'processing',
    //         payment_id: session.payment_intent,
    //       });
    //
    //       // n8n workflow 트리거 (eSIM 발급)
    //       // await triggerN8NWorkflow(orderId);
    //     }
    //     break;
    //   }
    //
    //   case 'payment_intent.payment_failed': {
    //     const paymentIntent = event.data.object;
    //     // 실패 처리
    //     break;
    //   }
    // }

    return NextResponse.json({
      received: true,
      message: 'Webhook placeholder. Stripe integration required.',
    });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
