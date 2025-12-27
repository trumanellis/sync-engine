/**
 * OrbitDB Data Model
 * Based on liftoff pattern: normalized primitives
 */

/**
 * Open or create the intentions database
 * Multi-writer documents database
 */
export async function openIntentionsDB(orbitdb) {
    console.log('📂 Opening intentions database...');

    const db = await orbitdb.open('intentions', {
        type: 'documents',
        create: true,
        AccessController: () => ({
            // Multi-writer: anyone can write
            type: 'orbitdb',
            write: ['*']
        })
    });

    console.log(`✅ Intentions DB: ${db.address}`);
    return db;
}

/**
 * Open or create the attention log database
 * Single-writer event log (per user)
 */
export async function openAttentionLog(orbitdb, userId) {
    console.log('📂 Opening attention log for:', userId);

    const db = await orbitdb.open(`attention-${userId}`, {
        type: 'eventlog',
        create: true,
        AccessController: () => ({
            // Single-writer: only this user
            type: 'orbitdb',
            write: [userId]
        })
    });

    console.log(`✅ Attention log: ${db.address}`);
    return db;
}

/**
 * Create a new intention
 */
export async function createIntention(intentionsDB, intentionData) {
    const intention = {
        intentionId: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        ...intentionData
    };

    await intentionsDB.put(intention);
    console.log('✅ Created intention:', intention.intentionId);

    return intention;
}

/**
 * Switch attention to a new intention
 */
export async function switchAttention(attentionLog, intentionId, userId) {
    // Get current log length for index
    const entries = await attentionLog.iterator({ limit: -1 }).collect();
    const index = entries.length;

    const event = {
        index,
        userId,
        intentionId,
        timestamp: Date.now()
    };

    await attentionLog.add(event);
    console.log('✅ Switched attention to:', intentionId);

    return event;
}
