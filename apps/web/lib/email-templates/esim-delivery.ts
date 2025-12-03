/**
 * eSIM Delivery Email Template
 *
 * Email template for delivering eSIM QR codes to customers.
 *
 * Task: T029
 */

import type { EsimEmailData } from '../resend';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Create eSIM delivery email content
 */
export function createEsimDeliveryEmail(data: EsimEmailData): EmailTemplate {
  const subject = `Your eSIM is ready - ${data.productName}`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #0066cc;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
    }
    .content {
      padding: 30px 0;
    }
    .qr-section {
      text-align: center;
      background: #f8f9fa;
      padding: 30px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .qr-code {
      max-width: 200px;
      height: auto;
      border: 4px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .product-name {
      font-size: 20px;
      font-weight: bold;
      margin: 20px 0 10px;
    }
    .iccid {
      font-family: monospace;
      background: #e9ecef;
      padding: 8px 16px;
      border-radius: 4px;
      display: inline-block;
      margin: 10px 0;
    }
    .activation-code {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .activation-code code {
      display: block;
      font-family: monospace;
      font-size: 14px;
      word-break: break-all;
      margin-top: 10px;
    }
    .instructions {
      background: #e8f4fd;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .instructions h3 {
      margin-top: 0;
      color: #0066cc;
    }
    .instructions ol {
      margin: 0;
      padding-left: 20px;
    }
    .instructions li {
      margin: 10px 0;
    }
    .footer {
      text-align: center;
      padding: 20px 0;
      border-top: 1px solid #e9ecef;
      color: #6c757d;
      font-size: 14px;
    }
    .support {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">NumnaRoad</div>
    <p>Your eSIM is Ready!</p>
  </div>

  <div class="content">
    <p>안녕하세요,</p>
    <p>eSIM 구매가 완료되었습니다. 아래 QR 코드를 스캔하여 eSIM을 활성화하세요.</p>

    <div class="qr-section">
      <img src="${data.qrCodeUrl}" alt="eSIM QR Code" class="qr-code" />
      <div class="product-name">${data.productName}</div>
      <div class="iccid">ICCID: ${data.iccid}</div>
    </div>

    ${
      data.activationCode
        ? `
    <div class="activation-code">
      <strong>수동 활성화 코드 (Manual Activation Code):</strong>
      <code>${data.activationCode}</code>
    </div>
    `
        : ''
    }

    <div class="instructions">
      <h3>활성화 방법 (Activation Instructions)</h3>
      <ol>
        <li><strong>iPhone:</strong> 설정 → 셀룰러 → eSIM 추가 → QR 코드 스캔</li>
        <li><strong>Android:</strong> 설정 → 네트워크 → SIM → eSIM 추가 → QR 코드 스캔</li>
        <li>목적지 도착 후 데이터 로밍을 켜주세요</li>
        <li>eSIM을 기본 데이터로 설정하세요</li>
      </ol>
    </div>

    <div class="support">
      <strong>도움이 필요하신가요?</strong>
      <p>문의사항이 있으시면 support@numnaroad.com으로 연락주세요.</p>
    </div>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} NumnaRoad. All rights reserved.</p>
    <p>이 이메일은 자동으로 발송되었습니다.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
NumnaRoad - Your eSIM is Ready!

안녕하세요,

eSIM 구매가 완료되었습니다.

상품: ${data.productName}
ICCID: ${data.iccid}
QR 코드: ${data.qrCodeUrl}
${data.activationCode ? `수동 활성화 코드: ${data.activationCode}` : ''}

활성화 방법:
1. iPhone: 설정 → 셀룰러 → eSIM 추가 → QR 코드 스캔
2. Android: 설정 → 네트워크 → SIM → eSIM 추가 → QR 코드 스캔
3. 목적지 도착 후 데이터 로밍을 켜주세요
4. eSIM을 기본 데이터로 설정하세요

도움이 필요하시면 support@numnaroad.com으로 연락주세요.

© ${new Date().getFullYear()} NumnaRoad
  `.trim();

  return { subject, html, text };
}
