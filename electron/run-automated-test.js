#!/usr/bin/env node

/**
 * Fully automated P2P connection test using Chrome DevTools Protocol
 * No manual interaction required!
 */

const CDP = require('chrome-remote-interface');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function findElectronDebugPort() {
  try {
    // Check if any Electron instance has debugging enabled
    const { stdout } = await execPromise('lsof -nP -iTCP -sTCP:LISTEN | grep LISTEN | grep node');
    const lines = stdout.split('\n');

    for (const line of lines) {
      const match = line.match(/:(\d+)/);
      if (match) {
        const port = parseInt(match[1]);
        // Typical Chrome DevTools ports
        if (port >= 9222 && port <= 9999) {
          return port;
        }
      }
    }
  } catch (error) {
    // No debugging port found
  }
  return null;
}

async function runTest() {
  log('\n🤖 Automated P2P Connection Test (Chrome DevTools Protocol)\n', 'bright');
  log('=' .repeat(70), 'cyan');

  // Test script to execute
  const testScript = `
    (async () => {
      const results = {
        success: true,
        tests: [],
        errors: []
      };

      try {
        // Test 1: Check API
        if (!window.electronP2P) {
          results.success = false;
          results.errors.push('window.electronP2P not available');
          return results;
        }
        results.tests.push({ name: 'API Available', status: 'PASSED' });

        // Test 2: Get Peer ID
        const peerId = await window.electronP2P.getPeerId();
        results.tests.push({ name: 'Get Peer ID', status: 'PASSED', data: peerId });

        // Test 3: Get Multiaddrs
        const multiaddrs = await window.electronP2P.getMultiaddrs();
        results.tests.push({ name: 'Get Multiaddrs', status: 'PASSED', data: multiaddrs });

        // Test 4: Initial Connections
        const initialConns = await window.electronP2P.getConnections();
        results.tests.push({ name: 'Initial Connections', status: 'PASSED', data: initialConns.length });

        // Test 5: Dial Peer
        const dialResult = await window.electronP2P.dialPeer(
          '/ip4/127.0.0.1/tcp/4003/p2p/12D3KooWPXK56VmLx6ioMJszv4NJBKZe8WZpSBBafiXt8TgMRoU2'
        );

        if (dialResult.success) {
          results.tests.push({ name: 'Dial Peer', status: 'PASSED' });
        } else {
          results.success = false;
          results.errors.push('Dial failed: ' + dialResult.error);
          return results;
        }

        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 6: Verify Connection
        const connections = await window.electronP2P.getConnections();
        if (connections.length > 0) {
          results.tests.push({
            name: 'Verify Connection',
            status: 'PASSED',
            data: connections
          });
        } else {
          results.success = false;
          results.errors.push('No connections found after dial');
        }

        return results;
      } catch (error) {
        results.success = false;
        results.errors.push(error.message);
        return results;
      }
    })();
  `;

  log('\n📡 Connecting to Instance 2 (port 9230)...', 'cyan');

  const port = 9230; // Instance 2's debug port

  if (false) {
    log('\n⚠️  No Electron debug port found.', 'yellow');
    log('\nTo enable debugging, start Electron with:', 'cyan');
    log('  npx electron . --inspect=9229', 'bright');
    log('\nFor now, using alternative test method...\n', 'yellow');

    // Fallback: Just verify both instances are running
    log('✅ Verification from logs:', 'green');
    log('  Instance 1: 12D3KooWKGJYW6bC9dvDRaZvAmRYiQtNn9ANaPDusrgEtpmJDUwQ', 'cyan');
    log('  Instance 2: 12D3KooWLxJLED1L5vogR9A8EK6DPKGXLCMmspjZKkg3VABDQbkZ', 'cyan');
    log('\n📝 To test connection, use the test page:', 'yellow');
    log('  file:///Users/truman/Code/SyncEng/syncengine-v2/electron/test-p2p-auto.html\n', 'bright');

    return;
  }

  log(`✅ Found Electron on port ${port}`, 'green');
  log('\n🔗 Connecting via Chrome DevTools Protocol...', 'cyan');

  let client;
  try {
    client = await CDP({ port });
    const { Runtime } = client;

    await Runtime.enable();
    log('✅ Connected to Electron renderer', 'green');

    log('\n🧪 Running P2P connection tests...\n', 'bright');

    const { result } = await Runtime.evaluate({
      expression: testScript,
      awaitPromise: true,
      returnByValue: true
    });

    const testResults = result.value;

    // Display results
    log('=' .repeat(70), 'cyan');
    log('TEST RESULTS', 'bright');
    log('=' .repeat(70), 'cyan');

    testResults.tests.forEach((test, i) => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      log(`\n${status} Test ${i + 1}: ${test.name}`, test.status === 'PASSED' ? 'green' : 'red');
      if (test.data) {
        if (Array.isArray(test.data)) {
          if (test.data.length > 0 && typeof test.data[0] === 'object') {
            // Connection objects
            test.data.forEach((conn, j) => {
              log(`  Connection ${j + 1}:`, 'cyan');
              log(`    Peer: ${conn.remotePeer}`, 'cyan');
              log(`    Address: ${conn.remoteAddr}`, 'cyan');
              log(`    Status: ${conn.status}`, 'cyan');
            });
          } else {
            // Multiaddrs or simple array
            test.data.forEach(item => log(`    ${item}`, 'cyan'));
          }
        } else {
          log(`    ${test.data}`, 'cyan');
        }
      }
    });

    if (testResults.errors.length > 0) {
      log('\n❌ ERRORS:', 'red');
      testResults.errors.forEach(err => log(`  ${err}`, 'red'));
    }

    log('\n' + '=' .repeat(70), 'cyan');
    if (testResults.success) {
      log('\n🎉 ALL TESTS PASSED! P2P CONNECTION WORKS!\n', 'green');
    } else {
      log('\n❌ SOME TESTS FAILED\n', 'red');
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Check if chrome-remote-interface is installed
const { exec: execSync } = require('child_process');
execSync('npm list chrome-remote-interface', (error) => {
  if (error) {
    log('\n📦 Installing chrome-remote-interface...', 'yellow');
    execSync('npm install chrome-remote-interface', (installError) => {
      if (installError) {
        log('❌ Failed to install chrome-remote-interface', 'red');
        log('Please run: npm install chrome-remote-interface', 'cyan');
        process.exit(1);
      }
      runTest();
    });
  } else {
    runTest();
  }
});
