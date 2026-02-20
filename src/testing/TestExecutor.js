import { createTestEnvironment } from './TestEnvironment.js';

export class TestExecutor {
  constructor(processCode, options = {}) {
    this.processCode = processCode;
    this.options = {
      timeout: options.timeout ?? 5000,
      stopOnFailure: options.stopOnFailure ?? false,
      verbose: options.verbose ?? true,
    };
    this.results = [];
    this.currentSuite = null;
    this.testEnvironment = null;
    this.stats = {
      suites: 0,
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };
  }

  async run(testSuites) {
    const startTime = Date.now();
    this.results = [];
    this.stats = {
      suites: testSuites.length,
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };

    for (const suite of testSuites) {
      await this.runSuite(suite);
    }

    this.stats.duration = Date.now() - startTime;

    return {
      success: this.stats.failed === 0,
      stats: this.stats,
      results: this.results,
    };
  }

  async runSuite(suite) {
    this.currentSuite = {
      name: suite.name,
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0,
    };

    const suiteStart = Date.now();

    this.testEnvironment = createTestEnvironment(this.processCode);

    if (suite.beforeAll) {
      try {
        await this.executeLua(suite.beforeAll);
      } catch (error) {
        this.currentSuite.tests.push({
          name: 'beforeAll',
          status: 'error',
          error: error.message,
        });
        this.results.push(this.currentSuite);
        return;
      }
    }

    for (const test of suite.tests) {
      if (this.options.stopOnFailure && this.stats.failed > 0) {
        this.currentSuite.tests.push({
          name: test.name,
          status: 'skipped',
        });
        this.stats.skipped++;
        continue;
      }

      await this.runTest(test);
    }

    if (suite.afterAll) {
      try {
        await this.executeLua(suite.afterAll);
      } catch (error) {
        console.error('afterAll error:', error);
      }
    }

    this.currentSuite.duration = Date.now() - suiteStart;
    this.results.push(this.currentSuite);
  }

  async runTest(test) {
    const testStart = Date.now();
    this.stats.tests++;

    const testResult = {
      name: test.name,
      status: 'pending',
      duration: 0,
      error: null,
    };

    if (this.currentSuite.beforeEach) {
      try {
        await this.executeLua(this.currentSuite.beforeEach);
      } catch (error) {
        testResult.status = 'error';
        testResult.error = `beforeEach failed: ${error.message}`;
        this.currentSuite.tests.push(testResult);
        this.currentSuite.failed++;
        this.stats.failed++;
        return;
      }
    }

    try {
      const testOutput = await this.executeTestCode(test.code);
      
      testResult.status = 'passed';
      testResult.output = testOutput;
      this.currentSuite.passed++;
      this.stats.passed++;

    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
      this.currentSuite.failed++;
      this.stats.failed++;
    }

    if (this.currentSuite.afterEach) {
      try {
        await this.executeLua(this.currentSuite.afterEach);
      } catch (error) {
        console.error('afterEach error:', error);
      }
    }

    testResult.duration = Date.now() - testStart;
    this.currentSuite.tests.push(testResult);
  }

  async executeLua(code) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, this.options.timeout);

      try {
        const result = this.testEnvironment.execute(code);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  async executeTestCode(code) {
    const assertCalls = [];
    const originalAssert = this.testEnvironment.assert;
    
    this.testEnvironment.assert = (...args) => {
      assertCalls.push({ args, timestamp: Date.now() });
      return originalAssert.apply(this.testEnvironment, args);
    };

    try {
      const result = await this.executeLua(code);
      return {
        result,
        assertions: assertCalls.length,
      };
    } finally {
      this.testEnvironment.assert = originalAssert;
    }
  }

  getResults() {
    return this.results;
  }

  getStats() {
    return this.stats;
  }
}

export async function runTests(processCode, testSuites, options) {
  const executor = new TestExecutor(processCode, options);
  return await executor.run(testSuites);
}

export default TestExecutor;
