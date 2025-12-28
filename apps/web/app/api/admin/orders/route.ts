import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const channel = searchParams.get('channel');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const sort = searchParams.get('sort') || '-created';

    // Build filter
    const filters: string[] = [];

    if (status) {
      if (status === 'pending') {
        filters.push(`(status = "pending" || status = "payment_received" || status = "fulfillment_started")`);
      } else if (status === 'failed') {
        filters.push(`(status = "failed" || status = "provider_failed")`);
      } else {
        filters.push(`status = "${status}"`);
      }
    }

    if (search) {
      filters.push(`(customer_email ~ "${search}" || order_id ~ "${search}")`);
    }

    if (channel) {
      filters.push(`sales_channel = "${channel}"`);
    }

    if (from) {
      filters.push(`created >= "${from}"`);
    }

    if (to) {
      filters.push(`created <= "${to}"`);
    }

    const filter = filters.length > 0 ? filters.join(' && ') : undefined;

    const options: Record<string, unknown> = {
      expand: 'product',
    };

    if (filter) {
      options.filter = filter;
    }

    // Note: sort parameter may cause issues with some PocketBase versions
    // Removing sort for now - orders will be returned in default order

    const orders = await pb.collection(Collections.ORDERS).getList(page, limit, options);

    // Transform orders to include productName
    const items = orders.items.map((order) => ({
      id: order.id,
      orderNumber: order.order_id || order.id,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      productName: order.expand?.product?.name || 'Unknown',
      productId: order.product,
      totalPrice: order.amount || 0,
      status: order.status,
      salesChannel: order.sales_channel || 'website',
      created: order.created,
      updated: order.updated,
      esimIccid: order.esim_iccid,
      esimQrCode: order.esim_qr_code_url,
      esimActivationCode: order.esim_activation_code,
      errorMessage: order.error_message,
    }));

    return NextResponse.json({
      items,
      page: orders.page,
      perPage: orders.perPage,
      totalItems: orders.totalItems,
      totalPages: orders.totalPages,
    });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
