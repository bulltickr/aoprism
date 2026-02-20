import React, { useState, useRef, useEffect } from 'react';
import { getState, setState } from '../../../state.js';

export function AIChatPanel({ onClose, onInsertCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setError(null);

    const newMessages = [
      ...messages,
      { id: Date.now(), role: 'user', content: userMessage },
    ];
    setMessages(newMessages);

    try {
      const aiResponse = await sendToAI(userMessage, newMessages);
      
      setMessages([
        ...newMessages,
        { id: Date.now() + 1, role: 'assistant', content: aiResponse },
      ]);
    } catch (err) {
      setError(err.message);
      setMessages([
        ...newMessages,
        { id: Date.now() + 1, role: 'assistant', content: `Error: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  async function sendToAI(prompt, conversation) {
    const state = getState();
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversation.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            currentProcess: state.activeProcess,
            currentCode: state.editorCode,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || data.content || 'No response';
    } catch (err) {
      if (err.message.includes('fetch')) {
        return generateLocalResponse(prompt, conversation);
      }
      throw err;
    }
  }

  function generateLocalResponse(prompt, conversation) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('create') || lowerPrompt.includes('write') || lowerPrompt.includes('generate')) {
      return `I can help you create code! Use the Lua Generator feature to generate code from natural language.

Try commands like:
- "Create a token contract that mints 1M to owner"
- "Write a handler for transferring tokens"
- "Generate a DAO voting contract"

Or use the /generate command in the command palette.`;
    }
    
    if (lowerPrompt.includes('debug') || lowerPrompt.includes('error') || lowerPrompt.includes('fix')) {
      return `I can help debug your code! Use the Debug Assistant to analyze errors.

You can:
1. Check the Console tab for error messages
2. Use the Security Auditor to scan for issues
3. Run tests to identify problems

What specific error are you seeing?`;
    }
    
    if (lowerPrompt.includes('audit') || lowerPrompt.includes('security') || lowerPrompt.includes('vulnerability')) {
      return `I can help audit your code for security issues. The Security Auditor can detect:

- Reentrancy vulnerabilities
- Authorization flaws  
- Input validation issues
- Common Lua/AO anti-patterns

Would you like me to scan your current code?`;
    }

    return `I'm your AO development assistant. I can help you with:

**Code Generation**
- "Create a token contract"
- "Write a DAO handler"

**Debugging**
- "Fix this error: ..."
- "Debug my code"

**Security**
- "Audit my contract"
- "Check for vulnerabilities"

**General**
- Explain AO concepts
- Answer questions about Lua

What would you like help with?`;
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="ai-chat-panel">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">🤖</span>
          <span>AI Copilot</span>
        </div>
        <div className="chat-actions">
          <button className="btn-icon" onClick={clearChat} title="Clear chat">
            🗑️
          </button>
          <button className="btn-icon" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <h3>Welcome to AI Copilot!</h3>
            <p>I'm your AO development assistant. Ask me to:</p>
            <ul>
              <li>Generate Lua code from natural language</li>
              <li>Debug errors and suggest fixes</li>
              <li>Audit your contracts for security</li>
              <li>Explain AO concepts</li>
            </ul>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message message-${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <MessageText content={msg.content} onInsertCode={onInsertCode} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error">
            ⚠️ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI Copilot... (Shift+Enter for new line)"
          disabled={isLoading}
          rows={1}
        />
        <button type="submit" disabled={!input.trim() || isLoading}>
          {isLoading ? '⏳' : '➤'}
        </button>
      </form>
    </div>
  );
}

function MessageText({ content, onInsertCode }) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    const language = match[1] || 'lua';
    const code = match[2].trim();

    parts.push({
      type: 'code',
      language,
      code,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return (
    <div className="message-text">
      {parts.map((part, i) =>
        part.type === 'code' ? (
          <div key={i} className="code-block">
            <div className="code-header">
              <span className="code-language">{part.language}</span>
              {onInsertCode && (
                <button
                  className="btn-insert"
                  onClick={() => onInsertCode(part.code)}
                >
                  Insert
                </button>
              )}
            </div>
            <pre>
              <code>{part.code}</code>
            </pre>
          </div>
        ) : (
          <p key={i}>{part.content}</p>
        )
      )}
    </div>
  );
}

export default AIChatPanel;
