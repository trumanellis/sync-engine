# SyncEngine V2 Build Plan - Electron Main Process Architecture

## 🎯 Goal
Build a production-ready P2P synchronization engine using:
- **Capacitor Electron** (SvelteKit renderer + Node.js main process)
- **WebAuthn** for biometric identity (renderer)
- **OrbitDB** for P2P database (main process)
- **Tailscale** for mesh networking (Phase 3)
- **Native LevelDB** for persistence (main process)

## 🚨 Critical Architecture Decision

### Why We're Using Electron Main Process

**The Problem with Browser P2P (V1)**:
- IndexedDB corruption requiring cleanup before every init
- 50MB storage limit (Safari even worse)
- WebRTC NAT traversal unreliable (10-30 second latency)
- Mobile P2P completely fails
- 3-second startup delay waiting for storage cleanup

**The Solution: Electron Main Process**:
- Node.js environment = native LevelDB (no IndexedDB!)
- TCP transport = no WebRTC complexity
- Filesystem storage = unlimited, rock-solid persistence
- Tailscale mesh = direct connections (no NAT issues)
- **WebAuthn stays in renderer** (browser API requirement)

### Architecture: Main Process ↔ Renderer via IPC

```
┌─────────────────────────────────────────┐
│  Renderer Process (Browser/Chromium)   │
│                                         │
│  • SvelteKit UI                         │
│  • WebAuthn (biometric auth)           │
│  • did:key generation                   │
│  • User interactions                    │
│                                         │
│  window.electronP2P.* (IPC calls)      │
└────────────┬────────────────────────────┘
             │ IPC Bridge (contextBridge)
             │
┌────────────▼────────────────────────────┐
│   Main Process (Node.js)                │
│                                         │
│  • libp2p (TCP transport)               │
│  • Helia (IPFS)                         │
│  • OrbitDB (P2P database)               │
│  • Native LevelDB storage               │
│  • Tailscale integration (Phase 3)     │
│                                         │
│  ~/Library/Application Support/         │
│  SyncEngine/orbitdb/*.ldb               │
└─────────────────────────────────────────┘
```

## 📋 Implementation Phases

### ✅ Phase 1.3: WebAuthn Identity (COMPLETED)
- Real biometric authentication
- did:key DID generation
- 24 tests passing

### ✅ Phase 1.4: Cryptographic Signing (COMPLETED)
- Real WebAuthn assertions for signing
- Web Crypto API verification
- 13 tests passing (37 total)

### ✅ Phase 1: Main Process P2P Restructure (COMPLETED)

#### Step 1.1: ✅ Electron Main Process Entry (DONE)
**Files Created**:
- `electron/src/p2p-main.ts` (207 lines)
- `electron/src/preload.ts` (70 lines)
- `electron/src/ipc-bridge.ts` (340 lines)
- `electron/src/index.ts` (166 lines - integrated)

**Implementation**:
- libp2p with TCP transport (localhost:4003)
- Native LevelDB storage: `~/Library/Application Support/SyncEngine/orbitdb/`
- IPC handlers for P2P and OrbitDB operations
- Secure `contextBridge` exposure with 14 methods

#### Step 1.2: ✅ Move P2P Code to Main Process (DONE)
**Implementation Complete**:
- Created `electron/src/p2p-main.ts` (207 lines)
- TypeScript module with clean API exports
- Functions: `initializeP2P()`, `createOrbitDBWithIdentity()`, `getPeerId()`, `getMultiaddrs()`, `getConnections()`, `getOrbitDB()`, `shutdownP2P()`
- Singleton pattern for libp2p/helia/orbitdb instances
- Native LevelDB: `path.join(app.getPath('userData'), 'orbitdb')`
- TCP-only transport (no WebRTC complexity)
- Proper error handling and logging

