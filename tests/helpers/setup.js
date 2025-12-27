/**
 * Test setup and utilities
 */

// Mock localStorage for Node.js environment
if (typeof localStorage === 'undefined') {
    global.localStorage = {
        store: {},
        getItem(key) {
            return this.store[key] || null;
        },
        setItem(key, value) {
            this.store[key] = String(value);
        },
        removeItem(key) {
            delete this.store[key];
        },
        clear() {
            this.store = {};
        }
    };
}

// Mock crypto for Node.js environment
if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    global.crypto = {
        getRandomValues(array) {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        },
        subtle: {
            async digest(algorithm, data) {
                // Simple mock hash for testing
                const hash = new Uint8Array(32);
                for (let i = 0; i < 32; i++) {
                    hash[i] = (data[i % data.length] + i) % 256;
                }
                return hash.buffer;
            },
            async importKey(format, keyData, algorithm, extractable, keyUsages) {
                // Return a mock key object
                return { type: 'public', algorithm, extractable, usages: keyUsages };
            },
            async verify(algorithm, key, signature, data) {
                // Mock verification - always returns true for testing
                // Real tests will mock this per-test
                return true;
            }
        }
    };
}

// Mock window.location for tests
if (typeof window === 'undefined') {
    global.window = {
        location: {
            hostname: 'localhost',
            protocol: 'https:',
            host: 'localhost:5173'
        }
    };
}

// Mock btoa/atob for base64 encoding in Node.js
if (typeof btoa === 'undefined') {
    global.btoa = (str) => {
        return Buffer.from(str, 'binary').toString('base64');
    };
}

if (typeof atob === 'undefined') {
    global.atob = (str) => {
        return Buffer.from(str, 'base64').toString('binary');
    };
}
