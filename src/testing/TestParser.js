export class TestParser {
  constructor() {
    this.describeBlocks = [];
  }

  parse(luaCode) {
    this.describeBlocks = [];
    
    const describeRegex = /describe\s*\(\s*["']([^"']+)["']\s*,\s*function\s*\(\s*\)\s*/g;
    let match;
    
    while ((match = describeRegex.exec(luaCode)) !== null) {
      const name = match[1];
      const funcStart = match.index + match[0].length;
      
      const innerCode = this.findMatchingEnd(luaCode, funcStart);
      
      if (innerCode !== null) {
        const suite = {
          name,
          code: innerCode,
          tests: [],
          beforeEach: null,
          afterEach: null,
          beforeAll: null,
          afterAll: null,
        };

        this.extractHooks(suite, innerCode);
        suite.tests = this.extractTests(innerCode);

        this.describeBlocks.push(suite);
      }
    }

    return this.describeBlocks;
  }

  findMatchingEnd(code, startIndex) {
    let depth = 1;
    let i = startIndex;
    let result = '';
    
    while (i < code.length && depth > 0) {
      const remaining = code.substr(i);
      
      if (remaining.startsWith('function')) {
        depth++;
        result += 'function';
        i += 8;
      } else if (remaining.startsWith('end') && depth > 1) {
        depth--;
        if (depth === 0) {
          return result;
        }
        result += 'end';
        i += 3;
      } else if (remaining.startsWith('end') && depth === 1) {
        return result;
      } else {
        result += code[i];
        i++;
      }
    }
    
    return null;
  }

  extractHooks(suite, code) {
    const hooks = {
      beforeEach: /beforeEach\s*\(\s*function\s*\(\s*\)\s*([\s\S]*?)\s*end\s*\)/,
      afterEach: /afterEach\s*\(\s*function\s*\(\s*\)\s*([\s\S]*?)\s*end\s*\)/,
      beforeAll: /beforeAll\s*\(\s*function\s*\(\s*\)\s*([\s\S]*?)\s*end\s*\)/,
      afterAll: /afterAll\s*\(\s*function\s*\(\s*\)\s*([\s\S]*?)\s*end\s*\)/,
    };

    for (const [hookName, pattern] of Object.entries(hooks)) {
      const match = code.match(pattern);
      if (match) {
        suite[hookName] = match[1];
      }
    }
  }

  extractTests(code) {
    const tests = [];
    const pattern = /it\s*\(\s*["']([^"']+)["']\s*,\s*function\s*\(\s*\)\s*([\s\S]*?)\s*end\s*\)/g;
    
    let match;
    while ((match = pattern.exec(code)) !== null) {
      tests.push({
        name: match[1],
        code: match[2],
      });
    }

    return tests;
  }

  validate(testFile) {
    const errors = [];

    if (!testFile || testFile.length === 0) {
      errors.push('No describe blocks found in test file');
      return { valid: false, errors };
    }

    for (const suite of testFile) {
      if (!suite.name) {
        errors.push('Describe block missing name');
      }

      if (suite.tests.length === 0) {
        errors.push(`Suite "${suite.name}" has no tests`);
      }

      for (const test of suite.tests) {
        if (!test.name) {
          errors.push(`Test in suite "${suite.name}" missing name`);
        }

        if (!test.code || test.code.trim() === '') {
          errors.push(`Test "${test.name}" has no code`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export function parseTestFile(luaCode) {
  const parser = new TestParser();
  return parser.parse(luaCode);
}

export function validateTests(testSuites) {
  const parser = new TestParser();
  return parser.validate(testSuites);
}

export default TestParser;
