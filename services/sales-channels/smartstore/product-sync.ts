/**
 * SmartStore Product Sync Service
 *
 * Handles synchronization of eSIM products to Naver SmartStore.
 * Supports both manual and automatic sync with change detection.
 */

import type PocketBase from 'pocketbase';
import { getSmartStoreProductClient, SmartStoreProductClient } from './product-client';
import {
  mapEsimProductToSmartStore,
  generateProductHash,
  hasProductChanged,
  validateProductForSmartStore,
} from './product-mapper';
import type {
  EsimProduct,
  ProductSyncRecord,
  ProductSyncRecordCreate,
  ProductSyncRecordUpdate,
  ProductSyncResult,
  BatchSyncResult,
  SyncOptions,
} from './product-types';
import type { SmartStoreResult } from './types';

// ============================================================================
// Constants
// ============================================================================

const COLLECTION_ESIM_PRODUCTS = 'esim_products';
const COLLECTION_SMARTSTORE_PRODUCTS = 'smartstore_products';
const DEFAULT_BATCH_SIZE = 10;
const RETRY_DELAYS = [1000, 3000, 5000]; // Exponential backoff delays

// ============================================================================
// Sync Service Class
// ============================================================================

/**
 * SmartStore Product Sync Service
 *
 * Manages the synchronization of eSIM products to SmartStore.
 */
export class SmartStoreProductSyncService {
  private client: SmartStoreProductClient;
  private pb: PocketBase;

  constructor(pb: PocketBase, client?: SmartStoreProductClient) {
    this.pb = pb;
    this.client = client || getSmartStoreProductClient();
  }

  // ============================================================================
  // Single Product Sync
  // ============================================================================

  /**
   * Sync a single product to SmartStore.
   */
  async syncProduct(
    productId: string,
    options?: { forceUpdate?: boolean; categoryId?: string }
  ): Promise<ProductSyncResult> {
    try {
      // 1. Get the internal product
      const product = await this.getEsimProduct(productId);
      if (!product) {
        return {
          success: false,
          productId,
          action: 'skipped',
          errorMessage: 'Product not found',
          errorType: 'not_found',
        };
      }

      // 2. Validate the product
      const validationErrors = validateProductForSmartStore(product);
      if (validationErrors.length > 0) {
        return {
          success: false,
          productId,
          productName: product.name,
          action: 'skipped',
          errorMessage: validationErrors.join(', '),
          errorType: 'validation',
        };
      }

      // 3. Get or create sync record
      let syncRecord = await this.getSyncRecord(productId);

      // 4. Check if sync is needed
      const newHash = generateProductHash(product);
      if (
        syncRecord &&
        syncRecord.smartstoreProductNo &&
        !options?.forceUpdate &&
        !hasProductChanged(product, syncRecord.dataHash)
      ) {
        return {
          success: true,
          productId,
          productName: product.name,
          smartstoreProductNo: syncRecord.smartstoreProductNo,
          action: 'skipped',
        };
      }

      // 5. Map to SmartStore format
      const smartStoreProduct = mapEsimProductToSmartStore(product, {
        categoryId: options?.categoryId || syncRecord?.categoryId,
      });

      // 6. Create or update on SmartStore
      let result: SmartStoreResult<{ originProductNo: string }>;
      let action: 'created' | 'updated';

      if (syncRecord?.smartstoreProductNo) {
        // Update existing product
        result = await this.retryOperation(() =>
          this.client.updateProduct(syncRecord!.smartstoreProductNo!, smartStoreProduct)
        );
        action = 'updated';
      } else {
        // Create new product
        result = await this.retryOperation(() =>
          this.client.createProduct(smartStoreProduct)
        );
        action = 'created';
      }

      // 7. Handle result
      if (!result.success) {
        // Update sync record with error
        await this.updateSyncRecord(productId, {
          syncStatus: 'failed',
          lastError: result.errorMessage,
        });

        return {
          success: false,
          productId,
          productName: product.name,
          action: 'skipped',
          errorMessage: result.errorMessage,
          errorType: result.errorType,
        };
      }

      // 8. Update sync record
      const smartstoreProductNo = result.data?.originProductNo;
      if (syncRecord) {
        await this.updateSyncRecord(productId, {
          smartstoreProductNo,
          syncStatus: 'synced',
          lastSyncAt: new Date().toISOString(),
          lastError: undefined,
          dataHash: newHash,
        });
      } else {
        await this.createSyncRecord({
          internalProductId: productId,
          smartstoreProductNo,
          syncStatus: 'synced',
          autoSync: true,
          categoryId: options?.categoryId,
          dataHash: newHash,
        });
      }

      // Also create/update the product_mappings for order normalization
      await this.upsertProductMapping(productId, smartstoreProductNo!, product);

      return {
        success: true,
        productId,
        productName: product.name,
        smartstoreProductNo,
        action,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        productId,
        action: 'skipped',
        errorMessage,
        errorType: 'unknown',
      };
    }
  }

