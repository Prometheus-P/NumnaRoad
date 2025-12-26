/**
 * Admin Notification Email Template
 *
 * Email templates for notifying admins about important events.
 *
 * Issue: #19
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export type NotificationType =
  | 'order_failed'
  | 'low_stock'
  | 'provider_error'
  | 'daily_report';

export interface AdminNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  details?: Record<string, string | number>;
  timestamp?: string;
  severity?: 'info' | 'warning' | 'error';
}

const severityColors = {
  info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' },
  warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
  error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
};

const severityIcons = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '🚨',
};

/**
 * Create admin notification email content
 */
export function createAdminNotificationEmail(
  data: AdminNotificationData
): EmailTemplate {
  const severity = data.severity || 'info';
  const colors = severityColors[severity];
  const icon = severityIcons[severity];
  const timestamp = data.timestamp || new Date().toISOString();

  const subject = `[NumnaRoad Admin] ${icon} ${data.title}`;

  const detailsHtml = data.details
    ? Object.entries(data.details)
        .map(
          ([key, value]) => `
      <div class="detail-item">
        <span class="detail-key">${key}</span>
        <span class="detail-value">${value}</span>
      </div>
    `
        )
        .join('')
    : '';

  const detailsText = data.details
    ? Object.entries(data.details)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n')
    : '';

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
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: ${colors.bg};
      border-bottom: 3px solid ${colors.border};
      padding: 20px;
    }
    .header-icon {
      font-size: 32px;
    }
    .header-title {
      color: ${colors.text};
      font-size: 20px;
      font-weight: bold;
      margin: 10px 0 0;
    }
    .header-type {
      color: ${colors.text};
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 24px;
    }
    .message {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .details {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    .details-title {
      font-size: 14px;
      font-weight: bold;
      color: #666;
      margin-bottom: 12px;
    }
    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .detail-item:last-child {
      border-bottom: none;
    }
    .detail-key {
      color: #666;
    }
    .detail-value {
      font-weight: 500;
      font-family: monospace;
    }
    .timestamp {
      color: #999;
      font-size: 12px;
      margin-top: 20px;
    }
    .footer {
      background: #f8f9fa;
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">${icon}</div>
      <div class="header-type">${data.type.replace('_', ' ')}</div>
      <div class="header-title">${data.title}</div>
    </div>

    <div class="content">
      <div class="message">${data.message}</div>

      ${
        data.details
          ? `
      <div class="details">
        <div class="details-title">상세 정보</div>
        ${detailsHtml}
      </div>
      `
          : ''
      }

      <div class="timestamp">발생 시각: ${new Date(timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</div>
    </div>

    <div class="footer">
      NumnaRoad Admin Notification System
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
NumnaRoad Admin Notification

${icon} ${data.title}
Type: ${data.type}

${data.message}

${
  data.details
    ? `상세 정보:
${detailsText}
`
    : ''
}
발생 시각: ${new Date(timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

---
NumnaRoad Admin Notification System
  `.trim();

  return { subject, html, text };
}

/**
 * Convenience functions for common notification types
 */
export function createOrderFailedNotification(
  orderId: string,
  error: string
): AdminNotificationData {
  return {
    type: 'order_failed',
    title: '주문 처리 실패',
    message: `주문 ${orderId}의 처리가 실패했습니다. 확인이 필요합니다.`,
    details: {
      '주문번호': orderId,
      '오류 내용': error,
    },
    severity: 'error',
  };
}

export function createLowStockNotification(
  productName: string,
  currentStock: number,
  threshold: number
): AdminNotificationData {
  return {
    type: 'low_stock',
    title: '재고 부족 경고',
    message: `${productName} 상품의 재고가 부족합니다.`,
    details: {
      '상품명': productName,
      '현재 재고': currentStock,
      '경고 기준': threshold,
    },
    severity: 'warning',
  };
}

export function createProviderErrorNotification(
  providerName: string,
  error: string
): AdminNotificationData {
  return {
    type: 'provider_error',
    title: 'eSIM 제공업체 오류',
    message: `${providerName} 연결에 문제가 발생했습니다.`,
    details: {
      '제공업체': providerName,
      '오류 내용': error,
    },
    severity: 'error',
  };
}
