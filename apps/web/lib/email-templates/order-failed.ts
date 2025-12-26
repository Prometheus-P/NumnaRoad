/**
 * Order Failed Email Template
 *
 * Email template for notifying customers about failed orders.
 *
 * Issue: #19
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface OrderFailedEmailData {
  orderId: string;
  productName: string;
  customerName?: string;
  failureReason: string;
  refundInfo?: string;
}

/**
 * Create order failed email content
 */
export function createOrderFailedEmail(data: OrderFailedEmailData): EmailTemplate {
  const subject = `[NumnaRoad] 주문 처리 실패 안내 - ${data.orderId}`;
  const greeting = data.customerName ? `${data.customerName}님,` : '고객님,';

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
      border-bottom: 2px solid #dc3545;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
    }
    .alert-icon {
      font-size: 48px;
      margin: 10px 0;
    }
    .content {
      padding: 30px 0;
    }
    .order-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .order-info-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .order-info-item:last-child {
      border-bottom: none;
    }
    .failure-reason {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .refund-info {
      background: #d4edda;
      border: 1px solid #28a745;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .action-button {
      display: inline-block;
      background: #0066cc;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 0;
    }
    .support {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .footer {
      text-align: center;
      padding: 20px 0;
      border-top: 1px solid #e9ecef;
      color: #6c757d;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">NumnaRoad</div>
    <div class="alert-icon">⚠️</div>
    <p>주문 처리 실패 안내</p>
  </div>

  <div class="content">
    <p>${greeting}</p>
    <p>안타깝게도 주문 처리 중 문제가 발생하여 eSIM 발급이 완료되지 않았습니다.</p>

    <div class="order-info">
      <div class="order-info-item">
        <span>주문번호</span>
        <strong>${data.orderId}</strong>
      </div>
      <div class="order-info-item">
        <span>상품명</span>
        <strong>${data.productName}</strong>
      </div>
    </div>

    <div class="failure-reason">
      <strong>실패 사유:</strong>
      <p>${data.failureReason}</p>
    </div>

    ${
      data.refundInfo
        ? `
    <div class="refund-info">
      <strong>환불 안내:</strong>
      <p>${data.refundInfo}</p>
    </div>
    `
        : ''
    }

    <p>불편을 드려 죄송합니다. 추가 문의사항이 있으시면 고객센터로 연락해 주세요.</p>

    <div class="support">
      <strong>고객 지원</strong>
      <p>이메일: support@numnaroad.com</p>
      <p>운영시간: 평일 09:00 - 18:00 (KST)</p>
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
NumnaRoad - 주문 처리 실패 안내

${greeting}

안타깝게도 주문 처리 중 문제가 발생하여 eSIM 발급이 완료되지 않았습니다.

주문번호: ${data.orderId}
상품명: ${data.productName}

실패 사유:
${data.failureReason}

${data.refundInfo ? `환불 안내:\n${data.refundInfo}\n` : ''}

불편을 드려 죄송합니다. 추가 문의사항이 있으시면 고객센터로 연락해 주세요.

고객 지원
이메일: support@numnaroad.com
운영시간: 평일 09:00 - 18:00 (KST)

© ${new Date().getFullYear()} NumnaRoad
  `.trim();

  return { subject, html, text };
}
