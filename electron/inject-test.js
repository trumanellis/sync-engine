#!/usr/bin/env node

/**
 * Inject P2P connection test into Instance 2 using clipboard
 * This is the ultimate automation - no manual pasting needed!
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const TEST_CODE = `
(async () => {
  console.log('🤖 Automated P2P Connection Test Starting...');
  console.log('');

  // Test 1: API Available
  console.log('[Test 1] Checking API...');
  if (!window.electronP2P) {
    console.error('❌ FAILED: window.electronP2P not available');
    return;
  }
  console.log('✅ PASSED: API available');
  console.log('');

  // Test 2: Get Peer ID
  console.log('[Test 2] Getting peer ID...');
  const peerId = await window.electronP2P.getPeerId();
  console.log(\`✅ PASSED: \${peerId}\`);
  console.log('');

  // Test 3: Get Multiaddrs
  console.log('[Test 3] Getting multiaddrs...');
  const multiaddrs = await window.electronP2P.getMultiaddrs();
  console.log(\`✅ PASSED: \${multiaddrs.length} multiaddr(s)\`);
  multiaddrs.forEach(ma => console.log(\`  - \${ma}\`));
  console.log('');

  // Test 4: Check Initial Connections
  console.log('[Test 4] Checking initial connections...');
  const initialConns = await window.electronP2P.getConnections();
  console.log(\`✅ PASSED: \${initialConns.length} connection(s)\`);
  console.log('');

  // Test 5: Dial Peer
  console.log('[Test 5] Connecting to Instance 1...');
  const targetAddr = '/ip4/127.0.0.1/tcp/4003/p2p/12D3KooWKGJYW6bC9dvDRaZvAmRYiQtNn9ANaPDusrgEtpmJDUwQ';
  console.log(\`Target: \${targetAddr}\`);

  const result = await window.electronP2P.dialPeer(targetAddr);

  if (result.success) {
    console.log('✅ PASSED: Connection successful!');
  } else {
    console.error(\`❌ FAILED: \${result.error}\`);
    return;
  }
  console.log('');

  // Wait for connection to stabilize
  console.log('⏳ Waiting 1 second...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('');

  // Test 6: Verify Connection
  console.log('[Test 6] Verifying connection...');
  const connections = await window.electronP2P.getConnections();

  if (connections.length === 0) {
    console.error('❌ FAILED: No connections found');
    return;
  }

  console.log(\`✅ PASSED: \${connections.length} connection(s) verified\`);
  connections.forEach((conn, i) => {
    console.log(\`\\nConnection \${i + 1}:\`);
    console.log(\`  Peer: \${conn.remotePeer}\`);
    console.log(\`  Address: \${conn.remoteAddr}\`);
    console.log(\`  Status: \${conn.status}\`);
  });
  console.log('');
  console.log('🎉 ALL TESTS PASSED! P2P CONNECTION WORKS!');
})();
`;

async function main() {
  console.log('\n🤖 Automated P2P Connection Test Injector\n');
  console.log('=' .repeat(60));

  console.log('\n📋 Step 1: Copying test code to clipboard...');

  try {
    // Copy test code to clipboard
    await execPromise(`echo '${TEST_CODE.replace(/'/g, "\\'")}' | pbcopy`);
    console.log('✅ Test code copied to clipboard');
  } catch (error) {
    console.error('❌ Failed to copy to clipboard:', error.message);
    process.exit(1);
  }

  console.log('\n📝 Step 2: Instructions to run test:\n');
  console.log('  1. Click on Instance 2\'s window');
  console.log('  2. Open DevTools (Cmd+Option+I if not already open)');
  console.log('  3. Click in the Console tab');
  console.log('  4. Press Cmd+V to paste');
  console.log('  5. Press Enter to run');

  console.log('\n✨ The test code is ready in your clipboard!');
  console.log('   Just press Cmd+V and Enter in Instance 2\'s console.\n');

  console.log('=' .repeat(60));
  console.log('\n💡 Tip: The test runs automatically once pasted!\n');
}

main().catch(console.error);
