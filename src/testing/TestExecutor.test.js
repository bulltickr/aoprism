import { describe, it, expect, beforeEach } from 'vitest';
import { TestExecutor, runTests } from './TestExecutor.js';

describe('TestExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new TestExecutor('');
  });

  describe('constructor', () => {
    it('should create executor with default options', () => {
      expect(executor.options.timeout).toBe(5000);
      expect(executor.options.stopOnFailure).toBe(false);
      expect(executor.options.verbose).toBe(true);
    });

    it('should accept custom options', () => {
      const custom = new TestExecutor('', { timeout: 1000, stopOnFailure: true });
      expect(custom.options.timeout).toBe(1000);
      expect(custom.options.stopOnFailure).toBe(true);
    });

    it('should initialize empty stats', () => {
      expect(executor.stats.suites).toBe(0);
      expect(executor.stats.tests).toBe(0);
      expect(executor.stats.passed).toBe(0);
      expect(executor.stats.failed).toBe(0);
    });
  });

  describe('run', () => {
    it('should run test suites', async () => {
      const testSuites = [
        {
          name: 'Math Tests',
          code: '',
          tests: [
            {
              name: 'should add numbers',
              code: 'assert(1 + 1 == 2, "Math should work")',
            },
          ],
        },
      ];

      const result = await executor.run(testSuites);

      expect(result.stats.suites).toBe(1);
      expect(result.stats.tests).toBe(1);
    });

    it('should fail tests that throw', async () => {
      const testSuites = [
        {
          name: 'Failing Tests',
          code: '',
          tests: [
            {
              name: 'should fail',
              code: 'error("Intentionally failed")',
            },
          ],
        },
      ];

      const result = await executor.run(testSuites);

      expect(result.stats.tests).toBe(1);
    });

    it('should run multiple suites', async () => {
      const testSuites = [
        {
          name: 'Suite 1',
          code: '',
          tests: [{ name: 'test 1', code: 'assert(true)' }],
        },
        {
          name: 'Suite 2',
          code: '',
          tests: [{ name: 'test 2', code: 'assert(true)' }],
        },
      ];

      const result = await executor.run(testSuites);

      expect(result.stats.suites).toBe(2);
      expect(result.stats.tests).toBe(2);
    });

    it('should run multiple tests in a suite', async () => {
      const testSuites = [
        {
          name: 'Multiple Tests',
          code: '',
          tests: [
            { name: 'test 1', code: 'assert(true)' },
            { name: 'test 2', code: 'assert(true)' },
            { name: 'test 3', code: 'assert(true)' },
          ],
        },
      ];

      const result = await executor.run(testSuites);

      expect(result.stats.tests).toBe(3);
      expect(result.stats.passed).toBe(3);
    });
  });

  describe('hooks', () => {
    it('should run beforeEach before each test', async () => {
      let counter = 0;
      
      const testSuites = [
        {
          name: 'Hooks Test',
          code: '',
          beforeEach: 'counter = counter + 1',
          tests: [
            { name: 'test 1', code: '' },
            { name: 'test 2', code: '' },
          ],
        },
      ];

      await executor.run(testSuites);
    });

    it('should run afterAll after suite', async () => {
      const testSuites = [
        {
          name: 'AfterAll Test',
          code: '',
          afterAll: 'cleanup = true',
          tests: [
            { name: 'test', code: 'assert(true)' },
          ],
        },
      ];

      const result = await executor.run(testSuites);

      expect(result.stats.tests).toBe(1);
    });
  });

  describe('getResults', () => {
    it('should return results after execution', async () => {
      const testSuites = [
        {
          name: 'Test',
          code: '',
          tests: [{ name: 'test', code: 'assert(true)' }],
        },
      ];

      await executor.run(testSuites);
      const results = executor.getResults();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test');
    });
  });

  describe('getStats', () => {
    it('should return stats after execution', async () => {
      const testSuites = [
        {
          name: 'Test',
          code: '',
          tests: [
            { name: 'pass', code: 'assert(true)' },
            { name: 'fail', code: 'assert(false)' },
          ],
        },
      ];

      await executor.run(testSuites);
      const stats = executor.getStats();

      expect(stats.tests).toBe(2);
      expect(stats.passed + stats.failed).toBe(2);
    });
  });
});

describe('runTests', () => {
  it('should be a convenience function', async () => {
    const testSuites = [
      {
        name: 'Quick Test',
        code: '',
        tests: [{ name: 'test', code: 'assert(1 == 1)' }],
      },
    ];

    const result = await runTests('', testSuites);

    expect(result.success).toBe(true);
    expect(result.stats.passed).toBe(1);
  });
});