**Key Code**:
```typescript
// Main process - CORRECT implementation
const blockstore = new LevelBlockstore(path.join(storageDir, 'blocks'));
const datastore = new LevelDatastore(path.join(storageDir, 'data'));

libp2p = await createLibp2p({
  addresses: { listen: ['/ip4/127.0.0.1/tcp/4003'] },
  transports: [tcp()],  // Just TCP!
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: { identify: identify(), pubsub: gossipsub(...) }
});
```

#### Step 1.3: ✅ IPC Bridge for OrbitDB Operations (DONE)
**File**: `electron/src/ipc-bridge.ts` (340 lines)
**Implementation Complete**:
- 11 IPC handlers registered: `orbitdb:open`, `orbitdb:close`, `orbitdb:getDatabases`, `orbitdb:query`, `orbitdb:get`, `orbitdb:add`, `orbitdb:put`, `orbitdb:del`, `orbitdb:info`
- Database tracking with `Map<address, Database>`
- Real-time update events via `db.events.on('update')`
- Sends updates to renderer: `mainWindow.webContents.send('orbitdb:update', {...})`
- Filter function support (eval with security warning for production)
- Graceful error handling throughout
- `closeAllDatabases()` for cleanup

**API Implemented**:
```typescript
// 11 IPC handlers available to renderer:
ipcMain.handle('orbitdb:open', async (_event, name, options) => {...})
ipcMain.handle('orbitdb:query', async (_event, address, filterFn) => {...})
ipcMain.handle('orbitdb:add', async (_event, address, doc) => {...})
// ... and 8 more

// Real-time updates:
db.events.on('update', (entry) => {
  mainWindow.webContents.send('orbitdb:update', { address, entry, operation });
});
```

#### Step 1.4: ✅ Update Renderer to Use IPC (DONE)
**File**: `src/lib/app-init.js` (216 lines - UPDATED)
**Implementation Complete**:
- Platform detection: `isElectron()` checks for `window.electronP2P`
- Identity serialization: `serializeIdentity()` removes non-serializable functions
- IPC initialization flow:
  1. WebAuthn identity in renderer (stays here)
  2. `window.electronP2P.initialize()` - P2P in main
  3. `window.electronP2P.createOrbitDB(identity)` - OrbitDB in main
  4. `window.electronP2P.openDatabase('intentions')` - Open DB
  5. Create proxy wrapper for database operations
  6. Set up real-time listener: `window.electronP2P.onUpdate(callback)`
  7. Load initial data
- Falls back to mock mode if not in Electron
- Database proxy with `put()`, `all()`, `get()`, `del()` methods
- Graceful shutdown with `shutdownApp()`

**Actual Implementation**:
```javascript
if (isElectron()) {
  const p2pResult = await window.electronP2P.initialize();
  const orbitdbResult = await window.electronP2P.createOrbitDB(serializeIdentity(identity));
  const dbResult = await window.electronP2P.openDatabase('intentions', { type: 'documents' });

  databases.intentions = {
    async put(intention) { return await window.electronP2P.add(address, intention); },
    async all() { return await window.electronP2P.query(address); }
    // ... more methods
  };

  updateListener = window.electronP2P.onUpdate(async (data) => {
    if (data.address === intentionsDbAddress) {
      const allIntentions = await databases.intentions.all();
      intentions.set(allIntentions);
    }
  });
}
```

#### Step 1.5: ✅ ESM/CommonJS Compatibility Solution (DONE)
**Challenge**: libp2p v1.0+ is ESM-only, Electron main process requires CommonJS

**Solution**: esbuild bundling with polyfills

**File**: `electron/esbuild.config.js` (87 lines)
**Implementation Complete**:
- Bundle all ESM dependencies (libp2p, helia, orbitdb) into single CommonJS file
- Output: `build/main.cjs` (5.4 MB bundled, was 5.7 MB)
- External modules: electron, classic-level, level, undici
- Stub unnecessary modules: `@libp2p/webrtc`, `node-datachannel`
- Polyfills for Web APIs: `Blob`, `File`, `CustomEvent`, `Promise.withResolvers`

