// This file was @generated using PocketBase --auto-generate-db-types
// You can also generate this file with the following command:
// pb generate-db-types --dir apps/web/types

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type Collections = {
	esim_products: EsimProductsRecord;
	orders: OrdersRecord;
	automation_logs: AutomationLogsRecord;
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

// =============================================================
// PocketBase collections expand relations
// =============================================================

export type OrdersExpand = {
	productId: EsimProductsRecord;
};

export type AutomationLogsExpand = {
	orderId: OrdersRecord;
};

// =============================================================
// Custom types
// =============================================================

export type Order = OrdersRecord & {
	expand?: OrdersExpand;
};

export type EsimProduct = EsimProductsRecord; // Alias for clarity
