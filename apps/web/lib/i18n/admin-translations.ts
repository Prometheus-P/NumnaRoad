// Admin Panel Translations

export type AdminLocale = 'ko' | 'en';

export interface AdminTranslations {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    refresh: string;
    loading: string;
    noData: string;
    confirm: string;
    close: string;
    copy: string;
    copied: string;
    retry: string;
    actions: string;
    status: string;
    all: string;
    active: string;
    inactive: string;
    yes: string;
    no: string;
    vsYesterday: string;
  };

  // Sidebar
  sidebar: {
    title: string;
    dashboard: string;
    orders: string;
    allOrders: string;
    pending: string;
    failed: string;
    products: string;
    providers: string;
    smartstore: string;
    settings: string;
    guide: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    todayOrders: string;
    todayRevenue: string;
    pendingOrders: string;
    failedOrders: string;
    recentOrders: string;
    providerStatus: string;
    revenueChart: string;
    orderNumber: string;
    product: string;
    amount: string;
    time: string;
    noRecentOrders: string;
    providerStates: {
      closed: string;
      halfOpen: string;
      open: string;
    };
    successRate: string;
    timeAgo: {
      justNow: string;
      minutesAgo: string;
      hoursAgo: string;
      daysAgo: string;
    };
  };

  // Orders
  orders: {
    title: string;
    searchPlaceholder: string;
    orderNumber: string;
    customerInfo: string;
    productName: string;
    totalPrice: string;
    channel: string;
    orderDate: string;
    startDate: string;
    endDate: string;
    paymentChannel: string;
    selectedCount: string;
    retrySelected: string;
    bulkRetrySuccess: string;
    statuses: {
      pending: string;
      payment_received: string;
      processing: string;
      fulfillment_started: string;
      provider_confirmed: string;
      completed: string;
      delivered: string;
      email_sent: string;
      failed: string;
      provider_failed: string;
      pending_manual_fulfillment: string;
      refunded: string;
      cancelled: string;
    };
    channels: {
      stripe: string;
      smartstore: string;
      tosspay: string;
      manual: string;
    };
    detail: {
      title: string;
      back: string;
      orderInfo: string;
      customerInfo: string;
      productInfo: string;
      esimInfo: string;
      orderHistory: string;
      retryOrder: string;
      manualProcess: string;
      customerName: string;
      customerEmail: string;
      productId: string;
      provider: string;
      costPrice: string;
      margin: string;
      iccid: string;
      activationCode: string;
      qrCode: string;
      dataUsed: string;
      expiryDate: string;
      retryConfirmTitle: string;
      retryConfirmMessage: string;
      manualProcessTitle: string;
      manualProcessMessage: string;
      iccidLabel: string;
      activationCodeLabel: string;
      noHistory: string;
      externalOrderNumber: string;
      paymentStatus: string;
      paymentAmount: string;
      paymentChannel: string;
      orderDate: string;
      updatedDate: string;
      phone: string;
      quantity: string;
      noEsimInfo: string;
      error: string;
      emailResent: string;
      emailResendFailed: string;
      orderNotFound: string;
      backToList: string;
      newEsimAttempt: string;
      completeProcess: string;
      qrCodeUrl: string;
      providerName: string;
      iccidHelper: string;
      activationCodeHelper: string;
      qrCodeHelper: string;
      providerHelper: string;
      resendEmail: string;
    };
  };

  // Products
  products: {
    title: string;
    addProduct: string;
    editProduct: string;
    newProduct: string;
    productName: string;
    country: string;
    dataLimit: string;
    duration: string;
    costPrice: string;
    salePrice: string;
    provider: string;
    stock: string;
    margin: string;
    description: string;
    slug: string;
    speed: string;
    externalId: string;
    unlimited: string;
    days: string;
    autoGenerate: string;
    preview: string;
    duplicate: string;
    deleteConfirm: string;
    saveSuccess: string;
    saveFailed: string;
    providers: {
      redteago: string;
      esimcard: string;
      mobimatter: string;
      airalo: string;
      manual: string;
    };
    detail: {
      back: string;
      basicInfo: string;
      productSpec: string;
      providerAndPrice: string;
      productDescription: string;
      statusSettings: string;
      selectCountry: string;
      selectCountryPlaceholder: string;
      productNamePlaceholder: string;
      slugHelper: string;
      slugPlaceholder: string;
      dataCapacity: string;
      dataPlaceholder: string;
      validityDays: string;
      providerLabel: string;
      providerSku: string;
      providerSkuHelper: string;
      providerSkuPlaceholder: string;
      costUsd: string;
      costHelper: string;
      priceKrw: string;
      priceHelper: string;
      marginRate: string;
      marginHelper: string;
      descriptionPlaceholder: string;
      features: string;
      featuresHelper: string;
      featuresPlaceholder: string;
      active: string;
      activeHelper: string;
      featured: string;
      featuredHelper: string;
      stockCount: string;
      stockHelper: string;
      sortOrder: string;
      sortHelper: string;
      saving: string;
      productCreated: string;
      productUpdated: string;
      deleteFailed: string;
      copy: string;
    };
  };

  // Providers
  providers: {
    title: string;
    healthDashboard: string;
    reset: string;
    resetConfirm: string;
    lastError: string;
    errorCount: string;
    lastSuccess: string;
    state: string;
  };

  // Settings
  settings: {
    title: string;
  };

  // Guide
  guide: {
    title: string;
    subtitle: string;
    gettingStarted: string;
    welcome: string;
    login: string;
    loginDesc: string;
    sessionInfo: string;
    adminAccountInfo: string;
    dashboard: string;
    dashboardDesc: string;
    statsCards: string;
    card: string;
    cardDesc: string;
    todayOrdersDesc: string;
    todayRevenueDesc: string;
    pendingDesc: string;
    failedDesc: string;
    providerStatus: string;
    providerStatusDesc: string;
    ordersManagement: string;
    ordersManagementDesc: string;
    search: string;
    searchDesc: string;
    filtering: string;
    statusFilter: string;
    channelFilter: string;
    dateRange: string;
    bulkRetry: string;
    bulkRetryDesc: string;
    bulkRetryStep1: string;
    bulkRetryStep1Desc: string;
    bulkRetryStep2: string;
    bulkRetryStep2Desc: string;
    bulkRetryStep3: string;
    bulkRetryStep3Desc: string;
    retryableStates: string;
    orderDetail: string;
    orderDetailDesc: string;
    productsManagement: string;
    productsManagementDesc: string;
    productInfo: string;
    productNameCountry: string;
    productNameCountryDesc: string;
    providerSku: string;
    providerSkuDesc: string;
    price: string;
    priceDesc: string;
    statusDesc: string;
    providerHealth: string;
    providerHealthDesc: string;
    circuitBreakerStatus: string;
    circuitBreakerDesc: string;
    closedState: string;
    closedStateDesc: string;
    halfOpenState: string;
    halfOpenStateDesc: string;
    openState: string;
    openStateDesc: string;
    manualReset: string;
    manualResetDesc: string;
    resetButton: string;
    resetButtonDesc: string;
    confirmDialog: string;
    confirmDialogDesc: string;
    resetWarning: string;
    errorMonitoring: string;
    errorMonitoringDesc: string;
    notifications: string;
    notificationsDesc: string;
    emailNotification: string;
    emailNotificationDesc: string;
    kakaoAlimtalk: string;
    kakaoAlimtalkDesc: string;
    kakaoWarning: string;
    kakaoStep1: string;
    kakaoStep1Desc: string;
    kakaoStep2: string;
    kakaoStep2Desc: string;
    kakaoStep3: string;
    kakaoStep3Desc: string;
    smartStore: string;
    smartStoreDesc: string;
    integrationMethod: string;
    orderCollection: string;
    orderCollectionDesc: string;
    autoProcess: string;
    autoProcessDesc: string;
    statusSync: string;
    statusSyncDesc: string;
    troubleshooting: string;
    troubleshootingDesc: string;
    orderFailed: string;
    checkProviderStatus: string;
    checkProviderStatusDesc: string;
    checkErrorLog: string;
    checkErrorLogDesc: string;
    retryOrder: string;
    retryOrderDesc: string;
    providerFailure: string;
    providerFailureStep1: string;
    providerFailureStep1Desc: string;
    providerFailureStep2: string;
    providerFailureStep2Desc: string;
    providerFailureStep3: string;
    providerFailureStep3Desc: string;
    refundProcess: string;
    refundProcessDesc: string;
    stripeRefund: string;
    stripeRefundDesc: string;
    smartStoreRefund: string;
    smartStoreRefundDesc: string;
    refundWarning: string;
    footer: string;
  };
}