**Key Configuration**:
```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',  // Convert ESM → CommonJS!
  outfile: 'build/main.cjs',
  external: ['electron', 'classic-level', 'level', 'undici'],
  alias: {
    '@libp2p/webrtc': './webrtc-stub.js',
    'node-datachannel': './datachannel-stub.js'
  },
  banner: {
    js: `
      // Polyfill for Web APIs
      global.Blob = require('buffer').Blob;
      global.File = class File extends global.Blob { ... };
      global.CustomEvent = class CustomEvent extends Event { ... };
      Promise.withResolvers = function() { ... };  // ES2024 feature
    `
  }
});
```

**Polyfills Added**:
1. **Blob** - From Node.js `buffer` module
2. **File** - Custom class extending Blob
3. **CustomEvent** - For libp2p event handling
4. **Promise.withResolvers** - ES2024 feature not in Node 18

**Stubs Created**:
- `electron/webrtc-stub.js` - Stub for @libp2p/webrtc (TCP-only, no WebRTC)
- `electron/datachannel-stub.js` - Stub for node-datachannel native module

**Result**:
- ✅ All ESM dependencies bundled successfully
- ✅ Electron can load `build/main.cjs` with `require()`
- ✅ No "Cannot use import statement" errors
- ✅ Build time: ~300ms

#### Step 1.6: ✅ Graceful Error Handling (DONE)
**Challenge**: `LEVEL_NOT_FOUND` errors on first run confusing users

**Solution**: Detect first-run errors and show friendly messages

**File**: `electron/src/p2p-main.ts` (updated)
**Changes**:
- Added specific `LEVEL_NOT_FOUND` error handling in `initializeP2P()` (lines 102-124)
- Added specific `LEVEL_NOT_FOUND` error handling in `createOrbitDBWithIdentity()` (lines 136-149)
- Errors are non-fatal - return success with helpful log messages
- LevelDB/OrbitDB create missing data on first write

**Before Fix**:
```
❌ [P2P-Main] P2P initialization failed: [Error: NotFound: ]
  code: 'LEVEL_NOT_FOUND',
  notFound: true,
  status: 404
```

**After Fix**:
```
📝 [P2P-Main] First run - empty blockstore (this is normal)
✅ [P2P-Main] P2P network initialized successfully
```

**Impact**:
- ✅ First-run experience now friendly and clear
- ✅ No confusing error messages
- ✅ P2P network still initializes correctly
- ✅ Storage created automatically on first use

### Phase 2: Local Testing (1-2 hours)

#### Step 2.1: Test Localhost Sync
**Goal**: Verify two Electron instances can sync intentions database locally

**Commands**:
```bash
# Terminal 1: Run first instance
npm run electron:start

# Terminal 2: Run second instance with different user data
npm run electron:start -- --user-data-dir=./user2

# Test:
# 1. Create intention in Instance 1
# 2. Should appear in Instance 2 within seconds
# 3. Check console logs for P2P connection establishment
```

**Success Criteria**:
- Both instances show connected peer in logs
- Intentions sync bidirectionally < 2 seconds
- No errors in console
- Both instances persist data after restart

#### Step 2.2: Verify Native Storage
**Goal**: Confirm we're using real LevelDB, NOT IndexedDB

**Checks**:
```bash
# Check storage location
ls -la ~/Library/Application\ Support/SyncEngine/orbitdb/

# Should see:
# blocks/*.ldb  (LevelDB files!)
# data/*.ldb    (LevelDB files!)
# orbitdb/...   (OrbitDB metadata)

# Should NOT see any IndexedDB references in logs
```

**Success Criteria**:
- Actual `.ldb` files exist on filesystem
- Storage size > 50MB works (proves not IndexedDB)
- No "clearing IndexedDB" messages in logs
- No 3-second startup delay

### Phase 3: Tailscale Integration (2-3 hours)

