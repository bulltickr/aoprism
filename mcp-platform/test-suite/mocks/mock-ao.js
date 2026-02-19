/**
 * mock-ao.js
 * A deterministic Mock AO Client for "Insane Tests".
 * Simulates HyperBEAM network responses, message passing, and random failures (Chaos Monkey).
 */

export class MockAO {
    constructor(config = {}) {
        this.config = config;
        this.messages = [];
        this.processes = new Map(); // processId -> { state, handlers }
        this.chaosMode = config.chaosMode || false;
        this.chaosRate = config.chaosRate || 0.1; // 10% failure rate
    }

    /**
     * Simulate network latency and potential chaos failure
     */
    async _simulateNetwork() {
        if (this.chaosMode && Math.random() < this.chaosRate) {
            throw new Error('AO_NETWORK_ERROR: Chaos Monkey struck!');
        }
        await new Promise(r => setTimeout(r, 10)); // 10ms latency
    }

    /**
     * Register a mock process handler
     * @param {string} processId 
     * @param {Function} handler (msg) => response
     */
    registerProcess(processId, handler) {
        this.processes.set(processId, handler);
    }

    /**
     * Mock dryrun()
     */
    async dryrun({ process, tags, data }) {
        await this._simulateNetwork();

        if (!this.processes.has(process)) {
            // Default behavior for unknown process: Return nothing or generic error
            return {
                Messages: [],
                Spawns: [],
                Output: [],
                Error: null
            };
        }

        const handler = this.processes.get(process);
        const response = handler({ tags, data, type: 'dryrun' });
        
        return {
            Messages: [{ Data: JSON.stringify(response) }],
            Spawns: [],
            Output: [],
            Error: null
        };
    }

    /**
     * Mock message()
     */
    async message({ process, tags, data, signer }) {
        await this._simulateNetwork();

        if (!signer) throw new Error('Signer required');

        const messageId = `msg_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store for result() retrieval
        this.messages.push({
            id: messageId,
            process,
            tags,
            data,
            timestamp: Date.now()
        });

        return messageId;
    }

    /**
     * Mock result()
     */
    async result({ process, message }) {
        await this._simulateNetwork();

        const msg = this.messages.find(m => m.id === message);
        if (!msg) throw new Error('Message not found');

        if (!this.processes.has(process)) {
            return {
                Messages: [],
                Spawns: [],
                Output: [],
                Error: 'Process not found (404)'
            };
        }

        const handler = this.processes.get(process);
        const responseData = handler({ ...msg, type: 'message' });

        return {
            Messages: [{ 
                Data: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
                Tags: [{ name: 'Action', value: 'Response' }]
            }],
            Spawns: [],
            Output: [],
            Error: null
        };
    }
}
