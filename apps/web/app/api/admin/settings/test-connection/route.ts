import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { getSettingValue } from '@/lib/services/settings-service';

type TestType = 'telegram' | 'email' | 'redteago' | 'airalo' | 'smartstore';

/**
 * POST /api/admin/settings/test-connection
 * Test connection to external services
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const body = await request.json();
      const { type } = body as { type: TestType };

      if (!type) {
        return NextResponse.json(
          { success: false, error: 'type is required' },
          { status: 400 }
        );
      }

      switch (type) {
        case 'telegram': {
          const botToken = await getSettingValue(pb, 'notifications', 'telegram_bot_token');
          const chatId = await getSettingValue(pb, 'notifications', 'telegram_chat_id');

          if (!botToken || !chatId) {
            return NextResponse.json({
              success: false,
              error: 'Telegram bot token or chat ID not configured',
            });
          }

          // Test by getting bot info
          const response = await fetch(
            `https://api.telegram.org/bot${botToken}/getMe`,
            { method: 'GET' }
          );
          const data = await response.json();

          if (!data.ok) {
            return NextResponse.json({
              success: false,
              error: `Telegram API error: ${data.description}`,
            });
          }

          return NextResponse.json({
            success: true,
            message: `Connected to bot: @${data.result.username}`,
          });
        }

        case 'email': {
          const apiKey = await getSettingValue(pb, 'notifications', 'resend_api_key');

          if (!apiKey) {
            return NextResponse.json({
              success: false,
              error: 'Resend API key not configured',
            });
          }

          // Test by listing domains
          const response = await fetch('https://api.resend.com/domains', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });

          if (!response.ok) {
            return NextResponse.json({
              success: false,
              error: 'Invalid Resend API key',
            });
          }

          return NextResponse.json({
            success: true,
            message: 'Resend API key is valid',
          });
        }

        case 'redteago': {
          const apiKey = await getSettingValue(pb, 'esim_providers', 'redteago_api_key');
          const apiUrl = await getSettingValue(pb, 'esim_providers', 'redteago_api_url')
            || 'https://api.redteago.com';

          if (!apiKey) {
            return NextResponse.json({
              success: false,
              error: 'RedteaGO API key not configured',
            });
          }

          // Test API connection
          const response = await fetch(`${apiUrl}/api/product/list`, {
            headers: { 'RTG-apikey': apiKey },
          });

          if (!response.ok) {
            return NextResponse.json({
              success: false,
              error: `RedteaGO API error: ${response.status}`,
            });
          }

          return NextResponse.json({
            success: true,
            message: 'RedteaGO API connection successful',
          });
        }

        case 'airalo': {
          const clientId = await getSettingValue(pb, 'esim_providers', 'airalo_client_id');
          const clientSecret = await getSettingValue(pb, 'esim_providers', 'airalo_client_secret');

          if (!clientId || !clientSecret) {
            return NextResponse.json({
              success: false,
              error: 'Airalo credentials not configured',
            });
          }

          // Test OAuth token generation
          const response = await fetch('https://sandbox-partners-api.airalo.com/v2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'client_credentials',
            }),
          });

          if (!response.ok) {
            return NextResponse.json({
              success: false,
              error: 'Airalo authentication failed',
            });
          }

          return NextResponse.json({
            success: true,
            message: 'Airalo API connection successful',
          });
        }

        case 'smartstore': {
          const appKey = await getSettingValue(pb, 'integrations', 'smartstore_app_key');
          const appSecret = await getSettingValue(pb, 'integrations', 'smartstore_app_secret');

          if (!appKey || !appSecret) {
            return NextResponse.json({
              success: false,
              error: 'SmartStore credentials not configured',
            });
          }

          // SmartStore uses BCRYPT signature - just verify credentials exist
          return NextResponse.json({
            success: true,
            message: 'SmartStore credentials configured (signature-based auth)',
          });
        }

        default:
          return NextResponse.json(
            { success: false, error: `Unknown test type: ${type}` },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('[Settings Test Connection API] error:', error);
      return NextResponse.json(
        { success: false, error: 'Connection test failed' },
        { status: 500 }
      );
    }
  });
}
