/**
 * Naver SmartStore Commerce Product API Types
 *
 * Based on: https://apicenter.commerce.naver.com
 * Product API v2
 */

// ============================================================================
// Product Status Types
// ============================================================================

/**
 * Product status types
 */
export type ProductStatusType =
  | 'SALE' // 판매중
  | 'SUSPENSION' // 판매 중지
  | 'OUTOFSTOCK' // 품절
  | 'PROHIBITION' // 판매 금지
  | 'DELETE'; // 삭제

/**
 * Product sale type
 */
export type ProductSaleType = 'NEW' | 'OLD';

/**
 * Channel display status
 */
export type ChannelDisplayStatusType = 'ON' | 'SUSPENSION';

// ============================================================================
// Product Request Types
// ============================================================================

/**
 * SmartStore product registration/update request
 */
export interface SmartStoreProductRequest {
  originProduct: OriginProduct;
  smartstoreChannelProduct?: SmartStoreChannelProduct;
}

/**
 * Origin product details
 */
export interface OriginProduct {
  /** Product status */
  statusType: ProductStatusType;
  /** Sale type - always 'NEW' for eSIM */
  saleType: ProductSaleType;
  /** Naver category leaf ID */
  leafCategoryId: string;
  /** Product name (max 100 chars) */
  name: string;
  /** HTML product description */
  detailContent: string;
  /** Product images */
  images: ProductImages;
  /** Sale price in KRW */
  salePrice: number;
  /** Stock quantity - 999 for digital products */
  stockQuantity: number;
  /** Delivery information */
  deliveryInfo: DeliveryInfo;
  /** Additional attributes */
  detailAttribute?: ProductDetailAttribute;
  /** Seller product code for internal reference */
  sellerCodeInfo?: SellerCodeInfo;
}

/**
 * Product images configuration
 */
export interface ProductImages {
  /** Main product image (required) */
  representativeImage: ProductImage;
  /** Additional images (up to 9) */
  optionalImages?: ProductImage[];
}

/**
 * Product image
 */
export interface ProductImage {
  /** Image URL - must be Naver CDN URL for registration */
  url: string;
}

/**
 * Delivery information for eSIM (digital product)
 */
export interface DeliveryInfo {
  /** Delivery type - 'DIRECT' for digital products */
  deliveryType: 'DIRECT' | 'DELIVERY' | 'VISIT';
  /** Delivery fee configuration */
  deliveryFee: DeliveryFee;
  /** Delivery attribute type */
  deliveryAttributeType?: 'NORMAL' | 'TODAY' | 'FRESH';
}

/**
 * Delivery fee configuration
 */
export interface DeliveryFee {
  /** Fee type - 'FREE' for eSIM */
  deliveryFeeType: 'FREE' | 'PAID' | 'CONDITIONAL_FREE';
  /** Base fee amount (if PAID) */
  baseFee?: number;
  /** Free shipping threshold (if CONDITIONAL_FREE) */
  freeConditionalAmount?: number;
}

/**
 * Product detail attributes
 */
export interface ProductDetailAttribute {
  /** Option information for variants */
  optionInfo?: ProductOptionInfo;
  /** Product info notice (required for e-commerce) */
  productInfoProvidedNotice?: ProductInfoProvidedNotice;
  /** Origin area information */
  originAreaInfo?: OriginAreaInfo;
  /** SEO-related tags */
  seoInfo?: SeoInfo;
  /** Custom product attributes */
  customProductAttributes?: CustomAttribute[];
}

/**
 * Product option information (for variants)
 */
export interface ProductOptionInfo {
  /** Option combination group names */
  optionCombinationGroupNames?: OptionCombinationGroupNames;
  /** Option combinations */
  optionCombinations?: OptionCombination[];
  /** Standard option groups */
  standardOptionGroups?: StandardOptionGroup[];
  /** Whether to use stock management per option */
  useStockManagement?: boolean;
}

/**
 * Option combination group names
 */
export interface OptionCombinationGroupNames {
  optionGroupName1?: string;
  optionGroupName2?: string;
  optionGroupName3?: string;
}

/**
 * Individual option combination
 */
export interface OptionCombination {
  /** Option value for group 1 */
  optionName1: string;
  /** Option value for group 2 */
  optionName2?: string;
  /** Option value for group 3 */
  optionName3?: string;
  /** Stock quantity for this option */
  stockQuantity: number;
  /** Price adjustment (can be negative) */
  price: number;
  /** Whether this option is available */
  usable: boolean;
  /** Seller's internal SKU */
  sellerManagementCode?: string;
}

/**
 * Standard option group (for predefined options)
 */