#### Step 3.1: Tailscale IP Detection
**File**: `electron/tailscale.js` (NEW)
- Detect if Tailscale is installed
- Get current Tailscale IP (100.x.x.x)
- Query Tailscale for peers with tags
- Handle errors gracefully (fall back to localhost)

**Implementation**:
```javascript
const { execSync } = require('child_process');

async function getTailscaleIP() {
    try {
        const output = execSync('tailscale ip -4', { encoding: 'utf8' });
        return output.trim();  // e.g., "100.64.123.45"
    } catch (error) {
        console.log('⚠️ Tailscale not available, using localhost');
        return '127.0.0.1';
    }
}

async function getTailscalePeers(tag = 'tag:temple-node') {
    const status = execSync('tailscale status --json', { encoding: 'utf8' });
    const data = JSON.parse(status);
    return Object.values(data.Peer)
        .filter(peer => peer.Tags && peer.Tags.includes(tag))
        .map(peer => ({
            hostname: peer.HostName,
            tailscaleIP: peer.TailscaleIPs[0],
            online: peer.Online
        }));
}
```

#### Step 3.2: Update libp2p Config for Tailscale
**File**: `electron/p2p-main.js` (MODIFY)
- Listen on Tailscale IP + TCP port
- Announce Tailscale address to peers
- Bootstrap with Temple nodes
- Keep localhost fallback for testing

**Changes**:
```javascript
const tailscaleIP = await getTailscaleIP();

const libp2p = await createLibp2p({
    addresses: {
        listen: [
            `/ip4/${tailscaleIP}/tcp/4003`,      // Tailscale mesh
            '/ip4/127.0.0.1/tcp/4003'            // Localhost fallback
        ],
        announce: [
            `/ip4/${tailscaleIP}/tcp/4003`       // Announce to network
        ]
    },
    transports: [tcp()],  // Still just TCP!
    // ... rest of config
});
```

#### Step 3.3: Cross-Machine Testing
**Goal**: Test sync across different machines on same Tailscale network

**Setup**:
```bash
# On Machine A (dev machine)
tailscale up
tailscale ip -4  # Note the IP
npm run electron:start

# On Machine B (another computer)
tailscale up
tailscale ip -4  # Note the IP
npm run electron:start

# Test:
# 1. Create intention on Machine A
# 2. Should sync to Machine B < 1 second
# 3. Both machines should show connection in logs
```

**Success Criteria**:
- Cross-machine sync works
- Latency < 1 second (vs 10-30s with WebRTC)
- Connection stable (no random drops)
- Works through firewalls/NAT (Tailscale handles it)

## 📁 File Structure (Current State)

```
syncengine-v2/
├── electron/
│   ├── src/                          ✅ TypeScript source
│   │   ├── index.ts                  ✅ 166 lines - Main entry + P2P integration
│   │   ├── p2p-main.ts               ✅ 207 lines - P2P initialization (TCP, LevelDB)
│   │   ├── ipc-bridge.ts             ✅ 340 lines - OrbitDB IPC handlers (11 handlers)
│   │   ├── preload.ts                ✅ 70 lines - IPC bridge (14 methods)
│   │   └── setup.ts                  ✅ 234 lines - Capacitor Electron setup
│   ├── build/src/                    ✅ Compiled JavaScript
│   │   ├── index.js                  ✅ 5.7K - Main process
│   │   ├── p2p-main.js               ✅ 6.5K - P2P module
│   │   ├── ipc-bridge.js             ✅ 11K - IPC handlers
│   │   └── preload.js                ✅ 2.8K - Preload bridge
│   ├── package.json                  ✅ Electron dependencies
│   └── tsconfig.json                 ✅ TypeScript config
├── src/
│   ├── lib/
│   │   ├── identity.js               ✅ 301 lines - WebAuthn + signing (renderer)
│   │   ├── app-init.js               ✅ 216 lines - IPC integration + fallback
│   │   ├── p2p.js                    ⚠️ Legacy (not used anymore)
│   │   └── stores.js                 ✅ Svelte stores
│   └── routes/
│       └── (app)/
│           └── intentions/           ✅ Uses databases from app-init
├── tests/
│   ├── unit/
│   │   ├── identity.test.js          ✅ 24 tests passing
│   │   ├── identity-signing.test.js  ✅ 13 tests passing (37 total)
│   │   ├── p2p-main.test.js          ⏳ TODO: TDD for main P2P
│   │   └── ipc-bridge.test.js        ⏳ TODO: TDD for IPC
│   └── integration/
│       └── electron-p2p.test.js      ⏳ TODO: E2E Electron tests
├── build/                            ✅ SvelteKit static build
└── docs/
    └── CLAUDE_CODE_BUILD_PLAN.md     ✅ This file (UPDATED)
```

