/**
 * WebAuthn Identity Provider - Phase 1.3
 * Device-specific authentication using biometrics
 * Generates did:key DIDs from WebAuthn credentials
 */

// Import multibase for DID encoding
import { base58btc } from 'multiformats/bases/base58';

/**
 * Utility: Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Utility: Convert base64 to Uint8Array
 */
function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Generate DID from public key
 * Format: did:key:z<multibase-encoded-key>
 */
function generateDID(publicKeyBytes) {
    // Use base58btc encoding (z prefix)
    const encoded = base58btc.encode(publicKeyBytes);
    return `did:key:${encoded}`;
}

/**
 * Store/retrieve WebAuthn credential from localStorage
 */
export function getWebAuthnCredential(key = 'current-user') {
    try {
        const stored = localStorage.getItem(`webauthn-credential-${key}`);
        if (!stored) return null;

        const parsed = JSON.parse(stored);

        // Convert base64 back to Uint8Array for publicKey
        if (parsed.publicKey && typeof parsed.publicKey === 'string') {
            parsed.publicKey = base64ToUint8Array(parsed.publicKey);
        }

        return parsed;
    } catch (error) {
        console.error('Error reading credential:', error);
        throw error;
    }
}

/**
 * Save WebAuthn credential to localStorage
 */
function saveWebAuthnCredential(credential, key = 'current-user') {
    // Serialize ArrayBuffers to base64 for storage
    const serialized = {
        ...credential,
        publicKey: typeof credential.publicKey === 'string'
            ? credential.publicKey
            : arrayBufferToBase64(credential.publicKey)
    };

    localStorage.setItem(`webauthn-credential-${key}`, JSON.stringify(serialized));
}

/**
 * Setup device identity with WebAuthn
 * @param {string} userName - Display name for the credential
 * @returns {Promise<{credential: Object, identity: Object}>}
 */
export async function setupDevice(userName) {
    console.log('🔐 Setting up device identity for:', userName);

    // Check if WebAuthn is available
    if (!navigator.credentials || !navigator.credentials.create) {
        throw new Error('WebAuthn not supported');
    }

    // Generate random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Get RP ID (domain)
    const rpId = window.location.hostname === 'localhost'
        ? 'localhost'
        : window.location.hostname;

    // Generate random user ID
    const userId = new Uint8Array(32);
    crypto.getRandomValues(userId);

    // Create WebAuthn credential
    const publicKeyOptions = {
        challenge,
        rp: {
            name: 'SyncEngine',
            id: rpId
        },
        user: {
            id: userId,
            name: userName,
            displayName: userName
        },
        pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256 (ECDSA w/ SHA-256)
            { type: 'public-key', alg: -257 } // RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'platform', // Platform authenticator (Touch ID, Face ID, Windows Hello)
            userVerification: 'required',
            requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
    };

    let publicKeyCredential;
    try {
        publicKeyCredential = await navigator.credentials.create({
            publicKey: publicKeyOptions
        });
    } catch (error) {
        console.error('WebAuthn creation failed:', error);
        throw error;
    }

    if (!publicKeyCredential) {
        throw new Error('Failed to create credential');
    }

    // Extract public key from attestation response
    // Note: This is a simplified extraction - in production you'd parse the attestation object
    const publicKey = publicKeyCredential.response.getPublicKey
        ? publicKeyCredential.response.getPublicKey()
        : publicKeyCredential.rawId; // Fallback to rawId

    // Create credential object
    const credential = {
        id: publicKeyCredential.id,
        rawId: arrayBufferToBase64(publicKeyCredential.rawId),
        publicKey: publicKey,
        userName,
        createdAt: Date.now(),
        type: publicKeyCredential.type
    };

    // Save to localStorage
    saveWebAuthnCredential(credential);

    // Create OrbitDB identity
    const identity = await createOrbitDBIdentity(credential);

    console.log('✅ Device setup complete. DID:', identity.id);

    return { credential, identity };
}

