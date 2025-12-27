require('./rt/electron-rt');

//////////////////////////////
// User Defined Preload scripts below
console.log('User Preload!');

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose P2P API to renderer via window.electronP2P
 * Uses contextBridge for security (no direct Node.js access in renderer)
 */
contextBridge.exposeInMainWorld('electronP2P', {
  /**
   * Initialize P2P network in main process
   * @returns {Promise<{success: boolean, peerId?: string, multiaddrs?: string[], storageDir?: string, error?: string}>}
   */
  initialize: () => ipcRenderer.invoke('p2p:initialize'),

  /**
   * Create OrbitDB instance with WebAuthn identity
   * @param {Object} identity - Serialized identity from renderer
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  createOrbitDB: (identity: any) => ipcRenderer.invoke('p2p:createOrbitDB', identity),

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

  /**
   * Manually dial a peer by multiaddr
   * @param {string} multiaddr - Full multiaddr of peer to connect to
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  dialPeer: (multiaddr: string) => ipcRenderer.invoke('p2p:dialPeer', multiaddr),

  // OrbitDB database operations
  openDatabase: (name: string, options?: any) => ipcRenderer.invoke('orbitdb:open', name, options),
  closeDatabase: (address: string) => ipcRenderer.invoke('orbitdb:close', address),
  getDatabases: () => ipcRenderer.invoke('orbitdb:getDatabases'),

  // OrbitDB query and CRUD operations
  query: (address: string, filterFn?: string) => ipcRenderer.invoke('orbitdb:query', address, filterFn),
  get: (address: string, id: string) => ipcRenderer.invoke('orbitdb:get', address, id),
  add: (address: string, doc: any) => ipcRenderer.invoke('orbitdb:add', address, doc),
  put: (address: string, doc: any) => ipcRenderer.invoke('orbitdb:put', address, doc),
  del: (address: string, key: string) => ipcRenderer.invoke('orbitdb:del', address, key),
  info: (address: string) => ipcRenderer.invoke('orbitdb:info', address),

  // Real-time update listener
  onUpdate: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('orbitdb:update', listener);
    return listener; // Return for cleanup
  },
  removeUpdateListener: (listener: any) => {
    ipcRenderer.removeListener('orbitdb:update', listener);
  },
});

console.log('✅ [Preload] IPC bridge exposed to renderer');
