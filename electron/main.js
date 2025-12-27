/**
 * Electron Main Process
 * Runs P2P network (libp2p + Helia + OrbitDB) in Node.js environment
 * Communicates with renderer via IPC
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import P2P modules (Node.js environment)
const { createLibp2p } = require('libp2p');
const { tcp } = require('@libp2p/tcp');
const { noise } = require('@chainsafe/libp2p-noise');
const { yamux } = require('@chainsafe/libp2p-yamux');
const { identify } = require('@libp2p/identify');
const { gossipsub } = require('@chainsafe/libp2p-gossipsub');
const { createHelia } = require('helia');
const { createOrbitDB } = require('@orbitdb/core');
const { LevelBlockstore } = require('blockstore-level');
const { LevelDatastore } = require('datastore-level');

// Global P2P instances
let libp2p;
let helia;
let orbitdb;
let mainWindow;

/**
 * Create main browser window
 */
async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load SvelteKit build
    if (process.env.NODE_ENV === 'development') {
        await mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        await mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * Initialize P2P network in main process
 * Uses TCP transport (localhost for Phase 1, Tailscale for Phase 3)
 * Uses native LevelDB for rock-solid persistence
 */
async function initializeP2P() {
    console.log('🚀 [Main] Initializing P2P network...');

    try {
        // Step 1: Create libp2p with TCP transport
        // Phase 1: Localhost only for testing
        // Phase 3: Will add Tailscale IP
        libp2p = await createLibp2p({
            addresses: {
                listen: [
                    '/ip4/127.0.0.1/tcp/4003',  // Localhost for Phase 1
                    '/ip4/127.0.0.1/tcp/0'       // Dynamic port as fallback
                ]
            },
            transports: [
                tcp()  // Simple TCP transport - no WebRTC complexity!
            ],
            connectionEncryption: [noise()],
            streamMuxers: [yamux()],
            services: {
                identify: identify(),
                pubsub: gossipsub({
                    emitSelf: false,  // Critical: prevent self-dial
                    allowPublishToZeroTopicPeers: true
                })
            },
            connectionManager: {
                maxConnections: 20,
                minConnections: 1
            }
        });

        const peerId = libp2p.peerId.toString();
        console.log('✅ [Main] libp2p created:', peerId);
        console.log('📡 [Main] Listening on:', libp2p.getMultiaddrs().map(ma => ma.toString()));

        // Step 2: Create Helia with NATIVE LevelDB storage
        // This uses REAL filesystem, NOT IndexedDB!
        const storageDir = path.join(app.getPath('userData'), 'orbitdb');
        console.log('📁 [Main] Storage directory:', storageDir);

        const blockstore = new LevelBlockstore(path.join(storageDir, 'blocks'));
        const datastore = new LevelDatastore(path.join(storageDir, 'data'));

        helia = await createHelia({
            libp2p,
            blockstore,
            datastore
        });

        console.log('✅ [Main] Helia (IPFS) created with native LevelDB');

        // Step 3: OrbitDB will be created when identity is provided from renderer
        // (Identity uses WebAuthn which only works in renderer/browser context)

        console.log('✅ [Main] P2P network initialized (OrbitDB pending identity)');

        return {
            success: true,
            peerId,
            multiaddrs: libp2p.getMultiaddrs().map(ma => ma.toString()),
            storageDir
        };

    } catch (error) {
        console.error('❌ [Main] P2P initialization failed:', error);
        throw error;
    }
}

/**
 * Create OrbitDB instance with identity from renderer
 * @param {Object} identity - Serialized identity from WebAuthn
 */
async function createOrbitDBWithIdentity(identity) {
    if (!helia) {
        throw new Error('Helia not initialized. Call initializeP2P first.');
    }

    if (orbitdb) {
        console.log('⚠️ [Main] OrbitDB already initialized');
        return { success: true };
    }

    try {
        console.log('🗄️ [Main] Creating OrbitDB with identity:', identity.id);

        orbitdb = await createOrbitDB({
            ipfs: helia,
            identity,
            directory: path.join(app.getPath('userData'), 'orbitdb', 'orbitdb')
        });

        console.log('✅ [Main] OrbitDB created');
        return { success: true };

    } catch (error) {
        console.error('❌ [Main] OrbitDB creation failed:', error);
        throw error;
    }
}

/**
 * Shutdown P2P gracefully
 */
async function shutdownP2P() {
    console.log('👋 [Main] Shutting down P2P network...');

    try {
        if (orbitdb) {
            await orbitdb.stop();
            console.log('✅ [Main] OrbitDB stopped');
        }

        if (helia) {
            await helia.stop();
            console.log('✅ [Main] Helia stopped');
        }

        if (libp2p) {
            await libp2p.stop();
            console.log('✅ [Main] libp2p stopped');
        }

        console.log('✅ [Main] P2P network shutdown complete');
    } catch (error) {
        console.error('❌ [Main] Shutdown error:', error);
    }
}

/**
 * Set up IPC handlers for renderer communication
 * Basic structure - will be expanded in Phase 1.3 (IPC Bridge)
 */
function setupIPC() {
    // Initialize P2P network
    ipcMain.handle('p2p:initialize', async () => {
        try {
            if (!helia) {
                return await initializeP2P();
            }
            return {
                success: true,
                peerId: libp2p.peerId.toString(),
                multiaddrs: libp2p.getMultiaddrs().map(ma => ma.toString())
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Create OrbitDB with identity from renderer
    ipcMain.handle('p2p:createOrbitDB', async (event, identity) => {
        try {
            return await createOrbitDBWithIdentity(identity);
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Get peer ID
    ipcMain.handle('p2p:getPeerId', () => {
        return libp2p ? libp2p.peerId.toString() : null;
    });

    // Get multiaddrs
    ipcMain.handle('p2p:getMultiaddrs', () => {
        return libp2p ? libp2p.getMultiaddrs().map(ma => ma.toString()) : [];
    });

    // Get connection count
    ipcMain.handle('p2p:getConnections', () => {
        if (!libp2p) return [];
        return libp2p.getConnections().map(conn => ({
            remotePeer: conn.remotePeer.toString(),
            remoteAddr: conn.remoteAddr.toString(),
            status: conn.status
        }));
    });

    console.log('✅ [Main] IPC handlers registered');
}

/**
 * App lifecycle management
 */
app.whenReady().then(async () => {
    console.log('🚀 [Main] Electron app ready');
    console.log('📁 [Main] User data path:', app.getPath('userData'));

    setupIPC();

    // Initialize P2P before creating window
    try {
        await initializeP2P();
    } catch (error) {
        console.error('⚠️ [Main] Failed to initialize P2P on startup:', error);
        // Continue anyway - renderer can retry initialization
    }

    await createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', async (event) => {
    if (helia || libp2p || orbitdb) {
        event.preventDefault();
        await shutdownP2P();
        app.exit(0);
    }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ [Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [Main] Unhandled rejection at:', promise, 'reason:', reason);
});
