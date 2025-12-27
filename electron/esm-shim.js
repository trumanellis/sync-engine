/**
 * ESM compatibility shim for bundled code
 * Provides import.meta.url for code that needs it
 */

const { pathToFileURL } = require('url');

// Create a getter for import.meta that returns the current filename as a file URL
Object.defineProperty(globalThis, '__importMetaUrl', {
  get() {
    // eslint-disable-next-line no-undef
    return pathToFileURL(__filename).href;
  },
  configurable: true,
});

module.exports = { __importMetaUrl: globalThis.__importMetaUrl };
