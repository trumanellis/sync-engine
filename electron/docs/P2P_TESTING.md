# P2P Connection Testing Guide

## Current Status

✅ **Phase 1: ESM Compatibility & Error Handling** - COMPLETE
✅ **Phase 2: Multi-Instance Testing Infrastructure** - COMPLETE

Both Electron instances are running successfully with native LevelDB storage and fault-tolerant multi-instance support.

## Running Instances

### Instance 1 (Fixed + Dynamic Ports)
- **Peer ID**: `12D3KooWAcQbo3gkUQZz5j6rBBnDSTn6wfNWKw435Fy12FpuKwQq`
- **Multiaddrs**:
  - `/ip4/127.0.0.1/tcp/4003/p2p/12D3KooWAcQbo3gkUQZz5j6rBBnDSTn6wfNWKw435Fy12FpuKwQq`
  - `/ip4/127.0.0.1/tcp/65314/p2p/12D3KooWAcQbo3gkUQZz5j6rBBnDSTn6wfNWKw435Fy12FpuKwQq`
- **Storage**: `~/Library/Application Support/SyncEngine/orbitdb`
- **Start Command**: `npx electron .`

### Instance 2 (Dynamic Port Only - Fault Tolerance Working)
- **Peer ID**: `12D3KooWEuuud8QSQVp9EDgRy6bBdNqTFCTnGSyEeEcBLUqMdGyu`
- **Multiaddr**: `/ip4/127.0.0.1/tcp/65323/p2p/12D3KooWEuuud8QSQVp9EDgRy6bBdNqTFCTnGSyEeEcBLUqMdGyu`
- **Storage**: `/private/tmp/syncengine-instance2/orbitdb`
- **Start Command**: `npx electron . --user-data-dir=/tmp/syncengine-instance2`

## Testing P2P Connection

### Option A: Using Test HTML Page (Recommended)

1. **Start Both Instances** (if not already running):
   ```bash
   # Terminal 1 - Instance 1
   cd /Users/truman/Code/SyncEng/syncengine-v2/electron
   npx electron .

   # Terminal 2 - Instance 2
   cd /Users/truman/Code/SyncEng/syncengine-v2/electron
   npx electron . --user-data-dir=/tmp/syncengine-instance2
   ```

2. **Load Test Page in Instance 2**:
   - Open Instance 2's window
   - Open DevTools: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux)
   - In the Console tab, navigate to the test page:
     ```javascript
     window.location.href = 'file:///Users/truman/Code/SyncEng/syncengine-v2/electron/test-p2p.html';
     ```

3. **Test Connection**:
   - The page will auto-load your node info
   - Update the multiaddr input with Instance 1's multiaddr (already pre-filled)
   - Click "Connect to Peer"
   - Wait for success message
   - Connections will auto-refresh to show the new peer connection

### Option B: Using DevTools Console

