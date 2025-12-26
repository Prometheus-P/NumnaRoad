import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * POST /api/checkout/create-session
 * Stripe 결제 세션 생성
 */

const sessionSchema = z.object({
  orderId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    const validation = sessionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { orderId, successUrl, cancelUrl } = validation.data;

    // Stripe SDK는 실제 환경에서 설정 필요
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // TODO: PocketBase에서 주문 조회
    // const order = await pb.collection('orders').getFirstListItem(`order_id="${orderId}"`);

    // TODO: Stripe 세션 생성
    // const session = await stripe.checkout.sessions.create({
    //   payment_method_types: ['card'],
    //   line_items: [{
    //     price_data: {
    //       currency: 'krw',
    //       product_data: {
    //         name: order.expand.product.name,
    //       },
    //       unit_amount: order.amount,
    //     },
    //     quantity: 1,
    //   }],
    //   mode: 'payment',
    //   success_url: successUrl,
    //   cancel_url: cancelUrl,
    //   metadata: {
    //     order_id: orderId,
    //   },
    // });

    // 임시 응답 (실제 구현 시 Stripe 세션 반환)
    return NextResponse.json({
      success: true,
      data: {
        sessionId: 'cs_test_placeholder',
        url: 'https://checkout.stripe.com/placeholder',
      },
      message: 'This is a placeholder. Stripe integration required.',
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
