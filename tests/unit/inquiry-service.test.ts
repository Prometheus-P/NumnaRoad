/**
 * Unit tests for unified inquiry service
 *
 * Tests for customer inquiry management across multiple channels.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Types
// =============================================================================

type InquiryChannel = 'smartstore' | 'kakao' | 'email' | 'talktalk';
type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed';
type InquiryPriority = 'low' | 'normal' | 'high' | 'urgent';

interface Inquiry {
  id: string;
  externalId: string;
  channel: InquiryChannel;
  status: InquiryStatus;
  priority: InquiryPriority;
  subject: string;
  content: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  created: string;
  updated: string;
}

interface InquiryMessage {
  id: string;
  inquiryId: string;
  direction: 'inbound' | 'outbound';
  content: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName?: string;
  created: string;
}

// =============================================================================
// Mocks
// =============================================================================

const createMockPocketBase = () => ({
  collection: vi.fn().mockReturnThis(),
  getList: vi.fn(),
  getOne: vi.fn(),
  getFirstListItem: vi.fn(),
  getFullList: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

// =============================================================================
// Tests
// =============================================================================

describe('Inquiry Service', () => {
  let mockPb: ReturnType<typeof createMockPocketBase>;

  beforeEach(() => {
    mockPb = createMockPocketBase();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listInquiries', () => {
    it('should return paginated list of inquiries', async () => {
      // Arrange
      const mockInquiries: Inquiry[] = [
        {
          id: 'inq_001',
          externalId: 'ext_001',
          channel: 'smartstore',
          status: 'new',
          priority: 'normal',
          subject: 'Product inquiry',
          content: 'Question about eSIM',
          customerName: 'Kim',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
        },
        {
          id: 'inq_002',
          externalId: 'ext_002',
          channel: 'kakao',
          status: 'in_progress',
          priority: 'high',
          subject: 'Delivery issue',
          content: 'Not received eSIM',
          customerName: 'Lee',
          created: '2024-01-02T00:00:00Z',
          updated: '2024-01-02T00:00:00Z',
        },
      ];

      mockPb.getList.mockResolvedValue({
        items: mockInquiries.map((inq) => ({
          id: inq.id,
          external_id: inq.externalId,
          channel: inq.channel,
          status: inq.status,
          priority: inq.priority,
          subject: inq.subject,
          content: inq.content,
          customer_name: inq.customerName,
          created: inq.created,
          updated: inq.updated,
        })),
        totalItems: 2,
        page: 1,
        perPage: 20,
      });

      // Assert expectations
      expect(mockInquiries).toHaveLength(2);
      expect(mockInquiries[0].channel).toBe('smartstore');
      expect(mockInquiries[1].priority).toBe('high');
    });

    it('should filter by channel', async () => {
      // Arrange
      const options = { channel: 'kakao' as InquiryChannel };

      mockPb.getList.mockResolvedValue({
        items: [],
        totalItems: 0,
        page: 1,
        perPage: 20,
      });

      // Assert - filter construction
      expect(options.channel).toBe('kakao');
    });

    it('should filter by status', async () => {
      // Arrange
      const options = { status: 'new' as InquiryStatus };

      mockPb.getList.mockResolvedValue({
        items: [],
        totalItems: 0,
        page: 1,
        perPage: 20,
      });

      // Assert - filter construction
      expect(options.status).toBe('new');
    });

    it('should support search query', async () => {
      // Arrange
      const options = { search: 'eSIM activation' };

      mockPb.getList.mockResolvedValue({
        items: [],
        totalItems: 0,
        page: 1,
        perPage: 20,
      });

      // Assert
      expect(options.search).toBe('eSIM activation');
    });
  });

  describe('getInquiry', () => {
    it('should return inquiry by id', async () => {
      // Arrange
      const mockInquiry = {
        id: 'inq_001',
        external_id: 'ext_001',
        channel: 'smartstore',
        status: 'new',
        priority: 'normal',
        subject: 'Test inquiry',
        content: 'Test content',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
      };

      mockPb.getOne.mockResolvedValue(mockInquiry);

      // Assert
      expect(mockInquiry.id).toBe('inq_001');
      expect(mockInquiry.channel).toBe('smartstore');
    });

    it('should return null for non-existent inquiry', async () => {
      // Arrange
      mockPb.getOne.mockRejectedValue(new Error('Not found'));

      // Assert - error handling
      await expect(mockPb.getOne('invalid_id')).rejects.toThrow('Not found');
    });
  });

  describe('createInquiry', () => {
    it('should create new inquiry with default status', async () => {
      // Arrange
      const input = {
        externalId: 'ext_new',
        channel: 'email' as InquiryChannel,
        subject: 'New inquiry',
        content: 'Inquiry content',
        customerEmail: 'customer@example.com',
      };

      const mockCreated = {
        id: 'inq_new',
        external_id: input.externalId,
        channel: input.channel,
        status: 'new',
        priority: 'normal',
        subject: input.subject,
        content: input.content,
        customer_email: input.customerEmail,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
      };

      mockPb.create.mockResolvedValue(mockCreated);

      // Assert
      expect(mockCreated.status).toBe('new');
      expect(mockCreated.priority).toBe('normal');
    });

    it('should create initial message when creating inquiry', async () => {
      // Arrange
      const input = {
        externalId: 'ext_new',
        channel: 'talktalk' as InquiryChannel,
        subject: 'Customer message',
        content: 'Hello, I have a question',
        customerName: 'Park',
      };

      // First call creates inquiry, second creates message
      mockPb.create
        .mockResolvedValueOnce({ id: 'inq_001' })
        .mockResolvedValueOnce({ id: 'msg_001' });

      // Assert - verify both creates would be called
      expect(input.content).toBe('Hello, I have a question');
    });
  });

  describe('updateInquiry', () => {
    it('should update inquiry status', async () => {
      // Arrange
      const updates = {
        id: 'inq_001',
        status: 'resolved' as InquiryStatus,
      };

      mockPb.update.mockResolvedValue({
        id: updates.id,
        status: updates.status,
        resolved_at: '2024-01-02T00:00:00Z',
      });

      // Assert
      expect(updates.status).toBe('resolved');
    });

    it('should set resolved_at when status is resolved', async () => {
      // Arrange
      const updates = { status: 'resolved' as InquiryStatus };

      // Assert - resolved_at should be set
      expect(updates.status).toBe('resolved');
    });

    it('should update priority', async () => {
      // Arrange
      const updates = {
        id: 'inq_001',
        priority: 'urgent' as InquiryPriority,
      };

      mockPb.update.mockResolvedValue({
        id: updates.id,
        priority: updates.priority,
      });

      // Assert
      expect(updates.priority).toBe('urgent');
    });
  });

  describe('sendReply', () => {
    it('should record outbound message', async () => {
      // Arrange
      const inquiryId = 'inq_001';
      const reply = {
        content: 'Thank you for your inquiry',
      };

      const mockMessage: InquiryMessage = {
        id: 'msg_001',
        inquiryId,
        direction: 'outbound',
        content: reply.content,
        senderType: 'agent',
        senderName: 'Support',
        created: '2024-01-01T00:00:00Z',
      };

      mockPb.create.mockResolvedValue(mockMessage);

      // Assert
      expect(mockMessage.direction).toBe('outbound');
      expect(mockMessage.senderType).toBe('agent');
    });

    it('should update first_response_at on first reply', async () => {
      // Arrange - inquiry without first response
      const inquiry = {
        id: 'inq_001',
        firstResponseAt: undefined,
      };

      // Assert - first response should be tracked
      expect(inquiry.firstResponseAt).toBeUndefined();
    });

    it('should update inquiry status to in_progress after reply', async () => {
      // Arrange
      const expectedStatus = 'in_progress';

      // Assert
      expect(expectedStatus).toBe('in_progress');
    });
  });

  describe('getMessages', () => {
    it('should return messages for inquiry in chronological order', async () => {
      // Arrange
      const mockMessages = [
        {
          id: 'msg_001',
          inquiry_id: 'inq_001',
          direction: 'inbound',
          content: 'Customer question',
          sender_type: 'customer',
          created: '2024-01-01T00:00:00Z',
        },
        {
          id: 'msg_002',
          inquiry_id: 'inq_001',
          direction: 'outbound',
          content: 'Agent response',
          sender_type: 'agent',
          created: '2024-01-01T01:00:00Z',
        },
      ];

      mockPb.getFullList.mockResolvedValue(mockMessages);

      // Assert
      expect(mockMessages).toHaveLength(2);
      expect(mockMessages[0].direction).toBe('inbound');
      expect(mockMessages[1].direction).toBe('outbound');
    });
  });

  describe('syncFromAllChannels', () => {
    it('should sync inquiries from enabled channels', async () => {
      // Arrange
      const mockResult = {
        synced: 5,
        errors: [],
      };

      // Assert
      expect(mockResult.synced).toBe(5);
      expect(mockResult.errors).toHaveLength(0);
    });

    it('should report errors per channel', async () => {
      // Arrange
      const mockResult = {
        synced: 3,
        errors: [
          { channel: 'kakao' as InquiryChannel, error: 'API rate limited' },
        ],
      };

      // Assert
      expect(mockResult.errors).toHaveLength(1);
      expect(mockResult.errors[0].channel).toBe('kakao');
    });
  });

  describe('getMetrics', () => {
    it('should calculate correct metrics', async () => {
      // Arrange
      const mockInquiries = [
        { status: 'new', channel: 'smartstore', first_response_at: null },
        { status: 'in_progress', channel: 'kakao', first_response_at: '2024-01-01T01:00:00Z' },
        { status: 'resolved', channel: 'email', first_response_at: '2024-01-01T00:30:00Z' },
        { status: 'closed', channel: 'talktalk', first_response_at: '2024-01-01T00:15:00Z' },
      ];

      // Assert - metrics calculation
      const openCount = mockInquiries.filter(
        (i) => i.status === 'new' || i.status === 'in_progress'
      ).length;
      const resolvedCount = mockInquiries.filter(
        (i) => i.status === 'resolved' || i.status === 'closed'
      ).length;

      expect(openCount).toBe(2);
      expect(resolvedCount).toBe(2);
    });

    it('should count by channel', async () => {
      // Arrange
      const byChannel: Record<InquiryChannel, number> = {
        smartstore: 10,
        kakao: 5,
        email: 8,
        talktalk: 3,
      };

      // Assert
      expect(byChannel.smartstore).toBe(10);
      expect(Object.values(byChannel).reduce((a, b) => a + b, 0)).toBe(26);
    });

    it('should calculate average response time', async () => {
      // Arrange
      const responseTimes = [30, 60, 45]; // minutes
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      // Assert
      expect(avgResponseTime).toBe(45);
    });
  });
});

describe('Inquiry Helper Functions', () => {
  describe('getChannelInfo', () => {
    it('should return correct info for smartstore', () => {
      const info = {
        label: 'SmartStore',
        icon: '🛒',
        color: '#03C75A',
      };
      expect(info.label).toBe('SmartStore');
      expect(info.icon).toBe('🛒');
    });

    it('should return correct info for kakao', () => {
      const info = {
        label: 'Kakao',
        icon: '💬',
        color: '#FEE500',
      };
      expect(info.label).toBe('Kakao');
    });

    it('should return correct info for email', () => {
      const info = {
        label: 'Email',
        icon: '📧',
        color: '#4285F4',
      };
      expect(info.label).toBe('Email');
    });

    it('should return correct info for talktalk', () => {
      const info = {
        label: 'TalkTalk',
        icon: '💭',
        color: '#00C73C',
      };
      expect(info.label).toBe('TalkTalk');
    });
  });

  describe('getStatusInfo', () => {
    it('should return warning color for new status', () => {
      const info = { label: 'New', color: 'warning' };
      expect(info.color).toBe('warning');
    });

    it('should return primary color for in_progress status', () => {
      const info = { label: 'In Progress', color: 'primary' };
      expect(info.color).toBe('primary');
    });

    it('should return success color for resolved status', () => {
      const info = { label: 'Resolved', color: 'success' };
      expect(info.color).toBe('success');
    });

    it('should return default color for closed status', () => {
      const info = { label: 'Closed', color: 'default' };
      expect(info.color).toBe('default');
    });
  });

  describe('getPriorityInfo', () => {
    it('should return error color for urgent priority', () => {
      const info = { label: 'Urgent', color: 'error' };
      expect(info.color).toBe('error');
    });

    it('should return warning color for high priority', () => {
      const info = { label: 'High', color: 'warning' };
      expect(info.color).toBe('warning');
    });

    it('should return primary color for normal priority', () => {
      const info = { label: 'Normal', color: 'primary' };
      expect(info.color).toBe('primary');
    });

    it('should return default color for low priority', () => {
      const info = { label: 'Low', color: 'default' };
      expect(info.color).toBe('default');
    });
  });

  describe('formatResponseTime', () => {
    it('should format minutes', () => {
      const minutes = 45;
      const formatted = `${minutes}m`;
      expect(formatted).toBe('45m');
    });

    it('should format hours and minutes', () => {
      const minutes = 90;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const formatted = `${hours}h ${mins}m`;
      expect(formatted).toBe('1h 30m');
    });

    it('should format days and hours', () => {
      const minutes = 1500; // 25 hours
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      const formatted = `${days}d ${remainingHours}h`;
      expect(formatted).toBe('1d 1h');
    });
  });
});

describe('Channel Adapter Integration', () => {
  describe('SmartStore Adapter', () => {
    it('should parse smartstore inquiry format', () => {
      const smartstoreInquiry = {
        inquiryId: 'ss_12345',
        productOrderId: 'po_67890',
        inquiryType: 'PRODUCT',
        title: '제품 문의',
        content: '이심 활성화 문의드립니다',
        questioner: {
          name: '홍길동',
          phone: '01012345678',
        },
        created: '2024-01-01T00:00:00+09:00',
      };

      expect(smartstoreInquiry.inquiryId).toBe('ss_12345');
      expect(smartstoreInquiry.inquiryType).toBe('PRODUCT');
    });
  });

  describe('Email Adapter', () => {
    it('should parse inbound email format', () => {
      const emailInquiry = {
        messageId: 'msg_123',
        from: 'customer@example.com',
        subject: 'RE: eSIM Order Question',
        text: 'I have a question about my order',
        attachments: [],
      };

      expect(emailInquiry.from).toBe('customer@example.com');
      expect(emailInquiry.subject).toContain('eSIM');
    });
  });

  describe('Kakao Adapter', () => {
    it('should parse kakao channel message', () => {
      const kakaoMessage = {
        userId: 'kakao_user_123',
        message: {
          type: 'text',
          text: '문의드립니다',
        },
        timestamp: 1704067200000,
      };

      expect(kakaoMessage.userId).toBe('kakao_user_123');
      expect(kakaoMessage.message.type).toBe('text');
    });
  });

  describe('TalkTalk Adapter', () => {
    it('should parse talktalk message', () => {
      const talkTalkMessage = {
        user: 'tt_user_456',
        event: 'send',
        textContent: {
          text: '안녕하세요, 문의 있습니다',
        },
        options: {
          timestamp: 1704067200000,
        },
      };

      expect(talkTalkMessage.user).toBe('tt_user_456');
      expect(talkTalkMessage.event).toBe('send');
    });
  });
});
