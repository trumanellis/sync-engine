/**
 * esbuild configuration for Electron main process
 * Bundles all ESM dependencies (libp2p, helia, orbitdb) into CommonJS
 */

import * as esbuild from 'esbuild';

// Common configuration shared between main and preload
const commonConfig = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: [
    'electron',
    'electron-is-dev',
    'electron-serve',
    'electron-unhandled',
    'electron-updater',
    'electron-window-state',
    'chokidar',
    '@capacitor-community/electron',
    'undici',
    'classic-level',
    'level',
  ],
  alias: {
    '@libp2p/webrtc': './webrtc-stub.js',
    'node-datachannel': './datachannel-stub.js',
  },
  define: {
    'import.meta.url': '__importMetaUrl',
  },
  inject: ['./esm-shim.js'],
  banner: {
    js: `
// Polyfill for Web APIs
const { Blob: NodeBlob } = require('buffer');
const { Event: NodeEvent } = require('events');

// Blob polyfill
if (typeof global.Blob === 'undefined') {
  global.Blob = NodeBlob;
}

// File polyfill
if (typeof global.File === 'undefined') {
  global.File = class File extends global.Blob {
    constructor(bits, name, options = {}) {
      super(bits, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

// CustomEvent polyfill for libp2p
if (typeof global.CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail;
    }
  };
}

// Promise.withResolvers polyfill (ES2024 feature not in Node 18)
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
`,
  },
  sourcemap: true,
  minify: false,
  logLevel: 'info',
};

// Build main process
await esbuild.build({
  ...commonConfig,
  entryPoints: ['src/index.ts'],
  outfile: 'build/main.cjs',
});

console.log('✅ Electron main process bundled successfully');

// Build preload script
await esbuild.build({
  ...commonConfig,
  entryPoints: ['src/preload.ts'],
  outfile: 'build/preload.cjs',
});

console.log('✅ Electron preload script bundled successfully');
