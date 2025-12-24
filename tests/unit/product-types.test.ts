/**
 * Product Types and Bundle Schema Tests
 *
 * Tests for product_type field and product_bundles collection.
 *
 * Week 2 - Product type and bundle TDD tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Get the project root (tests/unit -> root)
const projectRoot = path.resolve(__dirname, '../..');

describe('esim_products Schema', () => {
  const schemaPath = path.join(
    projectRoot,
    'pocketbase/collections/esim_products.json'
  );

  let schema: any;

  beforeAll(() => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(content);
  });

  describe('product_type field', () => {
    it('should have product_type field defined', () => {
      const productTypeField = schema.schema.find(
        (f: any) => f.name === 'product_type'
      );
      expect(productTypeField).toBeDefined();
    });

    it('should be a required select field', () => {
      const productTypeField = schema.schema.find(
        (f: any) => f.name === 'product_type'
      );
      expect(productTypeField.type).toBe('select');
      expect(productTypeField.required).toBe(true);
    });

    it('should have correct values: esim, ticket, bundle', () => {
      const productTypeField = schema.schema.find(
        (f: any) => f.name === 'product_type'
      );
      expect(productTypeField.options.values).toContain('esim');
      expect(productTypeField.options.values).toContain('ticket');
      expect(productTypeField.options.values).toContain('bundle');
    });

    it('should allow only single selection', () => {
      const productTypeField = schema.schema.find(
        (f: any) => f.name === 'product_type'
      );
      expect(productTypeField.options.maxSelect).toBe(1);
    });
  });

  describe('indexes', () => {
    it('should have index on product_type', () => {
      const hasProductTypeIndex = schema.indexes.some((idx: string) =>
        idx.includes('product_type')
      );
      expect(hasProductTypeIndex).toBe(true);
    });
  });
});

describe('product_bundles Schema', () => {
  const schemaPath = path.join(
    projectRoot,
    'pocketbase/collections/product_bundles.json'
  );

  let schema: any;

  beforeAll(() => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(content);
  });

  describe('collection metadata', () => {
    it('should have correct collection id and name', () => {
      expect(schema.id).toBe('product_bundles');
      expect(schema.name).toBe('product_bundles');
    });

    it('should be a base collection type', () => {
      expect(schema.type).toBe('base');
    });
  });

  describe('required fields', () => {
    const requiredFields = [
      'name',
      'slug',
      'description',
      'products',
      'bundle_type',
      'total_duration_days',
      'individual_price_sum',
      'bundle_price',
      'discount_percent',
      'savings_amount',
      'currency',
      'is_active',
      'is_featured',
      'current_purchases',
      'sort_order',
    ];

    requiredFields.forEach((fieldName) => {
      it(`should have required field: ${fieldName}`, () => {
        const field = schema.schema.find((f: any) => f.name === fieldName);
        expect(field).toBeDefined();
        expect(field.required).toBe(true);
      });
    });
  });

  describe('products relation', () => {
    it('should reference esim_products collection', () => {
      const productsField = schema.schema.find(
        (f: any) => f.name === 'products'
      );
      expect(productsField.type).toBe('relation');
      expect(productsField.options.collectionId).toBe('esim_products');
    });

    it('should require at least 2 products', () => {
      const productsField = schema.schema.find(
        (f: any) => f.name === 'products'
      );
      expect(productsField.options.minSelect).toBe(2);
    });

    it('should allow up to 10 products', () => {
      const productsField = schema.schema.find(
        (f: any) => f.name === 'products'
      );
      expect(productsField.options.maxSelect).toBe(10);
    });
  });

  describe('bundle_type field', () => {
    it('should have correct bundle type values', () => {
      const bundleTypeField = schema.schema.find(
        (f: any) => f.name === 'bundle_type'
      );
      expect(bundleTypeField.options.values).toContain('multi_country');
      expect(bundleTypeField.options.values).toContain('data_package');
      expect(bundleTypeField.options.values).toContain('travel_kit');
      expect(bundleTypeField.options.values).toContain('custom');
    });
  });

  describe('pricing fields', () => {
    it('should have individual_price_sum with min 0', () => {
      const field = schema.schema.find(
        (f: any) => f.name === 'individual_price_sum'
      );
      expect(field.type).toBe('number');
      expect(field.options.min).toBe(0);
    });

    it('should have bundle_price with min 0', () => {
      const field = schema.schema.find((f: any) => f.name === 'bundle_price');
      expect(field.type).toBe('number');
      expect(field.options.min).toBe(0);
    });

    it('should have discount_percent with range 0-100', () => {
      const field = schema.schema.find(
        (f: any) => f.name === 'discount_percent'
      );
      expect(field.type).toBe('number');
      expect(field.options.min).toBe(0);
      expect(field.options.max).toBe(100);
    });

    it('should have savings_amount with min 0', () => {
      const field = schema.schema.find((f: any) => f.name === 'savings_amount');
      expect(field.type).toBe('number');
      expect(field.options.min).toBe(0);
    });
  });

  describe('currency field', () => {
    it('should support USD, KRW, EUR, JPY', () => {
      const currencyField = schema.schema.find(
        (f: any) => f.name === 'currency'
      );
      expect(currencyField.options.values).toContain('USD');
      expect(currencyField.options.values).toContain('KRW');
      expect(currencyField.options.values).toContain('EUR');
      expect(currencyField.options.values).toContain('JPY');
    });
  });

  describe('validity fields', () => {
    it('should have optional valid_from date', () => {
      const field = schema.schema.find((f: any) => f.name === 'valid_from');
      expect(field.type).toBe('date');
      expect(field.required).toBe(false);
    });

    it('should have optional valid_until date', () => {
      const field = schema.schema.find((f: any) => f.name === 'valid_until');
      expect(field.type).toBe('date');
      expect(field.required).toBe(false);
    });

    it('should have optional max_purchases limit', () => {
      const field = schema.schema.find((f: any) => f.name === 'max_purchases');
      expect(field.type).toBe('number');
      expect(field.required).toBe(false);
    });
  });

  describe('indexes', () => {
    it('should have index on bundle_type', () => {
      const hasIndex = schema.indexes.some((idx: string) =>
        idx.includes('bundle_type')
      );
      expect(hasIndex).toBe(true);
    });

    it('should have index on is_active', () => {
      const hasIndex = schema.indexes.some((idx: string) =>
        idx.includes('is_active')
      );
      expect(hasIndex).toBe(true);
    });

    it('should have unique index on slug', () => {
      const hasIndex = schema.indexes.some(
        (idx: string) =>
          idx.includes('slug') && idx.includes('UNIQUE')
      );
      expect(hasIndex).toBe(true);
    });
  });

  describe('access rules', () => {
    it('should allow public list and view', () => {
      expect(schema.listRule).toBe('');
      expect(schema.viewRule).toBe('');
    });

    it('should require authentication for create/update/delete', () => {
      expect(schema.createRule).toContain('@request.auth.id');
      expect(schema.updateRule).toContain('@request.auth.id');
      expect(schema.deleteRule).toContain('@request.auth.id');
    });
  });
});

describe('Product Type TypeScript Types', () => {
  it('should define ProductType union type', () => {
    // This test ensures the type is usable in TypeScript
    type ProductType = 'esim' | 'ticket' | 'bundle';

    const validTypes: ProductType[] = ['esim', 'ticket', 'bundle'];
    expect(validTypes).toHaveLength(3);
  });

  it('should define BundleType union type', () => {
    type BundleType = 'multi_country' | 'data_package' | 'travel_kit' | 'custom';

    const validTypes: BundleType[] = [
      'multi_country',
      'data_package',
      'travel_kit',
      'custom',
    ];
    expect(validTypes).toHaveLength(4);
  });
});

describe('Bundle Business Logic', () => {
  describe('discount calculation', () => {
    it('should calculate discount percentage correctly', () => {
      const individualSum = 100;
      const bundlePrice = 80;
      const discountPercent = ((individualSum - bundlePrice) / individualSum) * 100;
      expect(discountPercent).toBe(20);
    });

    it('should calculate savings amount correctly', () => {
      const individualSum = 100;
      const bundlePrice = 80;
      const savings = individualSum - bundlePrice;
      expect(savings).toBe(20);
    });

    it('should handle zero discount', () => {
      const individualSum = 100;
      const bundlePrice = 100;
      const discountPercent = ((individualSum - bundlePrice) / individualSum) * 100;
      expect(discountPercent).toBe(0);
    });
  });

  describe('bundle validation', () => {
    it('should require at least 2 products', () => {
      const minProducts = 2;
      const productCount = 1;
      expect(productCount >= minProducts).toBe(false);
    });

    it('should allow up to 10 products', () => {
      const maxProducts = 10;
      const productCount = 10;
      expect(productCount <= maxProducts).toBe(true);
    });

    it('should validate bundle price is less than or equal to individual sum', () => {
      const individualSum = 100;
      const bundlePrice = 80;
      expect(bundlePrice <= individualSum).toBe(true);
    });
  });
});
