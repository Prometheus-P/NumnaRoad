/**
 * SmartStore Inquiries API
 *
 * Fetch and manage customer inquiries from SmartStore.
 * Integrates with CS reply templates for quick responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSmartStoreClient } from '@services/sales-channels/smartstore';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { logger } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

interface InquiryWithOrder {
  inquiryId: string;
  productId: string;
  productName: string;
  inquiryType: string;
  title: string;
  content: string;
  createdDate: string;
  answeredDate?: string;
  isAnswered: boolean;
  inquirer: {
    name: string;
    memberId: string;
  };
  linkedOrder?: {
    id: string;
    externalOrderId: string;
    status: string;
    customerEmail: string;
    amount: number;
  };
}

// =============================================================================
// GET /api/admin/smartstore/inquiries
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const client = getSmartStoreClient();
    const { searchParams } = new URL(request.url);

    const answered = searchParams.get('answered');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await client.getInquiries({
      answered: answered === null ? undefined : answered === 'true',
      page,
      pageSize,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errorMessage || 'Failed to fetch inquiries',
          errorType: result.errorType,
        },
        { status: 500 }
      );
    }

    // Enrich inquiries with linked order data if available
    const inquiries = result.data || [];
    const enrichedInquiries: InquiryWithOrder[] = [];

    if (inquiries.length > 0) {
      const pb = await getAdminPocketBase();

      for (const inquiry of inquiries) {
        const enriched: InquiryWithOrder = {
          ...inquiry,
          linkedOrder: undefined,
        };

        // Try to find linked order by product ID or inquiry metadata
        try {
          const orders = await pb.collection('orders').getList(1, 1, {
            filter: `sales_channel = 'smartstore' && metadata.productId = '${inquiry.productId}'`,
            sort: '-created',
          });

          if (orders.items.length > 0) {
            const order = orders.items[0];
            enriched.linkedOrder = {
              id: order.id,
              externalOrderId: order.external_order_id,
              status: order.status,
              customerEmail: order.customer_email,
              amount: order.amount,
            };
          }
        } catch {
          // Ignore lookup errors, order linking is optional
        }

        enrichedInquiries.push(enriched);
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichedInquiries,
      pagination: {
        page,
        pageSize,
        total: inquiries.length,
      },
    });
  } catch (error) {
    logger.error('smartstore_inquiries_fetch_failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inquiries' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/admin/smartstore/inquiries (Reply to inquiry)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const client = getSmartStoreClient();
    const body = await request.json();

    const { inquiryId, content, templateId } = body as {
      inquiryId: string;
      content?: string;
      templateId?: string;
    };

    if (!inquiryId) {
      return NextResponse.json(
        { success: false, error: 'inquiryId is required' },
        { status: 400 }
      );
    }

    let replyContent = content;

    // If templateId provided, fetch template and use its content
    if (templateId && !content) {
      try {
        const pb = await getAdminPocketBase();
        const template = await pb.collection('cs_reply_templates').getOne(templateId);
        replyContent = template.content;
      } catch {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }
    }

    if (!replyContent) {
      return NextResponse.json(
        { success: false, error: 'content or templateId is required' },
        { status: 400 }
      );
    }

    // Apply variable substitutions if provided
    if (body.variables && typeof body.variables === 'object') {
      for (const [key, value] of Object.entries(body.variables)) {
        replyContent = replyContent.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          String(value)
        );
      }
    }

    const result = await client.replyToInquiry(inquiryId, replyContent);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errorMessage || 'Failed to send reply',
          errorType: result.errorType,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully',
    });
  } catch (error) {
    logger.error('smartstore_inquiry_reply_failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}