1. **Open DevTools** in Instance 2:
   - Press `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux)

2. **Get Your Node Info**:
   ```javascript
   await window.electronP2P.getPeerId()
   // Returns: "12D3KooWEuuud8QSQVp9EDgRy6bBdNqTFCTnGSyEeEcBLUqMdGyu"

   await window.electronP2P.getMultiaddrs()
   // Returns: ["/ip4/127.0.0.1/tcp/65323/p2p/12D3KooW..."]
   ```

3. **Check Initial Connections** (should be empty):
   ```javascript
   await window.electronP2P.getConnections()
   // Returns: []
   ```

4. **Connect to Instance 1**:
   ```javascript
   const result = await window.electronP2P.dialPeer(
     '/ip4/127.0.0.1/tcp/4003/p2p/12D3KooWAcQbo3gkUQZz5j6rBBnDSTn6wfNWKw435Fy12FpuKwQq'
   );
   console.log(result);
   // Expected: { success: true }
   ```

5. **Verify Connection Established**:
   ```javascript
   await window.electronP2P.getConnections()
   // Expected: Array with one connection object showing remotePeer, remoteAddr, status
   ```

## Expected Results

### ✅ Successful Connection
When the connection succeeds, you should see:

```javascript
{
  success: true
}
```

And `getConnections()` should return:
```javascript
[
  {
    remotePeer: "12D3KooWAcQbo3gkUQZz5j6rBBnDSTn6wfNWKw435Fy12FpuKwQq",
    remoteAddr: "/ip4/127.0.0.1/tcp/4003",
    status: "open"
  }
]
```

### ❌ Common Issues

1. **Port Already in Use**:
   - **Symptom**: Instance 2 fails to start
   - **Solution**: Fault tolerance is already implemented. Instance 2 will use only dynamic port.

2. **Connection Refused**:
   - **Symptom**: `dialPeer` returns `{ success: false, error: "..." }`
   - **Solution**: Verify Instance 1 is running and check the multiaddr is correct

3. **API Not Available**:
   - **Symptom**: `window.electronP2P is undefined`
   - **Solution**: Ensure you're running from within the Electron renderer, not a browser

## Architecture Verification

### ✅ Verified Components

1. **ESM/CommonJS Compatibility**: esbuild bundling working perfectly
2. **Native LevelDB Storage**: Real filesystem persistence confirmed
3. **Fault Tolerance**: Multi-instance support with graceful port fallback
4. **IPC Bridge**: Secure contextBridge API exposed to renderer
5. **Error Handling**: Graceful `LEVEL_NOT_FOUND` error handling on first run
6. **Manual Peer Connection**: `dialPeer` API functional and exposed

### 📊 Storage Verification

Both instances are using real LevelDB storage on the filesystem:

**Instance 1**: `~/Library/Application Support/SyncEngine/orbitdb/`
```
blocks/
  CURRENT, LOCK, LOG, MANIFEST-000010, 000011.log
data/
  CURRENT, LOCK, LOG, MANIFEST-000004, 000005.log
```

**Instance 2**: `/private/tmp/syncengine-instance2/orbitdb/`
```
blocks/
  CURRENT, LOCK, LOG, MANIFEST-000010, 000011.log
data/
  CURRENT, LOCK, LOG, MANIFEST-000004, 000005.log
```

## Next Steps

After verifying P2P connection works:

1. **Test Data Sync** - Create OrbitDB documents in one instance and verify they replicate
2. **Phase 3: Tailscale Integration** - Add automatic peer discovery for mesh networking
3. **E2E Tests** - Automate multi-instance P2P sync testing
4. **Performance Testing** - Measure sync latency and throughput

## Troubleshooting

### View Instance Logs

```bash
# Instance 1 logs
cat /tmp/electron-instance1.log

# Instance 2 logs
cat /tmp/electron-instance2.log
```

### Kill Running Instances

```bash
# Kill all Electron processes
killall Electron

# Or find specific PIDs
ps aux | grep "Electron"
kill <PID>
```

### Restart Both Instances

```bash
# Kill existing instances
killall Electron

# Start fresh
cd /Users/truman/Code/SyncEng/syncengine-v2/electron

# Terminal 1
npx electron . > /tmp/electron-instance1.log 2>&1 &

# Terminal 2
npx electron . --user-data-dir=/tmp/syncengine-instance2 > /tmp/electron-instance2.log 2>&1 &

# Wait 2 seconds and check logs
sleep 2
cat /tmp/electron-instance1.log
cat /tmp/electron-instance2.log
```

## API Reference

### `window.electronP2P` API

All methods return Promises.

#### `initialize()`
Initialize P2P network in main process (already called automatically).

**Returns**: `Promise<{success: boolean, peerId?: string, multiaddrs?: string[], storageDir?: string, error?: string}>`

#### `getPeerId()`
Get libp2p peer ID.

**Returns**: `Promise<string|null>`

#### `getMultiaddrs()`
Get libp2p multiaddrs.

**Returns**: `Promise<string[]>`

#### `getConnections()`
Get current P2P connections.

**Returns**: `Promise<Array<{remotePeer: string, remoteAddr: string, status: string}>>`

#### `dialPeer(multiaddr)`
Manually dial a peer by multiaddr.

**Parameters**:
- `multiaddr` (string) - Full multiaddr of peer to connect to

**Returns**: `Promise<{success: boolean, error?: string}>`

**Example**:
```javascript
await window.electronP2P.dialPeer('/ip4/127.0.0.1/tcp/4003/p2p/12D3Koo...')
```

---

**Last Updated**: 2025-12-26 19:30
**Status**: Phase 2 Complete - Ready for Connection Testing
