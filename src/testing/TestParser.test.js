import { describe, it, expect, beforeEach } from 'vitest';
import { TestParser, parseTestFile, validateTests } from './TestParser.js';

describe('TestParser', () => {
  let parser;

  beforeEach(() => {
    parser = new TestParser();
  });

  describe('parse', () => {
    it('should parse describe blocks', () => {
      const code = `
describe("Math operations", function()
  it("should add numbers", function()
    assert(1 + 1 == 2)
  end)
end)
`;
      const suites = parser.parse(code);
      
      expect(suites).toHaveLength(1);
      expect(suites[0].name).toBe('Math operations');
    });

    it('should parse multiple describe blocks', () => {
      const code = `
describe("Suite 1", function()
  it("test 1", function()
  end)
end)

describe("Suite 2", function()
  it("test 2", function()
  end)
end)
`;
      const suites = parser.parse(code);
      
      expect(suites).toHaveLength(2);
      expect(suites[0].name).toBe('Suite 1');
      expect(suites[1].name).toBe('Suite 2');
    });

    it('should extract it blocks', () => {
      const code = `
describe("Math", function()
  it("should add", function()
    local result = 1 + 1
  end)
  
  it("should subtract", function()
    local result = 5 - 3
  end)
end)
`;
      const suites = parser.parse(code);
      
      expect(suites[0].tests).toHaveLength(2);
      expect(suites[0].tests[0].name).toBe('should add');
      expect(suites[0].tests[1].name).toBe('should subtract');
    });

    it('should extract beforeEach hooks', () => {
      const code = `
describe("Suite", function()
  beforeEach(function()
    Balances = {}
  end)
  
  it("test", function()
  end)
end)
`;
      const suites = parser.parse(code);
      
      expect(suites[0].beforeEach).toBeDefined();
      expect(suites[0].beforeEach).toContain('Balances');
    });

    it('should extract afterEach hooks', () => {
      const code = `
describe("Suite", function()
  afterEach(function()
    cleanup()
  end)
  
  it("test", function()
  end)
end)
`;
      const suites = parser.parse(code);
      
      expect(suites[0].afterEach).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate correct test file', () => {
      const suites = [
        {
          name: 'Test Suite',
          tests: [{ name: 'test', code: 'assert(true)' }],
        },
      ];
      
      const result = validateTests(suites);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty test file', () => {
      const result = validateTests([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No describe blocks found in test file');
    });

    it('should reject suite without tests', () => {
      const suites = [
        {
          name: 'Empty Suite',
          tests: [],
        },
      ];
      
      const result = validateTests(suites);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no tests'))).toBe(true);
    });
  });
});

describe('parseTestFile', () => {
  it('should be a convenience function', () => {
    const code = `
describe("Test", function()
  it("works", function()
  end)
end)
`;
    const result = parseTestFile(code);
    expect(result).toHaveLength(1);
    expect(result[0].tests).toHaveLength(1);
  });
});
