export { TestParser, parseTestFile, validateTests } from './TestParser.js';
export { TestExecutor, runTests } from './TestExecutor.js';
export { createTestEnvironment } from './TestEnvironment.js';

import { getState, setState } from '../state.js';
import { parseTestFile, validateTests } from './TestParser.js';
import { runTests } from './TestExecutor.js';

export class AOTestingFramework {
  constructor() {
    this.isRunning = false;
    this.currentResults = null;
  }

  async runTestFile(processCode, testCode) {
    if (this.isRunning) {
      throw new Error('Tests are already running');
    }

    this.isRunning = true;
    
    const state = getState();
    setState({
      ...state,
      testRunning: true,
      testResults: null,
    });

    try {
      const testSuites = parseTestFile(testCode);
      
      const validation = validateTests(testSuites);
      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'));
      }

      const results = await runTests(processCode, testSuites, {
        timeout: 5000,
        stopOnFailure: false,
      });

      this.currentResults = results;
      
      setState({
        ...getState(),
        testRunning: false,
        testResults: results,
      });

      window.dispatchEvent(new CustomEvent('aoprism-tests-completed', {
        detail: results,
      }));

      return results;

    } catch (error) {
      setState({
        ...getState(),
        testRunning: false,
        testResults: { error: error.message },
      });
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async runTestByName(processCode, testCode, testName) {
    const testSuites = parseTestFile(testCode);
    
    for (const suite of testSuites) {
      const test = suite.tests.find(t => t.name === testName);
      if (test) {
        const results = await runTests(processCode, [{
          ...suite,
          tests: [test],
        }]);
        
        return results;
      }
    }
    
    throw new Error(`Test "${testName}" not found`);
  }

  getResults() {
    return this.currentResults;
  }

  getStats() {
    if (!this.currentResults) return null;
    return this.currentResults.stats;
  }

  clearResults() {
    this.currentResults = null;
    
    const state = getState();
    setState({
      ...state,
      testResults: null,
    });
  }
}

export const testingFramework = new AOTestingFramework();
export default testingFramework;
