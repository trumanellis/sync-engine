/**
 * CommonJS entry point for Electron
 * Dynamically imports the ESM module to support libp2p
 */

// Use dynamic import() to load ESM module
import('./build/src/index.js').catch((error) => {
  console.error('❌ Failed to load main process:', error);
  process.exit(1);
});
