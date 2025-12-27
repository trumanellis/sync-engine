/**
 * OrbitDB IPC Bridge
 * Handles database CRUD operations via IPC
 * Main process ↔ Renderer process communication
 */

import { ipcMain, BrowserWindow } from 'electron';
import { getOrbitDB } from './p2p-main';
import type { Database } from '@orbitdb/core';

// Track open databases by address
const databases = new Map<string, Database>();

/**
 * Setup OrbitDB IPC handlers
 * @param mainWindow - Main Electron window for sending events
 */
export function setupOrbitDBIPC(mainWindow: BrowserWindow): void {
  /**
   * Open or create a database
   * @param name - Database name
   * @param options - Database options (type, create, etc.)
   */
  ipcMain.handle('orbitdb:open', async (_event, name: string, options: any = {}) => {
    try {
      const orbitdb = getOrbitDB();
      if (!orbitdb) {
        return {
          success: false,
          error: 'OrbitDB not initialized. Call createOrbitDB with identity first.',
        };
      }

      console.log(`📂 [OrbitDB] Opening database: ${name}`, options);

      const db = await orbitdb.open(name, {
        type: options.type || 'documents',
        create: options.create !== false,
        ...options,
      });

      const address = db.address;
      databases.set(address, db);

      console.log(`✅ [OrbitDB] Database opened: ${address}`);

      // Listen for database updates and notify renderer
      db.events.on('update', async (entry) => {
        console.log(`🔄 [OrbitDB] Database update: ${address}`, entry);
        mainWindow.webContents.send('orbitdb:update', {
          address,
          entry,
          operation: entry.payload?.op || 'unknown',
        });
      });

      return {
        success: true,
        address,
        name: db.name,
        type: db.type,
      };
    } catch (error) {
      console.error('❌ [OrbitDB] Failed to open database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Close a database
   * @param address - Database address
   */
  ipcMain.handle('orbitdb:close', async (_event, address: string) => {
    try {
      const db = databases.get(address);
      if (!db) {
        return { success: false, error: `Database not found: ${address}` };
      }

      await db.close();
      databases.delete(address);

      console.log(`✅ [OrbitDB] Database closed: ${address}`);
      return { success: true };
    } catch (error) {
      console.error('❌ [OrbitDB] Failed to close database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Get list of open databases
   */
  ipcMain.handle('orbitdb:getDatabases', () => {
    try {
      const dbList = Array.from(databases.entries()).map(([address, db]) => ({
        address,
        name: db.name,
        type: db.type,
      }));

      return { success: true, databases: dbList };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Query database (documents type)
   * @param address - Database address
   * @param filterFn - Optional filter function (as string to eval)
   */
  ipcMain.handle('orbitdb:query', async (_event, address: string, filterFn?: string) => {
    try {
      const db = databases.get(address);
      if (!db) {
        return { success: false, error: `Database not found: ${address}` };
      }

      if (db.type !== 'documents') {
        return { success: false, error: 'Query only works with documents type databases' };
      }

      // Get all documents
      const all = await db.all();

      // Apply filter if provided (security note: eval is dangerous, should validate in production)
      let results = all;
      if (filterFn && typeof filterFn === 'string') {
        try {
          // eslint-disable-next-line no-eval
          const filter = eval(`(${filterFn})`);
          results = all.filter(filter);
        } catch (evalError) {
          console.error('❌ [OrbitDB] Invalid filter function:', evalError);
          return { success: false, error: 'Invalid filter function' };
        }
      }

      return { success: true, documents: results };
    } catch (error) {
      console.error('❌ [OrbitDB] Query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Add document (documents type)
   * @param address - Database address
   * @param doc - Document to add
   */
  ipcMain.handle('orbitdb:add', async (_event, address: string, doc: any) => {
    try {
      const db = databases.get(address);
      if (!db) {
        return { success: false, error: `Database not found: ${address}` };
      }

      if (db.type !== 'documents') {
        return { success: false, error: 'Add only works with documents type databases' };
      }

      console.log(`➕ [OrbitDB] Adding document to ${address}:`, doc);
      const hash = await db.put(doc);

      return { success: true, hash };
    } catch (error) {
      console.error('❌ [OrbitDB] Add failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Update document (documents type)
   * @param address - Database address
   * @param doc - Document with _id to update
   */
  ipcMain.handle('orbitdb:put', async (_event, address: string, doc: any) => {
    try {
      const db = databases.get(address);
      if (!db) {
        return { success: false, error: `Database not found: ${address}` };
      }

      if (db.type !== 'documents') {
        return { success: false, error: 'Put only works with documents type databases' };
      }

      if (!doc._id) {
        return { success: false, error: 'Document must have _id field for update' };
      }

      console.log(`✏️ [OrbitDB] Updating document in ${address}:`, doc);
      const hash = await db.put(doc);

      return { success: true, hash };
    } catch (error) {
      console.error('❌ [OrbitDB] Put failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Delete document (documents type)
   * @param address - Database address
   * @param key - Document _id to delete
   */
  ipcMain.handle('orbitdb:del', async (_event, address: string, key: string) => {
    try {
      const db = databases.get(address);
      if (!db) {
        return { success: false, error: `Database not found: ${address}` };
      }

      if (db.type !== 'documents') {
        return { success: false, error: 'Del only works with documents type databases' };
      }

      console.log(`🗑️ [OrbitDB] Deleting document from ${address}: ${key}`);
      const hash = await db.del(key);

      return { success: true, hash };
    } catch (error) {
      console.error('❌ [OrbitDB] Del failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Get single document by _id (documents type)
   * @param address - Database address
   * @param id - Document _id
   */
  ipcMain.handle('orbitdb:get', async (_event, address: string, id: string) => {
    try {
      const db = databases.get(address);
      if (!db) {
        return { success: false, error: `Database not found: ${address}` };
      }

      if (db.type !== 'documents') {
        return { success: false, error: 'Get only works with documents type databases' };
      }

      const doc = await db.get(id);

      return { success: true, document: doc };
    } catch (error) {
      console.error('❌ [OrbitDB] Get failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Get database info (address, name, type, etc.)
   * @param address - Database address
   */
  ipcMain.handle('orbitdb:info', async (_event, address: string) => {
    try {
      const db = databases.get(address);
      if (!db) {
        return { success: false, error: `Database not found: ${address}` };
      }

      return {
        success: true,
        info: {
          address: db.address,
          name: db.name,
          type: db.type,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('✅ [OrbitDB] IPC handlers registered');
}

/**
 * Close all databases gracefully
 */
export async function closeAllDatabases(): Promise<void> {
  console.log('👋 [OrbitDB] Closing all databases...');

  for (const [address, db] of databases.entries()) {
    try {
      await db.close();
      console.log(`✅ [OrbitDB] Closed database: ${address}`);
    } catch (error) {
      console.error(`❌ [OrbitDB] Failed to close database ${address}:`, error);
    }
  }

  databases.clear();
  console.log('✅ [OrbitDB] All databases closed');
}
