export function createTestEnvironment(processCode = '') {
  const state = {
    Balances: {},
    TotalSupply: 0,
    Owner: null,
    Handlers: {},
    Memory: {},
    Messages: [],
    CronJobs: [],
  };

  const ao = {
    send: (msg) => {
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      state.Messages.push({
        id: messageId,
        ...msg,
        timestamp: Date.now(),
      });
      return { id: messageId };
    },
    read: (processId) => {
      return { messages: [] };
    },
    id: () => `test-process-${Date.now()}`,
  };

  const msg = {
    From: 'test-sender',
    Tags: {},
    Data: '',
    Quantity: '0',
  };

  function assert(condition, message = 'Assertion failed') {
    if (!condition) {
      throw new Error(message);
    }
    return true;
  }

  function pcall(fn) {
    try {
      return [true, fn()];
    } catch (error) {
      return [false, error.message];
    }
  }

  function loadHandler(name, handler) {
    state.Handlers[name] = handler;
  }

  function getHandler(name) {
    return state.Handlers[name];
  }

  function execute(code) {
    if (!code || code.trim() === '') return undefined;

    const luaFunctions = {
      'Handlers.add': (name, filter, handler) => {
        state.Handlers[name] = { filter, handler };
      },
      'ao.send': (msg) => ao.send(msg),
      'ao.id': () => ao.id(),
      'assert': assert,
      'pcall': pcall,
      'json': {
        encode: (obj) => JSON.stringify(obj),
        decode: (str) => JSON.parse(str),
      },
    };

    const context = {
      ...state,
      ...luaFunctions,
      msg,
      ao,
      assert,
      pcall,
      Handlers: {
        add: luaFunctions['Handlers.add'],
        get: getHandler,
      },
    };

    try {
      return simulateLuaExecution(code, context);
    } catch (error) {
      throw new Error(`Lua execution error: ${error.message}`);
    }
  }

  function simulateLuaExecution(code, context) {
    let result;
    
    code = code.replace(/local\s+(\w+)\s*=\s*/g, (match, varName) => {
      return `context.${varName} = `;
    });

    code = code.replace(/\b(Balances|TotalSupply|Owner|Memory)\b/g, (match) => {
      return `context.${match}`;
    });

    if (code.includes('Handlers.add')) {
      const handlerMatch = code.match(/Handlers\.add\s*\(\s*["']([^"']+)["']\s*,\s*function\s*\(\s*\)\s*([\s\S]*?)\s*end\s*\)/);
      if (handlerMatch) {
        const [, name, handlerCode] = handlerMatch;
        context.Handlers.add(name, () => {}, () => {
          return simulateLuaExecution(handlerCode, context);
        });
      }
    }

    if (code.includes('assert(')) {
      const assertMatch = code.match(/assert\s*\(\s*([^,]+)\s*(?:,\s*["']([^"']+)["'])?\s*\)/g);
      if (assertMatch) {
        for (const assertCall of assertMatch) {
          const conditionMatch = assertCall.match(/assert\s*\(\s*([^,]+)\s*(?:,\s*["']([^"']+)["'])?\s*\)/);
          if (conditionMatch) {
            const condition = conditionMatch[1].trim();
            const message = conditionMatch[2] || 'Assertion failed';
            
            try {
              const evalResult = new Function('context', `with(context) { return ${condition} }`)(context);
              if (!evalResult) {
                throw new Error(message);
              }
            } catch (error) {
              if (error.message !== message) {
                throw new Error(message);
              }
            }
          }
        }
      }
    }

    if (code.includes('ao.send')) {
      const sendMatch = code.match(/ao\.send\s*\(\s*\{([\s\S]*?)\}\s*\)/g);
      if (sendMatch) {
        for (const sendCall of sendMatch) {
          const objMatch = sendCall.match(/ao\.send\s*\(\s*\{([\s\S]*?)\}\s*\)/);
          if (objMatch) {
            const obj = parseLuaObject(objMatch[1], context);
            ao.send(obj);
          }
        }
      }
    }

    if (code.includes('return')) {
      const returnMatch = code.match(/return\s+(.+)/);
      if (returnMatch) {
        const returnValue = returnMatch[1].trim();
        if (returnValue.startsWith('"') || returnValue.startsWith("'")) {
          result = returnValue.slice(1, -1);
        } else if (!isNaN(returnValue)) {
          result = Number(returnValue);
        } else if (returnValue === 'true') {
          result = true;
        } else if (returnValue === 'false') {
          result = false;
        } else if (context[returnValue] !== undefined) {
          result = context[returnValue];
        }
      }
    }

    return result;
  }

  function parseLuaObject(str, context) {
    const obj = {};
    
    const pairs = str.split(',');
    for (const pair of pairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      
      if (key && value) {
        const cleanKey = key.replace(/["']/g, '');
        
        let cleanValue = value.trim();
        if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
          obj[cleanKey] = cleanValue.slice(1, -1);
        } else if (cleanValue.startsWith("'") && cleanValue.endsWith("'")) {
          obj[cleanKey] = cleanValue.slice(1, -1);
        } else if (!isNaN(cleanValue)) {
          obj[cleanKey] = Number(cleanValue);
        } else if (cleanValue === 'true') {
          obj[cleanKey] = true;
        } else if (cleanValue === 'false') {
          obj[cleanKey] = false;
        } else if (context[cleanValue] !== undefined) {
          obj[cleanKey] = context[cleanValue];
        } else {
          obj[cleanKey] = cleanValue;
        }
      }
    }
    
    return obj;
  }

  return {
    state,
    ao,
    msg,
    assert,
    pcall,
    execute,
    loadHandler,
    getHandler,
  };
}

export default createTestEnvironment;
