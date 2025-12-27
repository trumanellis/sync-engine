import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOrbitDBIdentity } from '../../src/lib/identity.js';

/**
 * Unit tests for cryptographic signing and verification
 * Phase 1.4: Real WebAuthn assertions and Web Crypto verification
 * Following TDD - these tests should FAIL initially (RED phase)
 */
describe('Identity Signing and Verification', () => {
    let mockCredentialsGet;
    let mockCredential;
    let mockIdentity;

    beforeEach(async () => {
        localStorage.clear();

        // Mock WebAuthn credentials.get for assertions
        mockCredentialsGet = vi.fn();
        vi.stubGlobal('navigator', {
            credentials: {
                create: vi.fn(),
                get: mockCredentialsGet
            }
        });

        // Create test credential and identity
        mockCredential = {
            id: 'test-credential-123',
            rawId: new Uint8Array([1, 2, 3, 4, 5]),
            publicKey: new Uint8Array(65).fill(1), // Mock public key
            userName: 'Test User'
        };

        mockIdentity = await createOrbitDBIdentity(mockCredential);
    });

    describe('Sign function', () => {
        it('should generate a signature from data', async () => {
            // Arrange
            const testData = new Uint8Array([10, 20, 30, 40, 50]);
            const mockAssertion = {
                id: 'assertion-id',
                rawId: new ArrayBuffer(32),
                response: {
                    authenticatorData: new ArrayBuffer(37),
                    clientDataJSON: new ArrayBuffer(128),
                    signature: new Uint8Array([99, 88, 77, 66, 55]), // Mock signature
                    userHandle: new ArrayBuffer(32)
                },
                type: 'public-key'
            };
            mockCredentialsGet.mockResolvedValue(mockAssertion);

            // Act
            const signature = await mockIdentity.sign(testData);

            // Assert
            expect(signature).toBeInstanceOf(Uint8Array);
            expect(signature.length).toBeGreaterThan(0);
            expect(mockCredentialsGet).toHaveBeenCalled();
        });

        it('should call navigator.credentials.get with correct options', async () => {
            // Arrange
            const testData = new Uint8Array([1, 2, 3]);
            const mockAssertion = {
                id: 'assertion-id',
                rawId: new ArrayBuffer(32),
                response: {
                    signature: new Uint8Array([5, 6, 7])
                }
            };
            mockCredentialsGet.mockResolvedValue(mockAssertion);

            // Act
            await mockIdentity.sign(testData);

            // Assert
            const getCall = mockCredentialsGet.mock.calls[0][0];
            expect(getCall.publicKey).toBeTruthy();
            expect(getCall.publicKey.challenge).toBeInstanceOf(Uint8Array);
            expect(getCall.publicKey.rpId).toBe('localhost');
            expect(getCall.publicKey.allowCredentials).toBeTruthy();
            expect(getCall.publicKey.userVerification).toBe('required');
        });

        it('should use data hash as challenge', async () => {
            // Arrange
            const testData = new Uint8Array([10, 20, 30]);
            const mockAssertion = {
                response: { signature: new Uint8Array([1, 2]) }
            };
            mockCredentialsGet.mockResolvedValue(mockAssertion);

            // Act
            await mockIdentity.sign(testData);

            // Assert
            const getCall = mockCredentialsGet.mock.calls[0][0];
            const challenge = getCall.publicKey.challenge;
            expect(challenge).toBeInstanceOf(Uint8Array);
            expect(challenge.length).toBe(32); // SHA-256 hash length
        });

        it('should handle signing errors gracefully', async () => {
            // Arrange
            const testData = new Uint8Array([1, 2, 3]);
            mockCredentialsGet.mockRejectedValue(new Error('User canceled'));

            // Act & Assert
            await expect(mockIdentity.sign(testData)).rejects.toThrow();
        });

        it('should produce different signatures for different data', async () => {
            // Arrange
            const data1 = new Uint8Array([1, 2, 3]);
            const data2 = new Uint8Array([4, 5, 6]);

            let callCount = 0;
            mockCredentialsGet.mockImplementation(() => {
                callCount++;
                return Promise.resolve({
                    response: {
                        signature: new Uint8Array([callCount, callCount + 1])
                    }
                });
            });

            // Act
            const sig1 = await mockIdentity.sign(data1);
            const sig2 = await mockIdentity.sign(data2);

            // Assert
            expect(sig1).not.toEqual(sig2);
            expect(mockCredentialsGet).toHaveBeenCalledTimes(2);
        });
    });

    describe('Verify function', () => {
        it('should verify a valid signature', async () => {
            // Arrange
            const testData = new Uint8Array([1, 2, 3, 4, 5]);
            const mockSignature = new Uint8Array([10, 20, 30]);
            const publicKey = mockIdentity.publicKey;

            // Mock crypto.subtle for this test
            vi.stubGlobal('crypto', {
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
                    importKey: vi.fn().mockResolvedValue({}),
                    verify: vi.fn().mockResolvedValue(true)
                },
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                    return arr;
                }
            });

            // Act
            const isValid = await mockIdentity.verify(mockSignature, testData, publicKey);

            // Assert
            expect(typeof isValid).toBe('boolean');
            expect(isValid).toBe(true);
        });

        it('should reject an invalid signature', async () => {
            // Arrange
            const testData = new Uint8Array([1, 2, 3]);
            const invalidSignature = new Uint8Array([99, 99, 99]);
            const publicKey = mockIdentity.publicKey;

            // Mock crypto.subtle to return false for invalid signature
            vi.stubGlobal('crypto', {
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
                    importKey: vi.fn().mockResolvedValue({}),
                    verify: vi.fn().mockResolvedValue(false)
                },
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                    return arr;
                }
            });

            // Act
            const isValid = await mockIdentity.verify(invalidSignature, testData, publicKey);

            // Assert
            expect(isValid).toBe(false);
        });

        it('should use Web Crypto API for verification', async () => {
            // Arrange
            const testData = new Uint8Array([1, 2, 3]);
            const signature = new Uint8Array([4, 5, 6]);
            const publicKey = mockIdentity.publicKey;

            // Mock crypto.subtle.verify
            const mockVerify = vi.fn().mockResolvedValue(true);
            vi.stubGlobal('crypto', {
                subtle: {
                    verify: mockVerify,
                    importKey: vi.fn().mockResolvedValue({}),
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
                },
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                    return arr;
                }
            });

            // Act
            await mockIdentity.verify(signature, testData, publicKey);

            // Assert
            expect(mockVerify).toHaveBeenCalled();
        });

        it('should reject signature with wrong public key', async () => {
            // Arrange
            const testData = new Uint8Array([1, 2, 3]);
            const signature = new Uint8Array([4, 5, 6]);
            const wrongPublicKey = new Uint8Array(65).fill(99); // Different key

            // Mock crypto.subtle to return false
            vi.stubGlobal('crypto', {
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
                    importKey: vi.fn().mockResolvedValue({}),
                    verify: vi.fn().mockResolvedValue(false)
                },
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                    return arr;
                }
            });

            // Act
            const isValid = await mockIdentity.verify(signature, testData, wrongPublicKey);

            // Assert
            expect(isValid).toBe(false);
        });

        it('should handle verification errors gracefully', async () => {
            // Arrange
            const testData = new Uint8Array([1, 2, 3]);
            const signature = new Uint8Array([4, 5, 6]);

            // Mock crypto to throw error
            vi.stubGlobal('crypto', {
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
                    importKey: vi.fn().mockRejectedValue(new Error('Crypto error'))
                },
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                    return arr;
                }
            });

            // Act
            const isValid = await mockIdentity.verify(signature, testData, mockIdentity.publicKey);

            // Assert
            expect(isValid).toBe(false); // Should return false on error, not throw
        });
    });

    describe('Sign-Verify integration', () => {
        it('should verify a signature created by sign', async () => {
            // Arrange
            const testData = new Uint8Array([1, 2, 3, 4, 5]);
            const mockSignature = new Uint8Array([10, 20, 30, 40, 50]);

            mockCredentialsGet.mockResolvedValue({
                response: { signature: mockSignature }
            });

            // Mock crypto for both sign and verify
            vi.stubGlobal('crypto', {
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
                    importKey: vi.fn().mockResolvedValue({}),
                    verify: vi.fn().mockResolvedValue(true)
                },
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                    return arr;
                }
            });

            // Act
            const signature = await mockIdentity.sign(testData);
            const isValid = await mockIdentity.verify(signature, testData, mockIdentity.publicKey);

            // Assert
            expect(isValid).toBe(true);
        });

        it('should fail verification with tampered data', async () => {
            // Arrange
            const originalData = new Uint8Array([1, 2, 3, 4, 5]);
            const tamperedData = new Uint8Array([1, 2, 99, 4, 5]); // Modified
            const mockSignature = new Uint8Array([10, 20, 30]);

            mockCredentialsGet.mockResolvedValue({
                response: { signature: mockSignature }
            });

            // Mock crypto - verification should fail for tampered data
            vi.stubGlobal('crypto', {
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
                    importKey: vi.fn().mockResolvedValue({}),
                    verify: vi.fn().mockResolvedValue(false) // Simulate failed verification
                },
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                    return arr;
                }
            });

            // Act
            const signature = await mockIdentity.sign(originalData);
            const isValid = await mockIdentity.verify(signature, tamperedData, mockIdentity.publicKey);

            // Assert
            expect(isValid).toBe(false);
        });

        it('should support signing and verifying OrbitDB entries', async () => {
            // Arrange - Simulate OrbitDB entry
            const entry = {
                identity: mockIdentity.id,
                payload: { value: 'test data' },
                timestamp: Date.now()
            };
            const entryBytes = new TextEncoder().encode(JSON.stringify(entry));
            const mockSignature = new Uint8Array([5, 10, 15, 20]);

            mockCredentialsGet.mockResolvedValue({
                response: { signature: mockSignature }
            });

            // Mock crypto for sign and verify
            vi.stubGlobal('crypto', {
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
                    importKey: vi.fn().mockResolvedValue({}),
                    verify: vi.fn().mockResolvedValue(true)
                },
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                    return arr;
                }
            });

            // Act
            const signature = await mockIdentity.sign(entryBytes);
            const isValid = await mockIdentity.verify(signature, entryBytes, mockIdentity.publicKey);

            // Assert
            expect(signature).toBeInstanceOf(Uint8Array);
            expect(isValid).toBe(true);
        });
    });
});