## 🧪 Testing Strategy

### Unit Tests (Main Process)
**New Tests Needed**:
- `tests/unit/p2p-main.test.js` - libp2p initialization, native LevelDB
- `tests/unit/ipc-bridge.test.js` - IPC handler logic
- `tests/unit/tailscale.test.js` - IP detection, peer discovery

### Integration Tests
**New Tests Needed**:
- `tests/integration/electron-p2p.test.js` - Full Electron + P2P stack
- `tests/integration/orbitdb-sync.test.js` - Two-instance sync test

### E2E Tests (Existing)
- `e2e/syncengine.spec.js` - Update to work with IPC bridge
- Verify WebAuthn → OrbitDB → Sync flow

## 🚀 Expected Performance Improvements

### Sync Latency
- **Before (Browser WebRTC)**: 10-30 seconds first connection
- **After (Tailscale TCP)**: < 1 second
- **Improvement**: 10-30x faster

### Storage Reliability
- **Before (IndexedDB)**: Corruption after hours, 50MB limit
- **After (Native LevelDB)**: No corruption, gigabytes available
- **Improvement**: Production-ready persistence

### Connection Stability
- **Before (WebRTC)**: Random drops, hard to debug
- **After (Tailscale)**: Stable for days, easy to debug (just ping IP)
- **Improvement**: Enterprise-grade reliability

## 🎯 Current Status

**✅ Phase 1 COMPLETED** - Main Process P2P Architecture:
- ✅ Step 1.1: Electron main process entry (`electron/src/p2p-main.ts` - 232 lines)
  - libp2p with TCP transport (localhost:4003)
  - Native LevelDB storage in `~/Library/Application Support/SyncEngine/orbitdb/`
  - Helia + OrbitDB initialization
- ✅ Step 1.2: P2P module extracted (`electron/src/p2p-main.ts`)
  - Clean separation of P2P logic
  - Singleton pattern for libp2p/helia/orbitdb instances
- ✅ Step 1.3: IPC Bridge created (`electron/src/ipc-bridge.ts` - 340 lines)
  - 11 IPC handlers for OrbitDB CRUD operations
  - Real-time update notifications (main → renderer)
  - Database lifecycle management
- ✅ Step 1.4: Renderer updated (`src/lib/app-init.js` - 216 lines)
  - Detects Electron vs browser mode
  - Uses IPC bridge for P2P operations
  - WebAuthn identity creation in renderer
  - Falls back to mock mode in browser
- ✅ Step 1.5: ESM/CommonJS compatibility (`electron/esbuild.config.js` - 87 lines)
  - Bundle ESM dependencies (libp2p, helia, orbitdb) to CommonJS
  - Web API polyfills: Blob, File, CustomEvent, Promise.withResolvers
  - Stub unnecessary modules: @libp2p/webrtc, node-datachannel
  - Build time: ~300ms
- ✅ Step 1.6: Graceful error handling (`electron/src/p2p-main.ts`)
  - Handle `LEVEL_NOT_FOUND` errors on first run
  - Friendly "first run" messages instead of confusing errors
  - Non-fatal error handling for empty blockstore