export const translations: Record<AdminLocale, AdminTranslations> = {
  ko: {
    common: {
      save: '저장',
      cancel: '취소',
      delete: '삭제',
      edit: '수정',
      add: '추가',
      search: '검색',
      refresh: '새로고침',
      loading: '로딩 중...',
      noData: '데이터가 없습니다',
      confirm: '확인',
      close: '닫기',
      copy: '복사',
      copied: '복사됨!',
      retry: '재시도',
      actions: '작업',
      status: '상태',
      all: '전체',
      active: '활성',
      inactive: '비활성',
      yes: '예',
      no: '아니오',
      vsYesterday: '전일 대비',
    },

    sidebar: {
      title: 'NumnaRoad 관리자',
      dashboard: '대시보드',
      orders: '주문 관리',
      allOrders: '전체 주문',
      pending: '대기중',
      failed: '실패',
      products: '상품 관리',
      providers: '프로바이더',
      smartstore: '스마트스토어',
      settings: '설정',
      guide: '가이드',
    },

    dashboard: {
      title: '대시보드',
      todayOrders: '오늘 주문',
      todayRevenue: '오늘 매출',
      pendingOrders: '대기 중',
      failedOrders: '실패',
      recentOrders: '최근 주문',
      providerStatus: 'Provider 상태',
      revenueChart: '매출 현황',
      orderNumber: '주문번호',
      product: '상품',
      amount: '금액',
      time: '시간',
      noRecentOrders: '최근 주문이 없습니다',
      providerStates: {
        closed: '정상',
        halfOpen: '테스트중',
        open: '차단됨',
      },
      successRate: '성공률',
      timeAgo: {
        justNow: '방금',
        minutesAgo: '분 전',
        hoursAgo: '시간 전',
        daysAgo: '일 전',
      },
    },

    orders: {
      title: '주문 관리',
      searchPlaceholder: '주문번호 또는 이메일 검색...',
      orderNumber: '주문번호',
      customerInfo: '고객정보',
      productName: '상품',
      totalPrice: '결제금액',
      channel: '채널',
      orderDate: '주문일시',
      startDate: '시작일',
      endDate: '종료일',
      paymentChannel: '결제채널',
      selectedCount: '개 선택됨',
      retrySelected: '선택 재시도',
      bulkRetrySuccess: '건 재시도 요청됨',
      statuses: {
        pending: '대기중',
        payment_received: '결제완료',
        processing: '처리중',
        fulfillment_started: '발급시작',
        provider_confirmed: '공급사확인',
        completed: '완료',
        delivered: '발송완료',
        email_sent: '이메일발송',
        failed: '실패',
        provider_failed: '공급사실패',
        pending_manual_fulfillment: '수동처리대기',
        refunded: '환불완료',
        cancelled: '취소됨',
      },
      channels: {
        stripe: 'Stripe',
        smartstore: '스마트스토어',
        tosspay: '토스페이',
        manual: '수동',
      },
      detail: {
        title: '주문 상세',
        back: '뒤로',
        orderInfo: '주문 정보',
        customerInfo: '고객 정보',
        productInfo: '상품 정보',
        esimInfo: 'eSIM 정보',
        orderHistory: '처리 이력',
        retryOrder: '재시도',
        manualProcess: '수동 처리',
        customerName: '이름',
        customerEmail: '이메일',
        productId: '상품 ID',
        provider: '공급사',
        costPrice: '원가',
        margin: '마진',
        iccid: 'ICCID',
        activationCode: '활성화 코드',
        qrCode: 'QR 코드',
        dataUsed: '데이터 사용량',
        expiryDate: '만료일',
        retryConfirmTitle: '주문 재처리',
        retryConfirmMessage: '이 주문을 다시 처리하시겠습니까? 새로운 eSIM 발급을 시도합니다.',
        manualProcessTitle: '수동 Fulfillment 처리',
        manualProcessMessage: 'eSIM 정보를 직접 입력하여 주문을 완료 처리합니다.',
        iccidLabel: 'ICCID',
        activationCodeLabel: '활성화 코드',
        noHistory: '처리 이력이 없습니다',
        externalOrderNumber: '외부 주문번호',
        paymentStatus: '결제상태',
        paymentAmount: '결제금액',
        paymentChannel: '결제채널',
        orderDate: '주문일시',
        updatedDate: '수정일시',
        phone: '연락처',
        quantity: '수량',
        noEsimInfo: 'eSIM 정보가 없습니다',
        error: '오류',
        emailResent: '이메일이 성공적으로 재발송되었습니다.',
        emailResendFailed: '이메일 재발송에 실패했습니다.',
        orderNotFound: '주문을 찾을 수 없습니다',
        backToList: '주문 목록으로',
        newEsimAttempt: '새로운 eSIM 발급을 시도합니다.',
        completeProcess: '완료 처리',
        qrCodeUrl: 'QR 코드 URL (선택)',
        providerName: 'Provider',
        iccidHelper: 'eSIM의 ICCID를 입력하세요',
        activationCodeHelper: 'eSIM 활성화 코드를 입력하세요',
        qrCodeHelper: 'QR 코드 이미지 URL (선택 사항)',
        providerHelper: 'eSIM 제공 업체명',
        resendEmail: '이메일 재발송',
      },
    },

    products: {
      title: '상품 관리',
      addProduct: '상품 추가',
      editProduct: '상품 수정',
      newProduct: '새 상품',
      productName: '상품명',
      country: '국가',
      dataLimit: '데이터',
      duration: '기간',
      costPrice: '원가',
      salePrice: '판매가',
      provider: '공급사',
      stock: '재고',
      margin: '마진',
      description: '설명',
      slug: 'Slug (URL)',
      speed: '속도',
      externalId: '외부 ID',
      unlimited: '무제한',
      days: '일',
      autoGenerate: '자동 생성',
      preview: '미리보기',
      duplicate: '복제',
      deleteConfirm: '이 상품을 삭제하시겠습니까?',
      saveSuccess: '상품이 저장되었습니다',
      saveFailed: '상품 저장에 실패했습니다',
      providers: {
        redteago: 'RedteaGO (도매 Primary)',
        esimcard: 'eSIMCard (백업)',
        mobimatter: 'MobiMatter (백업)',
        airalo: 'Airalo (소매 Fallback)',
        manual: 'Manual (수동)',
      },
      detail: {
        back: '뒤로',
        basicInfo: '기본 정보',
        productSpec: '상품 스펙',
        providerAndPrice: '공급사 및 가격',
        productDescription: '상품 설명',
        statusSettings: '상태 설정',
        selectCountry: '국가 선택',
        selectCountryPlaceholder: '국가를 선택하세요',
        productNamePlaceholder: '예: 일본 eSIM 무제한 7일',
        slugHelper: 'URL에 사용되는 고유 식별자 (영문, 숫자, 하이픈만 가능)',
        slugPlaceholder: '예: japan-unlimited-7d',
        dataCapacity: '데이터 용량',
        dataPlaceholder: '예: 무제한, 10GB',
        validityDays: '유효기간 (일)',
        providerLabel: '공급사 (Provider)',
        providerSku: '공급사 SKU',
        providerSkuHelper: '공급사에서 제공하는 상품 식별자',
        providerSkuPlaceholder: '예: maxis-10gb-7days',
        costUsd: '원가 (USD)',
        costHelper: '공급사 매입가',
        priceKrw: '판매가 (KRW)',
        priceHelper: '고객 판매가',
        marginRate: '마진율',
        marginHelper: '자동 계산 (환율 1,400원 기준)',
        descriptionPlaceholder: '상품에 대한 상세 설명을 입력하세요',
        features: '주요 특징 (한 줄에 하나씩)',
        featuresHelper: '각 특징을 줄바꿈으로 구분해서 입력하세요',
        featuresPlaceholder: '무제한 데이터\n핫스팟 지원\n즉시 발급',
        active: '활성화',
        activeHelper: '비활성화 시 상품이 노출되지 않습니다',
        featured: '추천 상품',
        featuredHelper: '메인 페이지에 노출됩니다',
        stockCount: '재고 수량',
        stockHelper: '0이면 품절 처리됩니다',
        sortOrder: '정렬 순서',
        sortHelper: '낮은 숫자가 먼저 표시됩니다',
        saving: '저장 중...',
        productCreated: '상품이 등록되었습니다!',
        productUpdated: '상품이 수정되었습니다!',
        deleteFailed: '상품 삭제에 실패했습니다',
        copy: '복사',
      },
    },

    providers: {
      title: '프로바이더',
      healthDashboard: 'Provider Health Dashboard',
      reset: '리셋',
      resetConfirm: '이 프로바이더를 리셋하시겠습니까?',
      lastError: '마지막 오류',
      errorCount: '오류 횟수',
      lastSuccess: '마지막 성공',
      state: '상태',
    },

    settings: {
      title: '설정',
    },

    guide: {
      title: '가이드',
      subtitle: 'NumnaRoad 어드민 패널 사용 설명서입니다. 각 섹션을 클릭하여 자세한 내용을 확인하세요.',
      gettingStarted: '시작하기',
      welcome: 'NumnaRoad 관리자 패널에 오신 것을 환영합니다. 이 가이드는 주요 기능 사용법을 안내합니다.',
      login: '로그인',
      loginDesc: '이메일과 비밀번호를 입력하세요',
      sessionInfo: '세션 유지',
      adminAccountInfo: '관리자 계정은 PocketBase 관리자 패널에서 생성할 수 있습니다.',
      dashboard: '대시보드',
      dashboardDesc: '대시보드에서는 오늘의 주요 지표와 시스템 상태를 한눈에 확인할 수 있습니다.',
      statsCards: '통계 카드',
      card: '카드',
      cardDesc: '설명',
      todayOrdersDesc: '오늘 접수된 주문 수 (전일 대비 변화율 표시)',
      todayRevenueDesc: '오늘 매출 총액 (원화)',
      pendingDesc: '처리 대기 중인 주문 수',
      failedDesc: '실패한 주문 수 (빨간색 Alert 표시됨)',
      providerStatus: 'Provider 상태',
      providerStatusDesc: '우측에 각 Provider의 Circuit Breaker 상태와 성공률이 표시됩니다. 문제가 있는 Provider는 빨간색으로 표시됩니다.',
      ordersManagement: '주문 관리',
      ordersManagementDesc: '주문 목록 조회, 검색, 필터링, 벌크 재시도 등의 기능을 제공합니다.',
      search: '검색',
      searchDesc: '검색창에 주문 ID 또는 고객 이메일을 입력하면 실시간으로 결과가 필터링됩니다.',
      filtering: '필터링',
      statusFilter: 'Pending, Completed, Failed 등으로 필터',
      channelFilter: 'Stripe, SmartStore, TossPay 등 판매 채널별 필터',
      dateRange: 'From/To 날짜 범위 지정',
      bulkRetry: '벌크 재시도 (Bulk Retry)',
      bulkRetryDesc: '실패한 주문을 일괄 재시도할 수 있습니다.',
      bulkRetryStep1: '1. 체크박스로 재시도할 주문 선택',
      bulkRetryStep1Desc: 'Failed, Provider Failed 상태의 주문만 재시도 가능',
      bulkRetryStep2: "2. 'Retry Selected' 버튼 클릭",
      bulkRetryStep2Desc: '선택된 주문 수가 버튼에 표시됩니다',
      bulkRetryStep3: '3. 결과 확인',
      bulkRetryStep3Desc: '성공/스킵/실패 건수가 알림으로 표시됩니다',
      retryableStates: '재시도 가능한 상태: failed, provider_failed, pending_manual_fulfillment, fulfillment_started, payment_received',
      orderDetail: '주문 상세 보기',
      orderDetailDesc: '주문 행을 클릭하면 상세 페이지로 이동합니다. 여기서 eSIM QR코드, 설치 정보, 처리 이력을 확인할 수 있습니다.',
      productsManagement: '상품 관리',
      productsManagementDesc: '판매 중인 eSIM 상품 목록을 관리합니다.',
      productInfo: '상품 정보',
      productNameCountry: '상품명, 국가, 데이터 용량',
      productNameCountryDesc: '각 eSIM 상품의 기본 정보',
      providerSku: 'Provider SKU',
      providerSkuDesc: '각 Provider(RedteaGO, eSIMCard 등)의 상품 코드',
      price: '가격',
      priceDesc: '판매가 (KRW)',
      statusDesc: 'Active/Inactive로 판매 여부 관리',
      providerHealth: '프로바이더 헬스',
      providerHealthDesc: 'eSIM 공급자(Provider)의 상태와 성공률을 모니터링합니다.',
      circuitBreakerStatus: 'Circuit Breaker 상태',
      circuitBreakerDesc: '각 Provider는 Circuit Breaker 패턴으로 관리됩니다. 연속 실패 시 자동으로 차단되어 다른 Provider로 failover됩니다.',
      closedState: 'CLOSED (정상)',
      closedStateDesc: '정상 운영 중. 모든 요청 처리 가능.',
      halfOpenState: 'HALF_OPEN (테스트)',
      halfOpenStateDesc: '테스트 모드. 일부 요청만 허용하여 복구 여부 확인 중.',
      openState: 'OPEN (차단)',
      openStateDesc: '차단됨. 모든 요청이 다른 Provider로 failover됩니다.',
      manualReset: '수동 리셋',
      manualResetDesc: 'OPEN 상태의 Provider는 수동으로 리셋할 수 있습니다.',
      resetButton: '리셋 버튼 클릭',
      resetButtonDesc: 'Provider 카드의 리셋 아이콘 클릭',
      confirmDialog: '확인 다이얼로그',
      confirmDialogDesc: '리셋 확인 후 CLOSED 상태로 복구',
      resetWarning: '리셋 후에도 문제가 지속되면 해당 Provider의 API 상태를 직접 확인하세요.',
      errorMonitoring: '에러 모니터링',
      errorMonitoringDesc: '"Recent Errors" 탭에서 최근 24시간 내 발생한 에러를 확인할 수 있습니다. 에러 메시지, 발생 횟수, 마지막 발생 시간이 표시됩니다.',
      notifications: '알림 설정',
      notificationsDesc: '주문 완료 시 고객에게 자동으로 알림이 발송됩니다.',
      emailNotification: '이메일 알림 (Resend)',
      emailNotificationDesc: 'eSIM 구매 완료 시 QR코드와 설치 가이드가 포함된 이메일이 자동 발송됩니다.',
      kakaoAlimtalk: '카카오 알림톡 (SOLAPI)',
      kakaoAlimtalkDesc: '고객이 한국 전화번호를 입력한 경우, 카카오 알림톡으로 알림이 발송됩니다.',
      kakaoWarning: '카카오 알림톡 사용을 위해서는 다음 설정이 필요합니다:',
      kakaoStep1: '1. 카카오 비즈니스 채널 등록',
      kakaoStep1Desc: 'kakao.com/business에서 채널 생성 및 PF ID 발급',
      kakaoStep2: '2. SOLAPI 계정 설정',
      kakaoStep2Desc: 'solapi.com에서 API Key/Secret 발급',
      kakaoStep3: '3. 알림톡 템플릿 승인',
      kakaoStep3Desc: '카카오 검수 후 템플릿 ID 발급 (1-3일 소요)',
      smartStore: '스마트스토어 연동',
      smartStoreDesc: '네이버 스마트스토어 주문을 자동으로 처리합니다.',
      integrationMethod: '연동 방식',
      orderCollection: '주문 수집',
      orderCollectionDesc: '스마트스토어 API로 신규 주문 자동 수집',
      autoProcess: '자동 처리',
      autoProcessDesc: '결제 확인된 주문은 자동으로 eSIM 발급 및 발송',
      statusSync: '상태 동기화',
      statusSyncDesc: '처리 결과가 스마트스토어에 자동 반영',
      troubleshooting: '문제 해결',
      troubleshootingDesc: '자주 발생하는 문제와 해결 방법입니다.',
      orderFailed: '주문 실패 시',
      checkProviderStatus: 'Provider 상태 확인',
      checkProviderStatusDesc: 'Providers 페이지에서 Circuit Breaker 상태 확인',
      checkErrorLog: '에러 로그 확인',
      checkErrorLogDesc: 'Recent Errors 탭에서 구체적인 에러 메시지 확인',
      retryOrder: '재시도',
      retryOrderDesc: '일시적 오류인 경우 주문 재시도로 해결 가능',
      providerFailure: 'Provider 장애 대응',
      providerFailureStep1: '1. Circuit Breaker 자동 차단 확인',
      providerFailureStep1Desc: 'OPEN 상태면 자동으로 다른 Provider로 failover됨',
      providerFailureStep2: '2. Provider API 직접 확인',
      providerFailureStep2Desc: '각 Provider 관리자 페이지에서 상태 확인',
      providerFailureStep3: '3. 수동 리셋',
      providerFailureStep3Desc: '문제 해결 후 Circuit Breaker 수동 리셋',
      refundProcess: '환불 처리',
      refundProcessDesc: '자동 처리가 불가능한 경우 수동 환불이 필요합니다.',
      stripeRefund: 'Stripe 환불',
      stripeRefundDesc: 'Stripe Dashboard에서 직접 환불 처리',
      smartStoreRefund: '스마트스토어 환불',
      smartStoreRefundDesc: '스마트스토어 판매자센터에서 환불 처리',
      refundWarning: "환불 처리 후 반드시 주문 상태를 'refunded'로 변경하세요.",
      footer: '추가 문의사항은 개발팀에 연락하세요.',
    },
  },

  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      refresh: 'Refresh',
      loading: 'Loading...',
      noData: 'No data',
      confirm: 'Confirm',
      close: 'Close',
      copy: 'Copy',
      copied: 'Copied!',
      retry: 'Retry',
      actions: 'Actions',
      status: 'Status',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      yes: 'Yes',
      no: 'No',
      vsYesterday: 'vs yesterday',
    },

    sidebar: {
      title: 'NumnaRoad Admin',
      dashboard: 'Dashboard',
      orders: 'Orders',
      allOrders: 'All Orders',
      pending: 'Pending',
      failed: 'Failed',
      products: 'Products',
      providers: 'Providers',
      smartstore: 'SmartStore',
      settings: 'Settings',
      guide: 'Guide',
    },

    dashboard: {
      title: 'Dashboard',
      todayOrders: 'Today Orders',
      todayRevenue: 'Today Revenue',
      pendingOrders: 'Pending',
      failedOrders: 'Failed',
      recentOrders: 'Recent Orders',
      providerStatus: 'Provider Status',
      revenueChart: 'Revenue',
      orderNumber: 'Order #',
      product: 'Product',
      amount: 'Amount',
      time: 'Time',
      noRecentOrders: 'No recent orders',
      providerStates: {
        closed: 'Normal',
        halfOpen: 'Testing',
        open: 'Blocked',
      },
      successRate: 'Success Rate',
      timeAgo: {
        justNow: 'Just now',
        minutesAgo: ' min ago',
        hoursAgo: ' hr ago',
        daysAgo: ' days ago',
      },
    },

    orders: {
      title: 'Order Management',
      searchPlaceholder: 'Search by order number or email...',
      orderNumber: 'Order #',
      customerInfo: 'Customer',
      productName: 'Product',
      totalPrice: 'Amount',
      channel: 'Channel',
      orderDate: 'Date',
      startDate: 'From',
      endDate: 'To',
      paymentChannel: 'Payment Channel',
      selectedCount: ' selected',
      retrySelected: 'Retry Selected',
      bulkRetrySuccess: ' retries requested',
      statuses: {
        pending: 'Pending',
        payment_received: 'Payment Received',
        processing: 'Processing',
        fulfillment_started: 'Fulfillment Started',
        provider_confirmed: 'Provider Confirmed',
        completed: 'Completed',
        delivered: 'Delivered',
        email_sent: 'Email Sent',
        failed: 'Failed',
        provider_failed: 'Provider Failed',
        pending_manual_fulfillment: 'Pending Manual',
        refunded: 'Refunded',
        cancelled: 'Cancelled',
      },
      channels: {
        stripe: 'Stripe',
        smartstore: 'SmartStore',
        tosspay: 'TossPay',
        manual: 'Manual',
      },
      detail: {
        title: 'Order Detail',
        back: 'Back',
        orderInfo: 'Order Info',
        customerInfo: 'Customer Info',
        productInfo: 'Product Info',
        esimInfo: 'eSIM Info',
        orderHistory: 'Order History',
        retryOrder: 'Retry',
        manualProcess: 'Manual Process',
        customerName: 'Name',
        customerEmail: 'Email',
        productId: 'Product ID',
        provider: 'Provider',
        costPrice: 'Cost',
        margin: 'Margin',
        iccid: 'ICCID',
        activationCode: 'Activation Code',
        qrCode: 'QR Code',
        dataUsed: 'Data Used',
        expiryDate: 'Expiry Date',
        retryConfirmTitle: 'Retry Order',
        retryConfirmMessage: 'Are you sure you want to retry this order? This will attempt a new eSIM issuance.',
        manualProcessTitle: 'Manual Fulfillment',
        manualProcessMessage: 'Enter eSIM information manually to complete the order.',
        iccidLabel: 'ICCID',
        activationCodeLabel: 'Activation Code',
        noHistory: 'No history',
        externalOrderNumber: 'External Order #',
        paymentStatus: 'Payment Status',
        paymentAmount: 'Amount',
        paymentChannel: 'Payment Channel',
        orderDate: 'Order Date',
        updatedDate: 'Updated',
        phone: 'Phone',
        quantity: 'Quantity',
        noEsimInfo: 'No eSIM information available',
        error: 'Error',
        emailResent: 'Email has been resent successfully.',
        emailResendFailed: 'Failed to resend email.',
        orderNotFound: 'Order not found',
        backToList: 'Back to Order List',
        newEsimAttempt: 'This will attempt a new eSIM issuance.',
        completeProcess: 'Complete',
        qrCodeUrl: 'QR Code URL (Optional)',
        providerName: 'Provider',
        iccidHelper: 'Enter the eSIM ICCID',
        activationCodeHelper: 'Enter the eSIM activation code',
        qrCodeHelper: 'QR code image URL (optional)',
        providerHelper: 'eSIM provider name',
        resendEmail: 'Resend Email',
      },
    },

    products: {
      title: 'Products',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      newProduct: 'New Product',
      productName: 'Product Name',
      country: 'Country',
      dataLimit: 'Data',
      duration: 'Duration',
      costPrice: 'Cost Price',
      salePrice: 'Sale Price',
      provider: 'Provider',
      stock: 'Stock',
      margin: 'Margin',
      description: 'Description',
      slug: 'Slug (URL)',
      speed: 'Speed',
      externalId: 'External ID',
      unlimited: 'Unlimited',
      days: 'days',
      autoGenerate: 'Auto Generate',
      preview: 'Preview',
      duplicate: 'Duplicate',
      deleteConfirm: 'Are you sure you want to delete this product?',
      saveSuccess: 'Product saved successfully',
      saveFailed: 'Failed to save product',
      providers: {
        redteago: 'RedteaGO (Wholesale Primary)',
        esimcard: 'eSIMCard (Backup)',
        mobimatter: 'MobiMatter (Backup)',
        airalo: 'Airalo (Retail Fallback)',
        manual: 'Manual',
      },
      detail: {
        back: 'Back',
        basicInfo: 'Basic Info',
        productSpec: 'Product Spec',
        providerAndPrice: 'Provider & Price',
        productDescription: 'Description',
        statusSettings: 'Status Settings',
        selectCountry: 'Select Country',
        selectCountryPlaceholder: 'Select a country',
        productNamePlaceholder: 'e.g., Japan eSIM Unlimited 7 Days',
        slugHelper: 'Unique identifier for URL (alphanumeric and hyphens only)',
        slugPlaceholder: 'e.g., japan-unlimited-7d',
        dataCapacity: 'Data Capacity',
        dataPlaceholder: 'e.g., Unlimited, 10GB',
        validityDays: 'Validity (Days)',
        providerLabel: 'Provider',
        providerSku: 'Provider SKU',
        providerSkuHelper: 'Product identifier from provider',
        providerSkuPlaceholder: 'e.g., maxis-10gb-7days',
        costUsd: 'Cost (USD)',
        costHelper: 'Supplier purchase price',
        priceKrw: 'Price (KRW)',
        priceHelper: 'Customer sale price',
        marginRate: 'Margin Rate',
        marginHelper: 'Auto-calculated (rate: 1,400 KRW/USD)',
        descriptionPlaceholder: 'Enter product description',
        features: 'Features (one per line)',
        featuresHelper: 'Separate each feature with a new line',
        featuresPlaceholder: 'Unlimited data\nHotspot supported\nInstant delivery',
        active: 'Active',
        activeHelper: 'Product is hidden when disabled',
        featured: 'Featured',
        featuredHelper: 'Displayed on the main page',
        stockCount: 'Stock Count',
        stockHelper: '0 means out of stock',
        sortOrder: 'Sort Order',
        sortHelper: 'Lower numbers appear first',
        saving: 'Saving...',
        productCreated: 'Product created successfully!',
        productUpdated: 'Product updated successfully!',
        deleteFailed: 'Failed to delete product',
        copy: 'Copy',
      },
    },

    providers: {
      title: 'Providers',
      healthDashboard: 'Provider Health Dashboard',
      reset: 'Reset',
      resetConfirm: 'Are you sure you want to reset this provider?',
      lastError: 'Last Error',
      errorCount: 'Error Count',
      lastSuccess: 'Last Success',
      state: 'State',
    },

    settings: {
      title: 'Settings',
    },

    guide: {
      title: 'Guide',
      subtitle: 'NumnaRoad Admin Panel User Guide. Click each section to view details.',
      gettingStarted: 'Getting Started',
      welcome: 'Welcome to the NumnaRoad Admin Panel. This guide explains how to use the main features.',
      login: 'Login',
      loginDesc: 'Enter your email and password',
      sessionInfo: 'Session Persistence',
      adminAccountInfo: 'Admin accounts can be created from the PocketBase admin panel.',
      dashboard: 'Dashboard',
      dashboardDesc: 'The dashboard shows today\'s key metrics and system status at a glance.',
      statsCards: 'Stats Cards',
      card: 'Card',
      cardDesc: 'Description',
      todayOrdersDesc: 'Number of orders received today (with day-over-day change)',
      todayRevenueDesc: 'Today\'s total revenue (KRW)',
      pendingDesc: 'Number of orders pending processing',
      failedDesc: 'Number of failed orders (shown with red Alert)',
      providerStatus: 'Provider Status',
      providerStatusDesc: 'Circuit Breaker status and success rate for each Provider are shown on the right. Problematic Providers are highlighted in red.',
      ordersManagement: 'Orders Management',
      ordersManagementDesc: 'Provides order list viewing, search, filtering, and bulk retry functions.',
      search: 'Search',
      searchDesc: 'Enter order ID or customer email in the search box to filter results in real-time.',
      filtering: 'Filtering',
      statusFilter: 'Filter by Pending, Completed, Failed, etc.',
      channelFilter: 'Filter by sales channel: Stripe, SmartStore, TossPay, etc.',
      dateRange: 'Specify From/To date range',
      bulkRetry: 'Bulk Retry',
      bulkRetryDesc: 'You can retry failed orders in bulk.',
      bulkRetryStep1: '1. Select orders to retry with checkboxes',
      bulkRetryStep1Desc: 'Only Failed and Provider Failed orders can be retried',
      bulkRetryStep2: '2. Click "Retry Selected" button',
      bulkRetryStep2Desc: 'The number of selected orders is displayed on the button',
      bulkRetryStep3: '3. Check results',
      bulkRetryStep3Desc: 'Success/skipped/failed counts are displayed as notifications',
      retryableStates: 'Retryable states: failed, provider_failed, pending_manual_fulfillment, fulfillment_started, payment_received',
      orderDetail: 'Order Details',
      orderDetailDesc: 'Click an order row to go to the detail page. Here you can check eSIM QR code, installation info, and processing history.',
      productsManagement: 'Products Management',
      productsManagementDesc: 'Manage the list of eSIM products for sale.',
      productInfo: 'Product Info',
      productNameCountry: 'Product name, country, data capacity',
      productNameCountryDesc: 'Basic information for each eSIM product',
      providerSku: 'Provider SKU',
      providerSkuDesc: 'Product code from each Provider (RedteaGO, eSIMCard, etc.)',
      price: 'Price',
      priceDesc: 'Sale price (KRW)',
      statusDesc: 'Manage sale status with Active/Inactive',
      providerHealth: 'Provider Health',
      providerHealthDesc: 'Monitor the status and success rate of eSIM providers.',
      circuitBreakerStatus: 'Circuit Breaker Status',
      circuitBreakerDesc: 'Each Provider is managed with the Circuit Breaker pattern. After consecutive failures, it is automatically blocked and fails over to other Providers.',
      closedState: 'CLOSED (Normal)',
      closedStateDesc: 'Operating normally. All requests can be processed.',
      halfOpenState: 'HALF_OPEN (Testing)',
      halfOpenStateDesc: 'Test mode. Only some requests are allowed to check recovery status.',
      openState: 'OPEN (Blocked)',
      openStateDesc: 'Blocked. All requests fail over to other Providers.',
      manualReset: 'Manual Reset',
      manualResetDesc: 'Providers in OPEN state can be manually reset.',
      resetButton: 'Click Reset Button',
      resetButtonDesc: 'Click the reset icon on the Provider card',
      confirmDialog: 'Confirm Dialog',
      confirmDialogDesc: 'After confirming reset, it will recover to CLOSED state',
      resetWarning: 'If problems persist after reset, check the Provider\'s API status directly.',
      errorMonitoring: 'Error Monitoring',
      errorMonitoringDesc: 'You can check errors from the last 24 hours in the "Recent Errors" tab. Error messages, occurrence counts, and last occurrence times are displayed.',
      notifications: 'Notification Settings',
      notificationsDesc: 'Notifications are automatically sent to customers when orders are completed.',
      emailNotification: 'Email Notifications (Resend)',
      emailNotificationDesc: 'When an eSIM purchase is completed, an email with QR code and installation guide is automatically sent.',
      kakaoAlimtalk: 'Kakao Alimtalk (SOLAPI)',
      kakaoAlimtalkDesc: 'If the customer enters a Korean phone number, notifications are sent via Kakao Alimtalk.',
      kakaoWarning: 'The following settings are required to use Kakao Alimtalk:',
      kakaoStep1: '1. Register Kakao Business Channel',
      kakaoStep1Desc: 'Create a channel and get PF ID at kakao.com/business',
      kakaoStep2: '2. Set up SOLAPI account',
      kakaoStep2Desc: 'Get API Key/Secret at solapi.com',
      kakaoStep3: '3. Approve Alimtalk template',
      kakaoStep3Desc: 'Template ID is issued after Kakao review (1-3 days)',
      smartStore: 'SmartStore Integration',
      smartStoreDesc: 'Automatically processes Naver SmartStore orders.',
      integrationMethod: 'Integration Method',
      orderCollection: 'Order Collection',
      orderCollectionDesc: 'Automatically collect new orders via SmartStore API',
      autoProcess: 'Auto Processing',
      autoProcessDesc: 'Confirmed payment orders automatically issue and send eSIMs',
      statusSync: 'Status Sync',
      statusSyncDesc: 'Processing results are automatically reflected in SmartStore',
      troubleshooting: 'Troubleshooting',
      troubleshootingDesc: 'Common problems and solutions.',
      orderFailed: 'When Order Fails',
      checkProviderStatus: 'Check Provider Status',
      checkProviderStatusDesc: 'Check Circuit Breaker status on the Providers page',
      checkErrorLog: 'Check Error Log',
      checkErrorLogDesc: 'Check specific error messages in the Recent Errors tab',
      retryOrder: 'Retry',
      retryOrderDesc: 'Can be resolved by retrying the order for temporary errors',
      providerFailure: 'Provider Failure Response',
      providerFailureStep1: '1. Check Circuit Breaker auto-block',
      providerFailureStep1Desc: 'If in OPEN state, it automatically fails over to other Providers',
      providerFailureStep2: '2. Check Provider API directly',
      providerFailureStep2Desc: 'Check status on each Provider\'s admin page',
      providerFailureStep3: '3. Manual Reset',
      providerFailureStep3Desc: 'Manually reset Circuit Breaker after problem is resolved',
      refundProcess: 'Refund Processing',
      refundProcessDesc: 'Manual refund is required when automatic processing is not possible.',
      stripeRefund: 'Stripe Refund',
      stripeRefundDesc: 'Process refund directly in Stripe Dashboard',
      smartStoreRefund: 'SmartStore Refund',
      smartStoreRefundDesc: 'Process refund in SmartStore Seller Center',
      refundWarning: 'After processing a refund, be sure to change the order status to \'refunded\'.',
      footer: 'For additional inquiries, please contact the development team.',
    },
  },
};
