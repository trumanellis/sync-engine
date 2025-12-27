/**
 * P2P Network Initialization
 * Based on simple-todo reference implementation
 * Uses: libp2p + Helia + OrbitDB with native Level storage
 */

import { createLibp2p } from 'libp2p';
import { createHelia } from 'helia';
import { createOrbitDB } from '@orbitdb/core';
import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { all } from '@libp2p/websockets/filters';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { LevelBlockstore } from 'blockstore-level';
import { LevelDatastore } from 'datastore-level';

/**
 * Create libp2p node with multi-transport support
 * Pattern from simple-todo: WebRTC + WebSockets + Circuit Relay
 */
async function createLibp2pNode() {
    return await createLibp2p({
        addresses: {
            listen: [
                '/p2p-circuit',  // Essential for relay connections
                '/webrtc'        // WebRTC for direct connections
            ]
        },
        transports: [
            webSockets({
                filter: all
            }),
            webRTC({
                rtcConfiguration: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            }),
            circuitRelayTransport({
                discoverRelays: 2,
                maxReservations: 2
            })
        ],
        connectionEncryption: [noise()],
        streamMuxers: [yamux()],
        services: {
            identify: identify(),
            pubsub: gossipsub({
                emitSelf: false,  // Critical: prevent "Cannot dial self" errors
                allowPublishToZeroTopicPeers: true
            })
        },
        connectionManager: {
            maxConnections: 20,
            minConnections: 1
        }
    });
}

/**
 * Initialize P2P network and OrbitDB
 * @param {Object} options
 * @param {string} options.directory - Storage directory
 * @param {Object} options.identity - OrbitDB identity
 */
export async function initializeP2P(options = {}) {
    const { directory = './orbitdb', identity } = options;

    console.log('🚀 Initializing P2P network...');

    // Step 1: Create libp2p node
    const libp2p = await createLibp2pNode();
    console.log('✅ libp2p created:', libp2p.peerId.toString());

    // Step 2: Create Helia (IPFS) with Level storage
    // Pattern from simple-todo: Use LevelBlockstore and LevelDatastore
    const blockstore = new LevelBlockstore(`${directory}/blocks`);
    const datastore = new LevelDatastore(`${directory}/data`);

    const helia = await createHelia({
        libp2p,
        blockstore,
        datastore
    });
    console.log('✅ Helia (IPFS) created');

    // Step 3: Create OrbitDB instance
    const orbitdb = await createOrbitDB({
        ipfs: helia,
        identity,
        directory: `${directory}/orbitdb`
    });
    console.log('✅ OrbitDB created');

    return {
        libp2p,
        helia,
        orbitdb
    };
}

/**
 * Open or create a database
 * Pattern from liftoff: Different types for different use cases
 */
export async function openDatabase(orbitdb, name, options = {}) {
    const { type = 'documents', create = true, ...rest } = options;

    const db = await orbitdb.open(name, {
        type,
        create,
        ...rest
    });

    console.log(`📂 Database opened: ${db.address}`);
    return db;
}

/**
 * Close P2P network gracefully
 */
export async function closeP2P({ libp2p, helia, orbitdb }) {
    console.log('👋 Closing P2P network...');

    if (orbitdb) {
        await orbitdb.stop();
    }

    if (helia) {
        await helia.stop();
    }

    if (libp2p) {
        await libp2p.stop();
    }

    console.log('✅ P2P network closed');
}