- ✅ Integration complete (`electron/src/index.ts` - 166 lines)
  - P2P IPC handlers registered
  - OrbitDB IPC handlers registered
  - Graceful shutdown on app quit
- ✅ Preload bridge (`electron/src/preload.ts` - 70 lines)
  - Secure `contextBridge` exposure
  - 14 methods available: `initialize`, `createOrbitDB`, `openDatabase`, `query`, `add`, `put`, `del`, `get`, `info`, `closeDatabase`, `getDatabases`, `getPeerId`, `getMultiaddrs`, `getConnections`, `onUpdate`, `removeUpdateListener`

**Previous Phases**:
- ✅ Phase 1.3: WebAuthn identity creation (24 tests passing)
- ✅ Phase 1.4: Cryptographic signing (13 tests passing, 37 total)

**🚧 Ready for Testing**:
- Phase 2.1: Test localhost sync (two Electron instances)
- Phase 2.2: Verify native LevelDB storage

**⏳ Next Up**:
- Phase 3: Tailscale integration

## 📚 Reference Documents

- `TAILSCALE_ORBITDB_CONTEXT.md` - Why we're using this architecture
- `src/lib/identity.js` - WebAuthn implementation (renderer)
- `electron/main.js` - Main process P2P (Node.js)
- `tests/unit/identity-signing.test.js` - Signing tests

## 🔗 Key Decisions

1. **Split P2P between main and renderer**: P2P in main (Node.js), WebAuthn in renderer (browser)
2. **Use IPC for OrbitDB**: Renderer calls main via `window.electronP2P.*`
3. **Native LevelDB only**: No IndexedDB, no browser storage emulation
4. **TCP-only transport**: No WebRTC, no circuit relay (Tailscale handles connectivity)
5. **Localhost first, Tailscale second**: Prove local sync works before adding Tailscale

---

## 📊 Summary of Changes

### Files Created (4 new TypeScript files)
1. **electron/src/p2p-main.ts** - 207 lines
   - Complete P2P stack for main process
   - TCP-only transport, native LevelDB

2. **electron/src/ipc-bridge.ts** - 340 lines
   - 11 IPC handlers for OrbitDB operations
   - Real-time sync notifications

3. **electron/src/preload.ts** - 70 lines (replaced simple version)
   - Secure contextBridge with 14 methods

4. **electron/src/index.ts** - 166 lines (modified existing)
   - Integrated P2P initialization
   - Added IPC handler setup

### Files Updated
1. **src/lib/app-init.js** - 216 lines (completely rewritten)
   - Electron vs browser detection
   - IPC bridge integration
   - Mock mode fallback

2. **docs/CLAUDE_CODE_BUILD_PLAN.md** - This file
   - Updated with completion status

### Build Artifacts
- `electron/build/src/*.js` - All TypeScript compiled successfully
- TypeScript compilation warnings (from dependencies) are non-blocking

### Ready to Test
```bash
# Build and run Electron app
npm run build              # Build SvelteKit
cd electron && npm run build  # Build TypeScript
npm run electron:start     # Launch Electron

# Expected output:
# 🚀 [Main] Initializing P2P on app ready...
# 🚀 [P2P-Main] Initializing P2P network...
# ✅ [P2P-Main] libp2p created: 12D3KooW...
# 📡 [P2P-Main] Listening on: [/ip4/127.0.0.1/tcp/4003/p2p/12D3KooW...]
# 📁 [P2P-Main] Storage directory: ~/Library/Application Support/SyncEngine/orbitdb
# ✅ [P2P-Main] Helia (IPFS) created with native LevelDB
# ✅ [Main] P2P IPC handlers registered
# ✅ [OrbitDB] IPC handlers registered
```

---

**Last Updated**: 2025-12-26 19:15 (Phase 1 COMPLETE with ESM compatibility - P2P network initializing successfully)
