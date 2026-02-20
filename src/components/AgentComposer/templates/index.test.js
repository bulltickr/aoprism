import { describe, it, expect } from 'vitest';
import {
  agentTemplates,
  getTemplate,
  getTemplatesByCategory,
  getCategories,
  exportTemplate,
  validateTemplate,
} from './index.js';

describe('Agent Templates', () => {
  describe('agentTemplates', () => {
    it('should have at least one template', () => {
      expect(agentTemplates.length).toBeGreaterThan(0);
    });

    it('should have valid structure', () => {
      agentTemplates.forEach((template) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('nodes');
        expect(template).toHaveProperty('edges');
      });
    });

    it('should have nodes with required properties', () => {
      agentTemplates.forEach((template) => {
        template.nodes.forEach((node) => {
          expect(node).toHaveProperty('id');
          expect(node).toHaveProperty('type');
          expect(node).toHaveProperty('position');
          expect(node).toHaveProperty('data');
        });
      });
    });

    it('should have valid edges', () => {
      agentTemplates.forEach((template) => {
        template.edges.forEach((edge) => {
          expect(edge).toHaveProperty('id');
          expect(edge).toHaveProperty('source');
          expect(edge).toHaveProperty('target');
        });
      });
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', () => {
      const template = getTemplate('simple-hello');
      expect(template).toBeDefined();
      expect(template.name).toBe('Hello World');
    });

    it('should return undefined for invalid id', () => {
      const template = getTemplate('nonexistent');
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates for a category', () => {
      const templates = getTemplatesByCategory('Finance');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach((t) => {
        expect(t.category).toBe('Finance');
      });
    });

    it('should return empty array for unknown category', () => {
      const templates = getTemplatesByCategory('Unknown');
      expect(templates).toEqual([]);
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', () => {
      const categories = getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(new Set(categories).size).toBe(categories.length);
    });
  });

  describe('exportTemplate', () => {
    it('should create template from nodes and edges', () => {
      const nodes = [{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }];
      const edges = [];

      const template = exportTemplate(nodes, edges, 'My Agent', 'A custom agent');

      expect(template.id).toBe('my-agent');
      expect(template.name).toBe('My Agent');
      expect(template.description).toBe('A custom agent');
      expect(template.nodes).toEqual(nodes);
      expect(template.edges).toEqual(edges);
      expect(template).toHaveProperty('exportedAt');
    });
  });

  describe('validateTemplate', () => {
    it('should validate a correct template', () => {
      const template = {
        name: 'Valid Template',
        nodes: [
          { id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
          { id: '2', type: 'action', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1', source: '1', target: '2' }],
      };

      const result = validateTemplate(template);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject template without name', () => {
      const template = {
        nodes: [{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };

      const result = validateTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template must have a name');
    });

    it('should reject template without nodes', () => {
      const template = {
        name: 'Test',
        nodes: [],
        edges: [],
      };

      const result = validateTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template must have at least one node');
    });

    it('should reject template without edges', () => {
      const template = {
        name: 'Test',
        nodes: [{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };

      const result = validateTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template must have at least one connection');
    });

    it('should reject edges with non-existent sources', () => {
      const template = {
        name: 'Test',
        nodes: [{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
        edges: [{ id: 'e1', source: 'nonexistent', target: '1' }],
      };

      const result = validateTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('non-existent source'))).toBe(true);
    });

    it('should reject edges with non-existent targets', () => {
      const template = {
        name: 'Test',
        nodes: [{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
        edges: [{ id: 'e1', source: '1', target: 'nonexistent' }],
      };

      const result = validateTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('non-existent target'))).toBe(true);
    });
  });
});
