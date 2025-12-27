import { setupDevice, getWebAuthnCredential, createOrbitDBIdentity } from './identity.js';
import { p2pStatus, peerId, orbitdbReady, userIdentity, intentions } from './stores.js';

let p2pInstance = null;
let databases = {};
let intentionsDbAddress = null;
let updateListener = null;

/**
 * Check if running in Electron with P2P IPC bridge
 */
function isElectron() {
    return typeof window !== 'undefined' && window.electronP2P;
}

/**
 * Serialize identity for IPC (remove functions)
 * @param {Object} identity - OrbitDB identity with sign/verify functions
 * @returns {Object} Serializable identity
 */
function serializeIdentity(identity) {
    return {
        id: identity.id,
        publicKey: Array.from(identity.publicKey), // Convert Uint8Array to Array
        type: identity.type,
        // Note: sign/verify functions can't be serialized
        // Main process will handle signing with WebAuthn via a different mechanism
    };
}

/**
 * Initialize the app - call once on startup
 * Phase 1.4: Uses IPC bridge to communicate with Electron main process
 * Falls back to mock mode if not in Electron
 * @returns {Promise<Object>} P2P instance and databases
 */
export async function initializeApp() {
    try {
        p2pStatus.set('connecting');
        const mode = isElectron() ? 'Electron IPC' : 'Mock';
        console.log(`🚀 Initializing SyncEngine V2 (${mode} Mode)...`);

        // Step 1: Create WebAuthn identity (always in renderer)
        let credential = getWebAuthnCredential('current-user');
        let identity;

        if (!credential) {
            console.log('🆕 First-time setup - creating device identity...');
            const setup = await setupDevice('SyncEngine User');
            credential = setup.credential;
            identity = setup.identity;
        } else {
            console.log('✅ Existing identity found');
            identity = await createOrbitDBIdentity(credential);
        }

        userIdentity.set(identity);

        if (isElectron()) {
            // ==================== ELECTRON MODE ====================
            // Use IPC bridge to communicate with main process

            // Step 2: Initialize P2P network in main process
            console.log('📡 Initializing P2P network in main process...');
            const p2pResult = await window.electronP2P.initialize();

            if (!p2pResult.success) {
                throw new Error(`P2P initialization failed: ${p2pResult.error}`);
            }

            console.log('✅ P2P initialized:', p2pResult.peerId);
            console.log('📡 Listening on:', p2pResult.multiaddrs);
            peerId.set(p2pResult.peerId);
            p2pStatus.set('connected');

            // Step 3: Create OrbitDB with identity
            console.log('🗄️ Creating OrbitDB with identity...');
            const orbitdbResult = await window.electronP2P.createOrbitDB(serializeIdentity(identity));

            if (!orbitdbResult.success) {
                throw new Error(`OrbitDB creation failed: ${orbitdbResult.error}`);
            }

            console.log('✅ OrbitDB created');

            // Step 4: Open intentions database
            console.log('📂 Opening intentions database...');
            const dbResult = await window.electronP2P.openDatabase('intentions', {
                type: 'documents',
                create: true
            });

            if (!dbResult.success) {
                throw new Error(`Database open failed: ${dbResult.error}`);
            }

            intentionsDbAddress = dbResult.address;
            console.log('✅ Intentions database opened:', intentionsDbAddress);

            // Step 5: Create database proxy for IPC calls
            databases.intentions = {
                address: intentionsDbAddress,

                async put(intention) {
                    const result = await window.electronP2P.add(intentionsDbAddress, intention);
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    // Store will be updated by real-time listener
                    return result.hash;
                },

                async all() {
                    const result = await window.electronP2P.query(intentionsDbAddress);
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    return result.documents || [];
                },

                async get(id) {
                    const result = await window.electronP2P.get(intentionsDbAddress, id);
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    return result.document;
                },

                async del(id) {
                    const result = await window.electronP2P.del(intentionsDbAddress, id);
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    return result.hash;
                }
            };

            // Step 6: Set up real-time update listener
            updateListener = window.electronP2P.onUpdate(async (data) => {
                console.log('🔄 Database update received:', data);
                if (data.address === intentionsDbAddress) {
                    // Reload intentions from database
                    const allIntentions = await databases.intentions.all();
                    intentions.set(allIntentions);
                }
            });

            // Step 7: Load initial data
            const allIntentions = await databases.intentions.all();
            intentions.set(allIntentions);

            orbitdbReady.set(true);
            console.log('✅ App initialized successfully (Electron Mode)');
            console.log('🔗 P2P network active, native LevelDB storage');

        } else {
            // ==================== MOCK MODE (Browser) ====================
            console.log('⚠️  Running in browser - using mock mode');
            console.log('ℹ️  For full P2P, run: npm run electron:start');

            const mockPeerId = `mock-peer-${Date.now()}`;
            peerId.set(mockPeerId);
            p2pStatus.set('connected');

            databases.intentions = {
                mockData: [],
                async put(intention) {
                    this.mockData.push(intention);
                    intentions.set([...this.mockData]);
                },
                async all() {
                    return this.mockData;
                }
            };

            intentions.set([]);
            orbitdbReady.set(true);
            console.log('✅ App initialized successfully (Mock Mode)');
        }

        return { p2pInstance, databases };

    } catch (error) {
        console.error('❌ App initialization failed:', error);
        p2pStatus.set('disconnected');
        orbitdbReady.set(false);
        throw error;
    }
}

/**
 * Cleanup on app close
 */
export async function shutdownApp() {
    if (isElectron()) {
        // Remove update listener
        if (updateListener) {
            window.electronP2P.removeUpdateListener(updateListener);
            updateListener = null;
        }

        // Close databases (main process handles shutdown)
        if (intentionsDbAddress) {
            await window.electronP2P.closeDatabase(intentionsDbAddress);
            intentionsDbAddress = null;
        }

        console.log('✅ App shutdown complete');
    }
}

/**
 * Get databases (must call after initializeApp)
 * @returns {Object} Databases object
 */
export function getDatabases() {
    return databases;
}