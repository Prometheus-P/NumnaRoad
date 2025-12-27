import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get config from environment
    const appId = process.env.NAVER_COMMERCE_APP_ID || '';
    let appSecret = process.env.NAVER_COMMERCE_APP_SECRET || '';

    // Decode base64 secret if needed
    if (!appSecret && process.env.NAVER_COMMERCE_APP_SECRET_B64) {
      appSecret = Buffer.from(process.env.NAVER_COMMERCE_APP_SECRET_B64, 'base64').toString('utf-8');
    }

    const timestamp = Date.now().toString();
    const password = `${appId}_${timestamp}`;

    // Generate signature
    const hashed = bcrypt.hashSync(password, appSecret);
    const signature = Buffer.from(hashed).toString('base64');

    // Try to get token
    const response = await fetch('https://api.commerce.naver.com/external/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: appId,
        timestamp: timestamp,
        client_secret_sign: signature,
        grant_type: 'client_credentials',
        type: 'SELF',
      }).toString(),
    });

    const responseText = await response.text();

    return NextResponse.json({
      debug: {
        appIdSet: !!appId,
        appIdLength: appId.length,
        secretSet: !!appSecret,
        secretLength: appSecret.length,
        secretPrefix: appSecret.substring(0, 7),
        timestamp,
        signatureLength: signature.length,
        hashedLength: hashed.length,
      },
      response: {
        status: response.status,
        body: responseText,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
