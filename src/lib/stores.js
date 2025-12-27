import { writable } from 'svelte/store';

// P2P network state
export const p2pStatus = writable('disconnected');
export const peerId = writable(null);

// OrbitDB state
export const orbitdbReady = writable(false);

// Current user identity
export const userIdentity = writable(null);

// Intentions store
export const intentions = writable([]);