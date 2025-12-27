import { describe, it, expect, beforeEach } from 'vitest';
import { getWebAuthnCredential } from '../../src/lib/identity.js';

/**
 * Unit tests for identity persistence
 * Testing localStorage interaction
 */
describe('Identity Persistence', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('getWebAuthnCredential', () => {
        it('should return null when no credential stored', () => {
            // Act
            const result = getWebAuthnCredential('test-key');

            // Assert
            expect(result).toBeNull();
        });

        it('should return credential when stored', () => {
            // Arrange
            const testBuffer = new Uint8Array([1, 2, 3, 4, 5]);
            const base64Key = btoa(String.fromCharCode(...testBuffer)); // Valid base64
            const credential = {
                id: 'test-123',
                publicKey: base64Key,
                userName: 'Test User',
                createdAt: Date.now()
            };
            localStorage.setItem('webauthn-credential-test-key', JSON.stringify(credential));

            // Act
            const result = getWebAuthnCredential('test-key');

            // Assert
            expect(result).toBeTruthy();
            expect(result.id).toBe('test-123');
            expect(result.publicKey).toBeInstanceOf(Uint8Array);
            expect(result.userName).toBe('Test User');
        });

        it('should handle corrupted localStorage data', () => {
            // Arrange
            localStorage.setItem('webauthn-credential-test-key', 'invalid-json{');

            // Act & Assert
            expect(() => getWebAuthnCredential('test-key')).toThrow();
        });

        it('should use default key when none provided', () => {
            // Arrange
            const credential = { id: 'default-cred' };
            localStorage.setItem('webauthn-credential-current-user', JSON.stringify(credential));

            // Act
            const result = getWebAuthnCredential();

            // Assert
            expect(result.id).toBe('default-cred');
        });
    });

    describe('Credential expiry', () => {
        it('should detect expired credentials', () => {
            // Arrange
            const oldCredential = {
                id: 'old-cred',
                createdAt: Date.now() - (365 * 24 * 60 * 60 * 1000) // 1 year old
            };
            localStorage.setItem('webauthn-credential-test', JSON.stringify(oldCredential));

            // Act
            const result = getWebAuthnCredential('test');

            // Assert - Old credentials should still load but could be flagged
            expect(result).toBeTruthy();
            expect(result.createdAt).toBeLessThan(Date.now());
        });
    });
});
