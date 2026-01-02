import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth, escapeFilterValue } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

// Allowed status values (whitelist)
const ALLOWED_STATUSES = ['pending', 'payment_received', 'fulfillment_started', 'completed', 'failed', 'provider_failed'];
const ALLOWED_CHANNELS = ['stripe', 'smartstore', 'tosspay', 'website'];

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { searchParams } = new URL(request.url);

      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100); // Cap at 100
      const status = searchParams.get('status');
      const search = searchParams.get('search');
      const channel = searchParams.get('channel');
      const from = searchParams.get('from');
      const to = searchParams.get('to');

      // Build filter with proper escaping
      const filters: string[] = [];

      if (status) {
        // Validate status against whitelist
        if (status === 'pending') {
          filters.push(`(status = "pending" || status = "payment_received" || status = "fulfillment_started")`);
        } else if (status === 'failed') {
          filters.push(`(status = "failed" || status = "provider_failed")`);
        } else if (ALLOWED_STATUSES.includes(status)) {
          filters.push(`status = "${status}"`);
        }
        // Invalid status values are silently ignored (safe default)
      }

      if (search) {
        const escaped = escapeFilterValue(search);
        filters.push(`(customer_email ~ "${escaped}" || order_id ~ "${escaped}")`);
      }

      if (channel && ALLOWED_CHANNELS.includes(channel)) {
        filters.push(`sales_channel = "${channel}"`);
      }

      if (from) {
        // Validate ISO date format
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          filters.push(`created >= "${fromDate.toISOString()}"`);
        }
      }

      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          filters.push(`created <= "${toDate.toISOString()}"`);
        }
      }

      const filter = filters.length > 0 ? filters.join(' && ') : undefined;

      const options: Record<string, unknown> = {
        expand: 'product',
      };

      if (filter) {
        options.filter = filter;
      }

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
      logger.error('admin_orders_fetch_failed', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }
  });
}