export interface StandardOptionGroup {
  groupName: string;
  standardOptionName: string;
}

/**
 * Product info provided notice (required for e-commerce)
 */
export interface ProductInfoProvidedNotice {
  /** Notice type */
  productInfoProvidedNoticeType: ProductInfoNoticeType;
  /** Generic product info */
  etc?: EtcProductInfo;
}

/**
 * Product info notice types
 */
export type ProductInfoNoticeType =
  | 'WEAR' // 의류
  | 'SHOES' // 신발
  | 'BAG' // 가방
  | 'FOOD' // 식품
  | 'COSMETIC' // 화장품
  | 'ELECTRONIC' // 가전
  | 'FURNITURE' // 가구
  | 'DIGITAL_CONTENTS' // 디지털 콘텐츠
  | 'ETC'; // 기타

/**
 * Generic product info for ETC type
 */
export interface EtcProductInfo {
  /** Item name */
  itemName: string;
  /** Model name */
  modelName: string;
  /** Manufacturer/Provider */
  manufacturer: string;
  /** Country of origin */
  origin?: string;
  /** Quality assurance */
  qualityAssurance?: string;
  /** Customer service contact */
  customerService?: string;
}

/**
 * Origin area information
 */
export interface OriginAreaInfo {
  /** Origin area code */
  originAreaCode: string;
  /** Importer name */
  importer?: string;
  /** Whether product is domestic */
  domestic?: boolean;
}

/**
 * SEO information
 */
export interface SeoInfo {
  /** Page title */
  pageTitle?: string;
  /** Meta description */
  metaDescription?: string;
  /** SEO keywords */
  sellerTags?: SellerTag[];
}

/**
 * Seller tag for SEO
 */
export interface SellerTag {
  code?: number;
  text: string;
}

/**
 * Custom attribute
 */
export interface CustomAttribute {
  attributeSeq: number;
  attributeValue: string;
}

/**
 * Seller code information
 */
export interface SellerCodeInfo {
  /** Seller's internal product code */
  sellerManagementCode?: string;
  /** Custom code 1 */
  sellerCustomCode1?: string;
  /** Custom code 2 */
  sellerCustomCode2?: string;
}

/**
 * SmartStore channel-specific settings
 */
export interface SmartStoreChannelProduct {
  /** Whether to register on Naver Shopping */
  naverShoppingRegistration: boolean;
  /** Channel display status */
  channelProductDisplayStatusType?: ChannelDisplayStatusType;
  /** Store category ID */
  storeKeyCategoryId?: string;
}

// ============================================================================
// Product Response Types
// ============================================================================

/**
 * Product registration/update response
 */
export interface SmartStoreProductResponse {
  /** Origin product number (Naver's internal ID) */
  originProductNo: string;
  /** SmartStore channel product number */
  smartstoreChannelProductNo?: string;
  /** Current status */
  statusType: ProductStatusType;
  /** Product name */
  name: string;
  /** Sale price */
  salePrice: number;
  /** Stock quantity */
  stockQuantity: number;
  /** Created timestamp */
  created: string;
  /** Modified timestamp */
  modified: string;
}

/**
 * Product list item (from search/list APIs)
 */
export interface SmartStoreProductListItem {
  originProductNo: string;
  channelProductNo?: string;
  name: string;
  salePrice: number;
  stockQuantity: number;
  statusType: ProductStatusType;
  representativeImageUrl?: string;
  sellerManagementCode?: string;
  created: string;
  modified: string;
}

/**
 * Paginated product list response
 */
