/**
 * Type definitions for NumnaRoad
 */

export interface Product {
  id: string;
  name: string;
  slug: string;
  country: string;
  country_name: string;
  duration: number;
  data_limit: string;
  speed: string;
  provider: string;
  retail_price: number;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  image?: string;
  description: string;
  features: string[];
  created: string;
  updated: string;
}

export interface Order {
  id: string;
  order_id: string;
  user?: string;
  product: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'card' | 'paypal' | 'bank_transfer' | 'kakaopay';
  payment_id?: string;
  amount: number;
  currency: string;
  esim_qr_code_url?: string;
  esim_activation_code?: string;
  esim_iccid?: string;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  delivered_at?: string;
  email_sent_at?: string;
  error_message?: string;
  retry_count: number;
  created: string;
  updated: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination?: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}

export type BundleType = 'multi_country' | 'data_package' | 'travel_kit' | 'custom';

export interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  bundle_type: BundleType;
  region?: string;
  countries?: string[];
  total_data?: string;
  total_duration_days: number;
  individual_price_sum: number;
  bundle_price: number;
  discount_percent: number;
  savings_amount: number;
  currency: string;
  is_active: boolean;
  is_featured: boolean;
  valid_from?: string;
  valid_until?: string;
  max_purchases?: number;
  current_purchases: number;
  image?: string;
  features?: string[];
  sort_order: number;
  created: string;
  updated: string;
  // Calculated fields from API
  savingsPercent: number;
  isAvailable: boolean;
  // Expanded products
  products: Product[];
}
