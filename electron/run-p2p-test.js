/**
 * Automated P2P Connection Test Runner
 * Loads the test page in Instance 2 programmatically
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

async function runTest() {
  // Wait for app to be ready
  await app.whenReady();

  // Find the Instance 2 window (it will have the temp user-data-dir)
  const windows = BrowserWindow.getAllWindows();

  if (windows.length === 0) {
    console.error('❌ No Electron windows found');
    process.exit(1);
  }

  // Get the first window (should be Instance 2)
  const testWindow = windows[0];

  console.log('🚀 Loading automated P2P test page...');

  const testPagePath = path.join(__dirname, 'test-p2p-auto.html');
  testWindow.loadFile(testPagePath);

  console.log('✅ Test page loaded. Check the window for results.');
  console.log('📊 Tests will run automatically in 500ms...');
}

runTest().catch(console.error);