export interface SmartStorePaginatedProducts {
  contents: SmartStoreProductListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ============================================================================
// Image Upload Types
// ============================================================================

/**
 * Image upload response
 */
export interface ImageUploadResponse {
  /** Naver CDN URL for the uploaded image */
  url: string;
  /** Image ID */
  imageId?: string;
}

// ============================================================================
// Category Types
// ============================================================================

/**
 * Naver product category
 */
export interface NaverCategory {
  /** Category ID */
  id: string;
  /** Category name */
  name: string;
  /** Parent category ID */
  parentCategoryId?: string;
  /** Whether this is a leaf category */
  isLeaf: boolean;
  /** Full category path */
  wholeCategoryName: string;
}

/**
 * Category attributes (required fields for category)
 */
export interface CategoryAttributes {
  categoryId: string;
  /** Required attributes for product registration */
  requiredAttributes: CategoryAttribute[];
  /** Optional attributes */
  optionalAttributes: CategoryAttribute[];
}

/**
 * Single category attribute
 */
export interface CategoryAttribute {
  attributeSeq: number;
  attributeName: string;
  attributeType: 'TEXT' | 'SELECT' | 'MULTISELECT';
  required: boolean;
  values?: AttributeValue[];
}

/**
 * Attribute value option
 */
export interface AttributeValue {
  valueSeq: number;
  valueName: string;
}

// ============================================================================
// Sync Record Types (Internal)
// ============================================================================

/**
 * Product sync status
 */
export type ProductSyncStatus = 'pending' | 'synced' | 'failed' | 'not_synced';

/**
 * Product sync record (stored in PocketBase)
 */
export interface ProductSyncRecord {
  /** PocketBase record ID */
  id: string;
  /** Internal eSIM product ID */
  internalProductId: string;
  /** SmartStore origin product number */
  smartstoreProductNo?: string;
  /** SmartStore channel product number */
  smartstoreChannelProductNo?: string;
  /** Last sync timestamp */
  lastSyncAt?: string;
  /** Current sync status */
  syncStatus: ProductSyncStatus;
  /** Last error message if failed */
  lastError?: string;
  /** Whether auto-sync is enabled */
  autoSync: boolean;
  /** Naver category ID used */
  categoryId?: string;
  /** Hash of product data for change detection */
  dataHash?: string;
  /** Created timestamp */
  created: string;
  /** Updated timestamp */
  updated: string;
}

/**
 * Sync record for creation (without system fields)
 */
export interface ProductSyncRecordCreate {
  internalProductId: string;
  smartstoreProductNo?: string;
  smartstoreChannelProductNo?: string;
  syncStatus: ProductSyncStatus;
  autoSync: boolean;
  categoryId?: string;
  dataHash?: string;
}

/**
 * Sync record for update
 */
export interface ProductSyncRecordUpdate {
  smartstoreProductNo?: string;
  smartstoreChannelProductNo?: string;
  lastSyncAt?: string;
  syncStatus?: ProductSyncStatus;
  lastError?: string;
  autoSync?: boolean;
  categoryId?: string;
  dataHash?: string;
}

// ============================================================================
// Sync Operation Types
// ============================================================================

/**
 * Sync action type
 */
export type SyncAction = 'created' | 'updated' | 'deleted' | 'skipped';

/**
 * Individual product sync result
 */
export interface ProductSyncResult {
  success: boolean;
  productId: string;
  productName?: string;
  smartstoreProductNo?: string;
  action: SyncAction;
  errorMessage?: string;
  errorType?: string;
}

/**
 * Batch sync result
 */
export interface BatchSyncResult {
  /** Total products processed */
  total: number;
  /** Successfully created */
  created: number;
  /** Successfully updated */
  updated: number;
  /** Failed operations */
  failed: number;
  /** Skipped (no changes) */
  skipped: number;
  /** Individual results */
  results: ProductSyncResult[];
  /** Sync duration in milliseconds */
  durationMs: number;
  /** Sync timestamp */
  syncedAt: string;
}

// ============================================================================
// API Options Types
// ============================================================================

/**
 * Options for listing products
 */
export interface ListProductsOptions {
  /** Page number (0-indexed) */
  page?: number;
  /** Page size (default 100, max 500) */
  size?: number;
  /** Product status filter */
  statusType?: ProductStatusType;
  /** Search by product name */
  productName?: string;
  /** Search by seller management code */
  sellerManagementCode?: string;
  /** Sort field */
  sortBy?: 'CREATED' | 'MODIFIED' | 'SALE_PRICE';
  /** Sort direction */
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Options for syncing products
 */
export interface SyncOptions {
  /** Only sync products with autoSync enabled */
  autoSyncOnly?: boolean;
  /** Force update even if no changes detected */
  forceUpdate?: boolean;
  /** Dry run - don't actually sync */
  dryRun?: boolean;
  /** Batch size for processing */
  batchSize?: number;
}

// ============================================================================
// eSIM Product Types (Internal Reference)
// ============================================================================

/**
 * Internal eSIM product (from PocketBase esim_products collection)
 * This is a reference type - actual type should match PocketBase schema
 */
export interface EsimProduct {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  /** Data amount in bytes or description like "Unlimited" */
  dataLimit: string;
  /** Data unit (GB, MB, Unlimited) */
  dataUnit: string;
  /** Duration in days */
  durationDays: number;
  /** Price in KRW */
  price: number;
  /** Original price for discount display */
  originalPrice?: number;
  /** Provider SKU/product code */
  providerProductId: string;
  /** Provider name */
  provider: string;
  /** Whether product is active */
  isActive: boolean;
  /** Product description */
  description?: string;
  /** Product image URL */
  imageUrl?: string;
  /** Created timestamp */
  created: string;
  /** Updated timestamp */
  updated: string;
}
