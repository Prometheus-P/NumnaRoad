/**
 * Customer Inquiry Service Module
 *
 * Unified management of customer inquiries across multiple channels:
 * - SmartStore (Naver)
 * - Email (Resend)
 * - Kakao Channel
 * - Naver TalkTalk
 */

export { InquiryService, createInquiryService } from './inquiry-service';

export type {
  InquiryChannel,
  InquiryStatus,
  InquiryPriority,
  Inquiry,
  InquiryMessage,
  InquiryListOptions,
  InquiryListResult,
  InquiryMetrics,
  ExternalInquiry,
  ReplyContent,
  ReplyResult,
  InquiryChannelAdapter,
} from './adapters/types';
