import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getWebAuthnCredential, setupDevice, createOrbitDBIdentity } from '../../src/lib/identity.js';

describe('Identity Management', () => {
    let mockCredentialsCreate;
    let mockCredentialsGet;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();

        // Mock navigator.credentials for setupDevice tests
        mockCredentialsCreate = vi.fn();
        mockCredentialsGet = vi.fn();
        vi.stubGlobal('navigator', {
            credentials: {
                create: mockCredentialsCreate,
                get: mockCredentialsGet
            }
        });
    });

    describe('getWebAuthnCredential', () => {
        it('should return null when no credential exists', () => {
            // Arrange & Act
            const credential = getWebAuthnCredential('test-user');

            // Assert
            expect(credential).toBeNull();
        });

        it('should return stored credential when it exists', () => {
            // Arrange
            const mockCredential = {
                id: 'test-credential-123',
                publicKey: new Uint8Array([1, 2, 3]),
                userName: 'Test User'
            };
            localStorage.setItem('webauthn-credential-test-user', JSON.stringify(mockCredential));

            // Act
            const credential = getWebAuthnCredential('test-user');

            // Assert
            expect(credential).toBeTruthy();
            expect(credential.id).toBe('test-credential-123');
        });
    });

    describe('setupDevice', () => {
        it('should create and store a new credential', async () => {
            // Arrange
            const userName = 'Test User';
            const mockPublicKeyCredential = {
                id: 'test-credential-id',
                rawId: new ArrayBuffer(32),
                response: {
                    attestationObject: new ArrayBuffer(64),
                    clientDataJSON: new ArrayBuffer(128),
                    getPublicKey: () => new ArrayBuffer(65)
                },
                type: 'public-key'
            };
            mockCredentialsCreate.mockResolvedValue(mockPublicKeyCredential);

            // Act
            const result = await setupDevice(userName);

            // Assert
            expect(result).toBeTruthy();
            expect(result.credential).toBeTruthy();
            expect(result.identity).toBeTruthy();
            expect(result.credential.userName).toBe(userName);

            // Verify credential was stored
            const stored = getWebAuthnCredential('current-user');
            expect(stored).toBeTruthy();
        });

        it('should create an identity with a DID', async () => {
            // Arrange
            const userName = 'Test User';
            const mockPublicKeyCredential = {
                id: 'test-credential-id',
                rawId: new ArrayBuffer(32),
                response: {
                    attestationObject: new ArrayBuffer(64),
                    clientDataJSON: new ArrayBuffer(128),
                    getPublicKey: () => new ArrayBuffer(65)
                },
                type: 'public-key'
            };
            mockCredentialsCreate.mockResolvedValue(mockPublicKeyCredential);

            // Act
            const result = await setupDevice(userName);

            // Assert
            expect(result.identity.id).toMatch(/^did:key:z/);
        });
    });

    describe('createOrbitDBIdentity', () => {
        it('should create identity from credential', async () => {
            // Arrange
            const mockCredential = {
                id: 'test-credential-123',
                publicKey: new Uint8Array([1, 2, 3]),
                userName: 'Test User'
            };

            // Act
            const identity = await createOrbitDBIdentity(mockCredential);

            // Assert
            expect(identity).toBeTruthy();
            expect(identity.id).toMatch(/^did:key:z/);
            expect(identity.publicKey).toBe(mockCredential.publicKey);
            expect(typeof identity.sign).toBe('function');
            expect(typeof identity.verify).toBe('function');
        });

        it('should have working sign function', async () => {
            // Arrange
            const mockCredential = {
                id: 'test-credential-123',
                rawId: new Uint8Array([1, 2, 3, 4, 5]),
                publicKey: new Uint8Array([1, 2, 3])
            };
            const identity = await createOrbitDBIdentity(mockCredential);
            const testData = new Uint8Array([4, 5, 6]);

            // Mock WebAuthn assertion (using credentials.get for signing)
            const mockSignature = new Uint8Array([10, 20, 30]);
            mockCredentialsGet.mockResolvedValue({
                response: { signature: mockSignature }
            });

            // Mock crypto.subtle
            vi.stubGlobal('crypto', {
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
                },
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                    return arr;
                }
            });

            // Act
            const signature = await identity.sign(testData);

            // Assert
            expect(signature).toBeInstanceOf(Uint8Array);
            expect(signature.length).toBeGreaterThan(0);
        });
    });
});