/**
 * Hash data using SHA-256
 * @param {Uint8Array} data - Data to hash
 * @returns {Promise<Uint8Array>} Hash digest
 */
async function hashData(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
}

/**
 * Sign data using WebAuthn assertion
 * @param {Object} credential - WebAuthn credential
 * @param {Uint8Array} data - Data to sign
 * @returns {Promise<Uint8Array>} Signature
 */
async function signWithWebAuthn(credential, data) {
    // Check if WebAuthn is available
    if (!navigator.credentials || !navigator.credentials.get) {
        throw new Error('WebAuthn not supported');
    }

    // Hash the data to use as challenge (WebAuthn challenge must be hashed)
    const challenge = await hashData(data);

    // Get RP ID (domain)
    const rpId = window.location.hostname === 'localhost'
        ? 'localhost'
        : window.location.hostname;

    // Convert rawId to proper format for WebAuthn
    const credentialId = typeof credential.rawId === 'string'
        ? base64ToUint8Array(credential.rawId)
        : credential.rawId;

    // Request WebAuthn assertion (user authentication)
    const assertion = await navigator.credentials.get({
        publicKey: {
            challenge,
            rpId,
            allowCredentials: [{
                id: credentialId,
                type: 'public-key'
            }],
            userVerification: 'required',
            timeout: 60000
        }
    });

    // Extract signature from assertion response
    const signature = new Uint8Array(assertion.response.signature);
    return signature;
}

/**
 * Verify signature using Web Crypto API
 * @param {Uint8Array} signature - Signature to verify
 * @param {Uint8Array} data - Original data
 * @param {Uint8Array} publicKeyBytes - Public key
 * @returns {Promise<boolean>} Verification result
 */
async function verifyWithWebCrypto(signature, data, publicKeyBytes) {
    try {
        // Import public key for verification
        // Note: This is a simplified implementation
        // Real implementation would need proper key format handling
        const publicKey = await crypto.subtle.importKey(
            'raw',
            publicKeyBytes,
            {
                name: 'ECDSA',
                namedCurve: 'P-256'
            },
            false,
            ['verify']
        );

        // Hash the data
        const dataHash = await hashData(data);

        // Verify signature
        const isValid = await crypto.subtle.verify(
            {
                name: 'ECDSA',
                hash: { name: 'SHA-256' }
            },
            publicKey,
            signature,
            dataHash
        );

        return isValid;
    } catch (error) {
        console.error('Verification error:', error);
        return false; // Return false on error instead of throwing
    }
}

/**
 * Create OrbitDB identity from WebAuthn credential
 * @param {Object} credential - WebAuthn credential
 * @returns {Promise<Object>} OrbitDB identity
 */
export async function createOrbitDBIdentity(credential) {
    console.log('🆔 Creating OrbitDB identity from credential');

    // Generate DID from public key
    const publicKeyBytes = credential.publicKey instanceof Uint8Array
        ? credential.publicKey
        : new Uint8Array(credential.publicKey);

    const did = generateDID(publicKeyBytes);

    // Create identity object compatible with OrbitDB
    return {
        id: did,
        publicKey: publicKeyBytes,
        type: 'webauthn',
        credential: credential, // Store credential for signing
        sign: async (data) => {
            // Phase 1.4: Real signing with WebAuthn assertions
            console.log('🔏 Signing data with WebAuthn...');
            const dataBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            return await signWithWebAuthn(credential, dataBytes);
        },
        verify: async (signature, data, publicKey) => {
            // Phase 1.4: Real verification with Web Crypto API
            const dataBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            const signatureBytes = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
            const publicKeyBytes = publicKey instanceof Uint8Array ? publicKey : new Uint8Array(publicKey);
            return await verifyWithWebCrypto(signatureBytes, dataBytes, publicKeyBytes);
        }
    };
}
