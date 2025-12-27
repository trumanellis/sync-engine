import { describe, it, expect, vi } from 'vitest';
import { createIntention, switchAttention } from '../../src/lib/data-model.js';

describe('Data Model', () => {
    describe('createIntention', () => {
        it('should create intention with required fields', async () => {
            // Arrange
            const mockDB = {
                put: vi.fn().mockResolvedValue(undefined)
            };
            const intentionData = {
                title: 'Test Intention',
                description: 'Test Description',
                createdBy: 'did:key:z123',
                status: 'active',
                category: 'ask'
            };

            // Act
            const intention = await createIntention(mockDB, intentionData);

            // Assert
            expect(intention).toBeTruthy();
            expect(intention.intentionId).toMatch(/^int_/);
            expect(intention.title).toBe('Test Intention');
            expect(intention.description).toBe('Test Description');
            expect(intention.timestamp).toBeTruthy();
            expect(mockDB.put).toHaveBeenCalledWith(intention);
        });

        it('should generate unique IDs for each intention', async () => {
            // Arrange
            const mockDB = {
                put: vi.fn().mockResolvedValue(undefined)
            };
            const intentionData = {
                title: 'Test',
                createdBy: 'did:key:z123'
            };

            // Act
            const intention1 = await createIntention(mockDB, intentionData);
            const intention2 = await createIntention(mockDB, intentionData);

            // Assert
            expect(intention1.intentionId).not.toBe(intention2.intentionId);
        });
    });

    describe('switchAttention', () => {
        it('should create attention switch event', async () => {
            // Arrange
            const mockLog = {
                iterator: vi.fn().mockReturnValue({
                    collect: vi.fn().mockResolvedValue([])
                }),
                add: vi.fn().mockResolvedValue(undefined)
            };
            const userId = 'did:key:z123';
            const intentionId = 'int_456';

            // Act
            const event = await switchAttention(mockLog, intentionId, userId);

            // Assert
            expect(event).toBeTruthy();
            expect(event.userId).toBe(userId);
            expect(event.intentionId).toBe(intentionId);
            expect(event.timestamp).toBeTruthy();
            expect(event.index).toBeDefined();
            expect(mockLog.add).toHaveBeenCalledWith(event);
        });
    });
});
