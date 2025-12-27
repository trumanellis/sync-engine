/**
 * Electron Preload Script
 * Exposes secure IPC bridge to renderer process
 * Allows SvelteKit app to communicate with main process P2P network
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose P2P API to renderer via window.electronP2P
 * Uses contextBridge for security (no direct Node.js access in renderer)
 */
contextBridge.exposeInMainWorld('electronP2P', {
    /**
     * Initialize P2P network in main process
     * @returns {Promise<{success: boolean, peerId: string, multiaddrs: string[]}>}
     */
    initialize: () => ipcRenderer.invoke('p2p:initialize'),

    /**
     * Create OrbitDB instance with WebAuthn identity
     * @param {Object} identity - Serialized identity from renderer
     * @returns {Promise<{success: boolean}>}
     */
    createOrbitDB: (identity) => ipcRenderer.invoke('p2p:createOrbitDB', identity),

    /**
     * Get libp2p peer ID
     * @returns {Promise<string|null>}
     */
    getPeerId: () => ipcRenderer.invoke('p2p:getPeerId'),

    /**
     * Get libp2p multiaddrs
     * @returns {Promise<string[]>}
     */
    getMultiaddrs: () => ipcRenderer.invoke('p2p:getMultiaddrs'),

    /**
     * Get current P2P connections
     * @returns {Promise<Array<{remotePeer: string, remoteAddr: string, status: string}>>}
     */
    getConnections: () => ipcRenderer.invoke('p2p:getConnections'),

    // TODO: Phase 1.3 - Add OrbitDB operation handlers
    // openDatabase: (name, options) => ipcRenderer.invoke('orbitdb:open', name, options),
    // closeDatabase: (address) => ipcRenderer.invoke('orbitdb:close', address),
    // getDatabases: () => ipcRenderer.invoke('orbitdb:getDatabases'),
    // query: (address, query) => ipcRenderer.invoke('orbitdb:query', address, query),
    // add: (address, doc) => ipcRenderer.invoke('orbitdb:add', address, doc),
    // put: (address, doc) => ipcRenderer.invoke('orbitdb:put', address, doc),
    // del: (address, key) => ipcRenderer.invoke('orbitdb:del', address, key),
    // onUpdate: (callback) => ipcRenderer.on('orbitdb:update', callback),
    // removeUpdateListener: (callback) => ipcRenderer.removeListener('orbitdb:update', callback),
});

console.log('✅ [Preload] IPC bridge exposed to renderer');
