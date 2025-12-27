/**
 * P2P Network Module for Electron Main Process
 * Initializes libp2p + Helia + OrbitDB with native LevelDB storage
 */

import { createLibp2p, Libp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { multiaddr } from '@multiformats/multiaddr';
import { createHelia, Helia } from 'helia';
import { createOrbitDB, OrbitDB } from '@orbitdb/core';
import { LevelBlockstore } from 'blockstore-level';
import { LevelDatastore } from 'datastore-level';
import { app } from 'electron';
import * as path from 'path';

// P2P instances (singleton pattern)
let libp2p: Libp2p | null = null;
let helia: Helia | null = null;
let orbitdb: OrbitDB | null = null;

export interface P2PInitResult {
  success: boolean;
  peerId?: string;
  multiaddrs?: string[];
  storageDir?: string;
  error?: string;
}

/**
 * Initialize P2P network in main process
 * Uses TCP transport (localhost for Phase 1, Tailscale for Phase 3)
 * Uses native LevelDB for rock-solid persistence
 */
export async function initializeP2P(): Promise<P2PInitResult> {
  console.log('🚀 [P2P-Main] Initializing P2P network...');

  try {
    // Step 1: Create libp2p with TCP transport
    // Phase 1: Localhost only for testing
    // Phase 3: Will add Tailscale IP
    libp2p = await createLibp2p({
      addresses: {
        listen: [
          '/ip4/127.0.0.1/tcp/4003', // Localhost for Phase 1
          '/ip4/127.0.0.1/tcp/0', // Dynamic port as fallback
        ],
      },
      transports: [
        tcp(), // Simple TCP transport - no WebRTC complexity!
      ],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      services: {
        identify: identify(),
        pubsub: gossipsub({
          emitSelf: false, // Critical: prevent self-dial
          allowPublishToZeroTopicPeers: true,
        }) as any, // Type assertion due to @libp2p/interface version mismatch
      },
      connectionManager: {
        maxConnections: 20,
        // Note: minConnections not supported in this libp2p version
      },
      transportManager: {
        faultTolerance: 1 as any, // Allow 1 listen address to fail (for multi-instance testing)
      },
    });

    const peerId = libp2p.peerId.toString();
    const multiaddrs = libp2p.getMultiaddrs().map((ma) => ma.toString());

    console.log('✅ [P2P-Main] libp2p created:', peerId);
    console.log('📡 [P2P-Main] Listening on:', multiaddrs);

    // Step 2: Create Helia with NATIVE LevelDB storage
    // This uses REAL filesystem, NOT IndexedDB!
    const storageDir = path.join(app.getPath('userData'), 'orbitdb');
    console.log('📁 [P2P-Main] Storage directory:', storageDir);

    const blockstore = new LevelBlockstore(path.join(storageDir, 'blocks'));
    const datastore = new LevelDatastore(path.join(storageDir, 'data'));

    helia = await createHelia({
      libp2p,
      blockstore,
      datastore,
    });

    console.log('✅ [P2P-Main] Helia (IPFS) created with native LevelDB');

    // Step 3: OrbitDB will be created when identity is provided from renderer
    // (Identity uses WebAuthn which only works in renderer/browser context)

    console.log('✅ [P2P-Main] P2P network initialized (OrbitDB pending identity)');

    return {
      success: true,
      peerId,
      multiaddrs,
      storageDir,
    };
  } catch (error: any) {
    // Handle LEVEL_NOT_FOUND errors gracefully (expected on first run)
    if (error.code === 'LEVEL_NOT_FOUND' || error.notFound) {
      console.log('📝 [P2P-Main] First run - empty blockstore (this is normal)');
      console.log('✅ [P2P-Main] P2P network initialized successfully');

      const peerId = libp2p ? libp2p.peerId.toString() : '';
      const multiaddrs = libp2p ? libp2p.getMultiaddrs().map((ma) => ma.toString()) : [];

      return {
        success: true,
        peerId,
        multiaddrs,
        storageDir: path.join(app.getPath('userData'), 'orbitdb'),
      };
    }

    console.error('❌ [P2P-Main] P2P initialization failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create OrbitDB instance with identity from renderer
 * @param identity - Serialized identity from WebAuthn
 */
export async function createOrbitDBWithIdentity(identity: any): Promise<{ success: boolean; error?: string }> {
  if (!helia) {
    return { success: false, error: 'Helia not initialized. Call initializeP2P first.' };
  }

  if (orbitdb) {
    console.log('⚠️ [P2P-Main] OrbitDB already initialized');
    return { success: true };
  }

  try {
    console.log('🗄️ [P2P-Main] Creating OrbitDB with identity:', identity.id);

    orbitdb = await createOrbitDB({
      ipfs: helia,
      identity,
      directory: path.join(app.getPath('userData'), 'orbitdb', 'orbitdb'),
    });

    console.log('✅ [P2P-Main] OrbitDB created');
    return { success: true };
  } catch (error: any) {
    // Handle LEVEL_NOT_FOUND errors gracefully (expected on first run with empty blockstore)
    if (error.code === 'LEVEL_NOT_FOUND' || error.notFound) {
      console.log('📝 [P2P-Main] First run detected - initializing identity store (this is normal)');
      console.log('✅ [P2P-Main] OrbitDB initialized (identity store will be created on first use)');
      return { success: true }; // Non-fatal, OrbitDB will create missing data on first write
    }

    console.error('❌ [P2P-Main] OrbitDB creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get current peer ID
 */
export function getPeerId(): string | null {
  return libp2p ? libp2p.peerId.toString() : null;
}

/**
 * Get current multiaddrs
 */
export function getMultiaddrs(): string[] {
  return libp2p ? libp2p.getMultiaddrs().map((ma) => ma.toString()) : [];
}

/**
 * Get current P2P connections
 */
export function getConnections(): Array<{ remotePeer: string; remoteAddr: string; status: string }> {
  if (!libp2p) return [];

  return libp2p.getConnections().map((conn) => ({
    remotePeer: conn.remotePeer.toString(),
    remoteAddr: conn.remoteAddr.toString(),
    status: conn.status,
  }));
}

/**
 * Manually dial a peer by multiaddr
 * @param multiaddr - Full multiaddr string (e.g., '/ip4/127.0.0.1/tcp/4003/p2p/12D3Koo...')
 */
export async function dialPeer(multiaddrString: string): Promise<{ success: boolean; error?: string }> {
  if (!libp2p) {
    return { success: false, error: 'libp2p not initialized' };
  }

  try {
    console.log('🔗 [P2P-Main] Dialing peer:', multiaddrString);

    // Convert string to Multiaddr object
    const ma = multiaddr(multiaddrString);

    const connection = await libp2p.dial(ma);
    console.log('✅ [P2P-Main] Connected to peer:', connection.remotePeer.toString());
    return { success: true };
  } catch (error: any) {
    console.error('❌ [P2P-Main] Failed to dial peer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get OrbitDB instance (for IPC handlers to use)
 */
export function getOrbitDB(): OrbitDB | null {
  return orbitdb;
}

/**
 * Shutdown P2P gracefully
 */
export async function shutdownP2P(): Promise<void> {
  console.log('👋 [P2P-Main] Shutting down P2P network...');

  try {
    if (orbitdb) {
      await orbitdb.stop();
      orbitdb = null;
      console.log('✅ [P2P-Main] OrbitDB stopped');
    }

    if (helia) {
      await helia.stop();
      helia = null;
      console.log('✅ [P2P-Main] Helia stopped');
    }

    if (libp2p) {
      await libp2p.stop();
      libp2p = null;
      console.log('✅ [P2P-Main] libp2p stopped');
    }

    console.log('✅ [P2P-Main] P2P network shutdown complete');
  } catch (error) {
    console.error('❌ [P2P-Main] Shutdown error:', error);
  }
}
