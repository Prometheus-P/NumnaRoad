import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

/**
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout Session for eSIM purchase.
 * Includes phone_number_collection for Kakao Alimtalk notifications.
 */

const sessionSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
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

    const { productId, quantity } = validation.data;
    const config = getConfig();

    // Get product from PocketBase
    const pb = await getAdminPocketBase();
    let product;
    try {
      product = await pb.collection('esim_products').getOne(productId);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.is_active) {
      return NextResponse.json(
        { success: false, error: 'Product is not available' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const stripe = getStripe();
    const appUrl = config.app.url;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'krw',
            product_data: {
              name: `${product.country_name} eSIM`,
              description: `${product.data_limit} / ${product.duration}일`,
              metadata: {
                product_id: productId,
              },
            },
            unit_amount: Math.round(product.retail_price),
          },
          quantity,
        },
      ],
      // Enable phone number collection for Kakao Alimtalk
      phone_number_collection: {
        enabled: config.kakaoAlimtalk.enabled,
      },
      customer_creation: 'always',
      success_url: `${appUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/products/${product.slug}`,
      metadata: {
        product_id: productId,
        product_name: product.name,
        country: product.country,
        data_limit: product.data_limit,
        duration: product.duration.toString(),
      },
      // Expand customer_details in webhook
      expand: ['customer_details'],
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('checkout_session_creation_failed', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
