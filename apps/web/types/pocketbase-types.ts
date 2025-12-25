// This file was @generated using PocketBase --auto-generate-db-types
// You can also generate this file with the following command:
// pb generate-db-types --dir apps/web/types

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type Collections = {
	esim_products: EsimProductsRecord;
	orders: OrdersRecord;
	automation_logs: AutomationLogsRecord;
	product_bundles: ProductBundlesRecord;
};

// =============================================================
// PocketBase collections records
// =============================================================

export type EsimProductsRecord = {
	name: string;
	slug: string;
	country: string;
	providerId: string;
	providerSku: string;
	price: number;
	dataLimit: string;
	durationDays: number;
	isActive: boolean;
	stockCount?: number;
};

export type OrdersRecord = {
	customerEmail: string;
	productId: string; // Relation to esim_products
	stripePaymentIntent: string;
	stripeSessionId?: string;
	status: OrderStatus;
	providerUsed?: string;
	esimQrCode?: string;
	esimIccid?: string;
	esimActivationCode?: string;
	correlationId: string;
	errorMessage?: string;
	installationInstructions?: string; // New field to match UIOrder
};

export type AutomationLogsRecord = {
	orderId: string; // Relation to orders
	correlationId: string;
	stepName: string;
	status: string;
	providerName?: string;
	requestPayload?: Record<string, unknown>;
	responsePayload?: Record<string, unknown>;
	errorMessage?: string;
	errorType?: string;
	durationMs?: number;
	retryCount?: number;
};

export type BundleType = 'multi_country' | 'data_package' | 'travel_kit' | 'custom';

export type BundleCurrency = 'USD' | 'KRW' | 'EUR' | 'JPY';

export type ProductBundlesRecord = {
	name: string;
	slug: string;
	description: string;
	products: string[]; // Relation to esim_products (multi-select)
	bundle_type: BundleType;
	region?: string;
	countries?: string[];
	total_data?: string;
	total_duration_days: number;
	individual_price_sum: number;
	bundle_price: number;
	discount_percent: number;
	savings_amount: number;
	currency: BundleCurrency;
	is_active: boolean;
	is_featured: boolean;
	valid_from?: string;
	valid_until?: string;
	max_purchases?: number;
	current_purchases: number;
	image?: string;
	features?: string[];
	sort_order: number;
};

// =============================================================
// PocketBase collections expand relations
// =============================================================

export type OrdersExpand = {
	productId: EsimProductsRecord;
};

export type AutomationLogsExpand = {
	orderId: OrdersRecord;
};

export type ProductBundlesExpand = {
	products: EsimProductsRecord[];
};

// =============================================================
// Custom types
// =============================================================

export type Order = OrdersRecord & {
	expand?: OrdersExpand;
};

export type EsimProduct = EsimProductsRecord; // Alias for clarity

export type ProductBundle = ProductBundlesRecord & {
	id: string;
	created: string;
	updated: string;
	expand?: ProductBundlesExpand;
};

// API response type with calculated fields
export type ProductBundleWithCalculations = ProductBundle & {
	savingsPercent: number;
	isAvailable: boolean;
	products: EsimProductsRecord[]; // Expanded products
};