  // ============================================================================
  // Batch Sync
  // ============================================================================

  /**
   * Sync multiple products to SmartStore.
   */
  async syncProducts(
    productIds: string[],
    options?: SyncOptions
  ): Promise<BatchSyncResult> {
    const startTime = Date.now();
    const results: ProductSyncResult[] = [];
    const batchSize = options?.batchSize || DEFAULT_BATCH_SIZE;

    // Process in batches to avoid rate limits
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);

      for (const productId of batch) {
        if (options?.dryRun) {
          // In dry run mode, just check what would happen
          const product = await this.getEsimProduct(productId);
          const syncRecord = await this.getSyncRecord(productId);

          results.push({
            success: true,
            productId,
            productName: product?.name,
            action: syncRecord?.smartstoreProductNo ? 'updated' : 'created',
          });
        } else {
          const result = await this.syncProduct(productId, {
            forceUpdate: options?.forceUpdate,
          });
          results.push(result);
        }

        // Small delay between products to avoid rate limits
        await this.delay(200);
      }

      // Longer delay between batches
      if (i + batchSize < productIds.length) {
        await this.delay(1000);
      }
    }

    return this.summarizeResults(results, startTime);
  }

  /**
   * Sync all products with auto-sync enabled.
   */
  async syncAutoEnabledProducts(options?: SyncOptions): Promise<BatchSyncResult> {
    // Get all sync records with auto-sync enabled
    const syncRecords = await this.pb
      .collection(COLLECTION_SMARTSTORE_PRODUCTS)
      .getFullList<ProductSyncRecord>({
        filter: 'autoSync = true',
      });

    const productIds = syncRecords.map((r) => r.internalProductId);
    return this.syncProducts(productIds, options);
  }

  /**
   * Sync all active products.
   */
  async syncAllActiveProducts(options?: SyncOptions): Promise<BatchSyncResult> {
    // Get all active eSIM products
    const products = await this.pb
      .collection(COLLECTION_ESIM_PRODUCTS)
      .getFullList<EsimProduct>({
        filter: 'isActive = true',
      });

    const productIds = products.map((p) => p.id);
    return this.syncProducts(productIds, options);
  }

  // ============================================================================
  // Delete Operations
  // ============================================================================

  /**
   * Remove a product from SmartStore.
   */
  async unsyncProduct(productId: string): Promise<ProductSyncResult> {
    try {
      const syncRecord = await this.getSyncRecord(productId);

      if (!syncRecord?.smartstoreProductNo) {
        return {
          success: true,
          productId,
          action: 'skipped',
        };
      }

      // Delete from SmartStore
      const result = await this.client.deleteProduct(syncRecord.smartstoreProductNo);

      if (!result.success && result.errorType !== 'not_found') {
        return {
          success: false,
          productId,
          action: 'skipped',
          errorMessage: result.errorMessage,
          errorType: result.errorType,
        };
      }

      // Update sync record
      await this.updateSyncRecord(productId, {
        smartstoreProductNo: undefined,
        smartstoreChannelProductNo: undefined,
        syncStatus: 'not_synced',
        lastSyncAt: new Date().toISOString(),
      });

      return {
        success: true,
        productId,
        action: 'deleted',
      };
    } catch (error) {
      return {
        success: false,
        productId,
        action: 'skipped',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // Sync Record Management
  // ============================================================================

  /**
   * Get sync record for a product.
   */
  async getSyncRecord(productId: string): Promise<ProductSyncRecord | null> {
    try {
      const record = await this.pb
        .collection(COLLECTION_SMARTSTORE_PRODUCTS)
        .getFirstListItem<ProductSyncRecord>(`internalProductId = '${productId}'`);
      return record;
    } catch {
      return null;
    }
  }

  /**
   * Create a new sync record.
   */
  async createSyncRecord(data: ProductSyncRecordCreate): Promise<ProductSyncRecord> {
    return this.pb
      .collection(COLLECTION_SMARTSTORE_PRODUCTS)
      .create<ProductSyncRecord>(data);
  }

  /**
   * Update an existing sync record.
   */
  async updateSyncRecord(
    productId: string,
    data: ProductSyncRecordUpdate
  ): Promise<ProductSyncRecord | null> {
    const record = await this.getSyncRecord(productId);
    if (!record) {
      // Create new record if not exists
      return this.createSyncRecord({
        internalProductId: productId,
        syncStatus: data.syncStatus || 'pending',
        autoSync: data.autoSync ?? true,
        ...data,
      });
    }

    return this.pb
      .collection(COLLECTION_SMARTSTORE_PRODUCTS)
      .update<ProductSyncRecord>(record.id, data);
  }

  /**
   * Toggle auto-sync for a product.
   */
  async setAutoSync(productId: string, enabled: boolean): Promise<void> {
    await this.updateSyncRecord(productId, { autoSync: enabled });
  }

  /**
   * Get sync status summary.
   */
  async getSyncStatusSummary(): Promise<{
    total: number;
    synced: number;
    pending: number;
    failed: number;
    notSynced: number;
  }> {
    const records = await this.pb
      .collection(COLLECTION_SMARTSTORE_PRODUCTS)
      .getFullList<ProductSyncRecord>();

    const summary = {
      total: records.length,
      synced: 0,
      pending: 0,
      failed: 0,
      notSynced: 0,
    };

    for (const record of records) {
      switch (record.syncStatus) {
        case 'synced':
          summary.synced++;
          break;
        case 'pending':
          summary.pending++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'not_synced':
          summary.notSynced++;
          break;
      }
    }

    return summary;
  }

  // ============================================================================
  // Product Mapping (for Order Normalization)
  // ============================================================================

  /**
   * Create or update product mapping for order normalization.
   */
  private async upsertProductMapping(
    internalProductId: string,
    externalProductId: string,
    product: EsimProduct
  ): Promise<void> {
    try {
      const existing = await this.pb
        .collection('product_mappings')
        .getFirstListItem(
          `sales_channel='smartstore' && internal_product='${internalProductId}'`
        );

      await this.pb.collection('product_mappings').update(existing.id, {
        external_product_id: externalProductId,
        external_product_name: product.name,
        is_active: product.isActive,
      });
    } catch {
      // Create new mapping
      await this.pb.collection('product_mappings').create({
        internal_product: internalProductId,
        sales_channel: 'smartstore',
        external_product_id: externalProductId,
        external_product_name: product.name,
        provider_sku: product.providerProductId,
        is_active: product.isActive,
      });
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Get an eSIM product by ID.
   */
  private async getEsimProduct(productId: string): Promise<EsimProduct | null> {
    try {
      return await this.pb
        .collection(COLLECTION_ESIM_PRODUCTS)
        .getOne<EsimProduct>(productId);
    } catch {
      return null;
    }
  }

  /**
   * Retry an operation with exponential backoff.
   */
  private async retryOperation<T>(
    operation: () => Promise<SmartStoreResult<T>>,
    maxRetries: number = 3
  ): Promise<SmartStoreResult<T>> {
    let lastResult: SmartStoreResult<T> | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await operation();

      if (result.success || !result.isRetryable) {
        return result;
      }

      lastResult = result;

      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        await this.delay(delay);
      }
    }

    return lastResult || { success: false, errorMessage: 'Max retries exceeded' };
  }

  /**
   * Delay execution.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Summarize batch sync results.
   */
  private summarizeResults(results: ProductSyncResult[], startTime: number): BatchSyncResult {
    const summary: BatchSyncResult = {
      total: results.length,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      results,
      durationMs: Date.now() - startTime,
      syncedAt: new Date().toISOString(),
    };

    for (const result of results) {
      if (!result.success) {
        summary.failed++;
      } else {
        switch (result.action) {
          case 'created':
            summary.created++;
            break;
          case 'updated':
            summary.updated++;
            break;
          case 'skipped':
            summary.skipped++;
            break;
        }
      }
    }

    return summary;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new sync service instance.
 */
export function createProductSyncService(
  pb: PocketBase,
  client?: SmartStoreProductClient
): SmartStoreProductSyncService {
  return new SmartStoreProductSyncService(pb, client);
}
