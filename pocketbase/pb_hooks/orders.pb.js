/// <reference path="../pb_data/types.d.ts" />

/**
 * 주문 생성 시 n8n 워크플로우 트리거
 *
 * 결제 완료된 주문이 생성되면 자동으로 n8n에 알림을 보내
 * eSIM 발급 프로세스를 시작합니다.
 */
onRecordAfterCreateRequest((e) => {
  const order = e.record;

  // 결제 완료 상태인 경우에만 처리
  if (order.get('payment_status') !== 'paid') {
    return;
  }

  try {
    // n8n Webhook 호출
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.yourdomain.com';

    $http.send({
      url: `${n8nWebhookUrl}/webhook/order-paid`,
      method: 'POST',
      body: JSON.stringify({
        order_id: order.get('order_id'),
        product_id: order.get('product'),
        customer_email: order.get('customer_email'),
        customer_name: order.get('customer_name'),
        amount: order.get('amount'),
        currency: order.get('currency'),
        created_at: order.get('created'),
      }),
      headers: {
        'content-type': 'application/json',
      },
      timeout: 120, // 2분
    });

    // 로그 기록
    $app.logger().info(
      'n8n workflow triggered',
      'order_id', order.get('order_id'),
      'webhook_url', `${n8nWebhookUrl}/webhook/order-paid`
    );

  } catch (error) {
    // 에러 발생 시 로그 기록
    $app.logger().error(
      'Failed to trigger n8n workflow',
      'order_id', order.get('order_id'),
      'error', error.message
    );

    // automation_logs 컬렉션에 에러 기록 (선택사항)
    try {
      $app.dao().saveRecord(new Record($app.dao().findCollectionByNameOrId('automation_logs'), {
        event_type: 'order_created',
        order: order.id,
        status: 'failed',
        error_message: error.message,
      }));
    } catch (logError) {
      $app.logger().error('Failed to save automation log', 'error', logError.message);
    }
  }
}, 'orders');

/**
 * 주문 상태 업데이트 시 이메일 발송 여부 확인
 */
onRecordAfterUpdateRequest((e) => {
  const order = e.record;

  // completed 상태로 변경되었고 이메일이 아직 발송되지 않은 경우
  if (order.get('status') === 'completed' && !order.get('email_sent_at')) {
    $app.logger().info(
      'Order completed without email notification',
      'order_id', order.get('order_id')
    );

    // 이메일 재전송 워크플로우 트리거 (선택사항)
    // n8n에서 처리하거나 여기서 직접 이메일 발송
  }
}, 'orders');
