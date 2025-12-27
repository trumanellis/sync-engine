import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDevice, getWebAuthnCredential, createOrbitDBIdentity } from '../../src/lib/identity.js';

/**
 * Integration tests for WebAuthn flow
 * Following CLAUDE.md TDD principles - these tests should FAIL initially
 */
describe('WebAuthn Integration Flow', () => {
    let mockCredentialsCreate;
    let mockCredentialsGet;

    beforeEach(() => {
        localStorage.clear();

        // Create mock functions
        mockCredentialsCreate = vi.fn();
        mockCredentialsGet = vi.fn();

        // Mock navigator using vitest's stubGlobal
        vi.stubGlobal('navigator', {
            credentials: {
                create: mockCredentialsCreate,
                get: mockCredentialsGet
            }
        });
    });

    describe('First-time device setup', () => {
        it('should trigger WebAuthn credential creation on first launch', async () => {
            // Arrange
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
            const result = await setupDevice('Test User');

            // Assert
            expect(mockCredentialsCreate).toHaveBeenCalled();
            expect(result.credential).toBeTruthy();
            expect(result.identity).toBeTruthy();
        });

        it('should create credential with correct publicKey options', async () => {
            // Arrange
            mockCredentialsCreate.mockResolvedValue({
                id: 'test-id',
                rawId: new ArrayBuffer(32),
                response: {
                    attestationObject: new ArrayBuffer(64),
                    clientDataJSON: new ArrayBuffer(128),
                    getPublicKey: () => new ArrayBuffer(65)
                },
                type: 'public-key'
            });

            // Act
            await setupDevice('Test User');

            // Assert
            const createCall = mockCredentialsCreate.mock.calls[0][0];
            expect(createCall.publicKey).toBeTruthy();
            expect(createCall.publicKey.challenge).toBeInstanceOf(Uint8Array);
            expect(createCall.publicKey.rp).toEqual({
                name: 'SyncEngine',
                id: expect.any(String)
            });
            expect(createCall.publicKey.user).toMatchObject({
                name: 'Test User',
                displayName: 'Test User'
            });
            expect(createCall.publicKey.authenticatorSelection).toMatchObject({
                authenticatorAttachment: 'platform',
                userVerification: 'required'
            });
        });

        it('should persist credential to localStorage after creation', async () => {
            // Arrange
            const mockCredential = {
                id: 'test-credential-123',
                rawId: new ArrayBuffer(32),
                response: {
                    attestationObject: new ArrayBuffer(64),
                    clientDataJSON: new ArrayBuffer(128),
                    getPublicKey: () => new ArrayBuffer(65)
                },
                type: 'public-key'
            };
            mockCredentialsCreate.mockResolvedValue(mockCredential);

            // Act
            await setupDevice('Test User');

            // Assert
            const stored = localStorage.getItem('webauthn-credential-current-user');
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored);
            expect(parsed.id).toBe('test-credential-123');
        });

        it('should generate DID in format did:key:z...', async () => {
            // Arrange
            mockCredentialsCreate.mockResolvedValue({
                id: 'test-id',
                rawId: new ArrayBuffer(32),
                response: {
                    attestationObject: new ArrayBuffer(64),
                    clientDataJSON: new ArrayBuffer(128),
                    getPublicKey: () => new ArrayBuffer(65) // Ed25519 public key
                },
                type: 'public-key'
            });

            // Act
            const result = await setupDevice('Test User');

            // Assert
            expect(result.identity.id).toMatch(/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/);
        });
    });

    describe('Returning user flow', () => {
        it('should not prompt for credential if one exists', async () => {
            // Arrange - Set up existing credential
            const existingCredential = {
                id: 'existing-credential',
                publicKey: new Uint8Array(32),
                userName: 'Test User',
                createdAt: Date.now()
            };
            localStorage.setItem('webauthn-credential-current-user', JSON.stringify(existingCredential));

            // Act
            const credential = getWebAuthnCredential('current-user');

            // Assert
            expect(credential).toBeTruthy();
            expect(credential.id).toBe('existing-credential');
            expect(mockCredentialsCreate).not.toHaveBeenCalled();
        });

        it('should reconstruct identity from stored credential', async () => {
            // Arrange
            const existingCredential = {
                id: 'existing-credential',
                publicKey: new Uint8Array(32),
                userName: 'Test User'
            };

            // Act
            const identity = await createOrbitDBIdentity(existingCredential);

            // Assert
            expect(identity).toBeTruthy();
            expect(identity.id).toMatch(/^did:key:z/);
            expect(typeof identity.sign).toBe('function');
            expect(typeof identity.verify).toBe('function');
        });
    });

    describe('Error handling', () => {
        it('should handle WebAuthn not available', async () => {
            // Arrange
            vi.stubGlobal('navigator', {});

            // Act & Assert
            await expect(setupDevice('Test User')).rejects.toThrow('WebAuthn not supported');
        });

        it('should handle user canceling biometric prompt', async () => {
            // Arrange
            mockCredentialsCreate.mockRejectedValue(
                new Error('User canceled')
            );

            // Act & Assert
            await expect(setupDevice('Test User')).rejects.toThrow();
        });

        it('should handle invalid credential data', async () => {
            // Arrange
            mockCredentialsCreate.mockResolvedValue(null);

            // Act & Assert
            await expect(setupDevice('Test User')).rejects.toThrow('Failed to create credential');
        });
    });

    describe('Credential serialization', () => {
        it('should correctly serialize ArrayBuffer to base64', async () => {
            // Arrange
            const testBuffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
            const mockCredential = {
                id: 'test-id',
                rawId: testBuffer,
                response: {
                    attestationObject: new ArrayBuffer(64),
                    clientDataJSON: new ArrayBuffer(128),
                    getPublicKey: () => testBuffer
                },
                type: 'public-key'
            };
            mockCredentialsCreate.mockResolvedValue(mockCredential);

            // Act
            await setupDevice('Test User');

            // Assert
            const stored = localStorage.getItem('webauthn-credential-current-user');
            const parsed = JSON.parse(stored);
            // Should have base64-encoded publicKey, not raw ArrayBuffer
            expect(typeof parsed.publicKey).toBe('string');
        });
    });
});
