import { describe, it, expect, beforeEach } from 'vitest';
import { createTestEnvironment } from './TestEnvironment.js';

describe('TestEnvironment', () => {
  let env;

  beforeEach(() => {
    env = createTestEnvironment('');
  });

  describe('constructor', () => {
    it('should initialize with empty state', () => {
      expect(env.state.Balances).toEqual({});
      expect(env.state.TotalSupply).toBe(0);
      expect(env.state.Owner).toBeNull();
      expect(env.state.Handlers).toEqual({});
    });

    it('should have ao object', () => {
      expect(env.ao).toBeDefined();
      expect(typeof env.ao.send).toBe('function');
      expect(typeof env.ao.id).toBe('function');
    });

    it('should have msg object', () => {
      expect(env.msg.From).toBe('test-sender');
      expect(env.msg.Tags).toEqual({});
    });
  });

  describe('assert', () => {
    it('should pass true condition', () => {
      expect(() => env.assert(true)).not.toThrow();
    });

    it('should pass true condition with message', () => {
      expect(() => env.assert(true, 'success')).not.toThrow();
    });

    it('should throw on false condition', () => {
      expect(() => env.assert(false)).toThrow('Assertion failed');
    });

    it('should throw with custom message', () => {
      expect(() => env.assert(false, 'Custom error')).toThrow('Custom error');
    });
  });

  describe('pcall', () => {
    it('should return success for valid function', () => {
      const [success, result] = env.pcall(() => 42);
      expect(success).toBe(true);
      expect(result).toBe(42);
    });

    it('should return error for failing function', () => {
      const [success, error] = env.pcall(() => {
        throw new Error('Test error');
      });
      expect(success).toBe(false);
      expect(error).toBe('Test error');
    });
  });

  describe('ao.send', () => {
    it('should send message and return id', () => {
      const result = env.ao.send({ Target: 'recipient', Tags: { Action: 'Test' } });
      
      expect(result.id).toBeDefined();
      expect(env.state.Messages).toHaveLength(1);
      expect(env.state.Messages[0].Target).toBe('recipient');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      env.ao.send({ Target: 'test' });
      const after = Date.now();
      
      expect(env.state.Messages[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(env.state.Messages[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Handlers', () => {
    it('should add handler', () => {
      const handler = () => 'test';
      env.loadHandler('testHandler', handler);
      
      expect(env.getHandler('testHandler')).toBe(handler);
    });

    it('should return undefined for non-existent handler', () => {
      expect(env.getHandler('nonexistent')).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should execute simple code', () => {
      const result = env.execute('return 42');
      expect(result).toBe(42);
    });

    it('should execute string return', () => {
      const result = env.execute('return "hello"');
      expect(result).toBe('hello');
    });

    it('should execute boolean return', () => {
      expect(env.execute('return true')).toBe(true);
      expect(env.execute('return false')).toBe(false);
    });

    it('should handle basic return', () => {
      expect(env.execute('return 1')).toBe(1);
    });
  });
});
