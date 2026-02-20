import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProcessCategory,
  PricingType,
  createProcessMetadata,
  validateProcessMetadata,
} from './schema.js';

describe('Marketplace Schema', () => {
  describe('ProcessCategory', () => {
    it('should have all categories defined', () => {
      expect(ProcessCategory.TOKENS).toBe('tokens');
      expect(ProcessCategory.DEFI).toBe('defi');
      expect(ProcessCategory.DAO).toBe('dao');
      expect(ProcessCategory.GAMING).toBe('gaming');
      expect(ProcessCategory.SOCIAL).toBe('social');
      expect(ProcessCategory.INFRASTRUCTURE).toBe('infrastructure');
      expect(ProcessCategory.AI).toBe('ai');
      expect(ProcessCategory.OTHER).toBe('other');
    });
  });

  describe('PricingType', () => {
    it('should have all pricing types defined', () => {
      expect(PricingType.FREE).toBe('free');
      expect(PricingType.PAID).toBe('paid');
      expect(PricingType.FREEMIUM).toBe('freemium');
    });
  });

  describe('createProcessMetadata', () => {
    it('should create metadata with defaults', () => {
      const metadata = createProcessMetadata({ name: 'Test Process' });

      expect(metadata.id).toBeDefined();
      expect(metadata.name).toBe('Test Process');
      expect(metadata.slug).toBe('test-process');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('other');
      expect(metadata.pricing.type).toBe('free');
    });

    it('should use provided values', () => {
      const metadata = createProcessMetadata({
        id: 'custom-id',
        name: 'My Process',
        version: '2.0.0',
        category: ProcessCategory.TOKENS,
      });

      expect(metadata.id).toBe('custom-id');
      expect(metadata.name).toBe('My Process');
      expect(metadata.version).toBe('2.0.0');
      expect(metadata.category).toBe('tokens');
    });
  });

  describe('validateProcessMetadata', () => {
    it('should validate correct metadata', () => {
      const metadata = createProcessMetadata({
        name: 'Valid Process',
        description: 'A valid process',
        code: { lua: 'print("hello")' },
      });

      const result = validateProcessMetadata(metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing name', () => {
      const metadata = createProcessMetadata({ name: '' });
      const result = validateProcessMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should reject missing code', () => {
      const metadata = createProcessMetadata({ name: 'Test' });
      metadata.code = {};

      const result = validateProcessMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Lua code is required');
    });

    it('should reject too many tags', () => {
      const metadata = createProcessMetadata({
        name: 'Test',
        code: { lua: 'test' },
        tags: Array(11).fill('tag'),
      });

      const result = validateProcessMetadata(metadata);
      expect(result.valid).toBe(false);
    });
  });
});
