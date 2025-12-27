import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import type { MenuItemConstructorOptions } from 'electron';
import { app, MenuItem } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { autoUpdater } from 'electron-updater';

import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

// Graceful handling of unhandled errors.
unhandled();

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
  { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
  { role: 'viewMenu' },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();

// Initialize our app. You can pass menu templates into the app here.
// const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig);
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

// If deeplinking is enabled then we will set it up here.
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
  });
}

// If we are in Dev mode, use the file watcher components.
if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

// Run Application
(async () => {
  // Wait for electron app to be ready.
  await app.whenReady();
  // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
  setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
  // Initialize our app, build windows, and load content.
  await myCapacitorApp.init();
  // Check for updates if we are in a packaged app.
  autoUpdater.checkForUpdatesAndNotify();
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// When the dock icon is clicked.
app.on('activate', async function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});

// Place all ipc or other electron api calls and custom functionality under this line

// ====================================================================================
// P2P Network Integration (libp2p + Helia + OrbitDB)
// ====================================================================================

import { ipcMain } from 'electron';
import {
  initializeP2P,
  createOrbitDBWithIdentity,
  getPeerId,
  getMultiaddrs,
  getConnections,
  dialPeer,
  shutdownP2P,
} from './p2p-main';
import { setupOrbitDBIPC, closeAllDatabases } from './ipc-bridge';

/**
 * Set up IPC handlers for P2P operations
 */
function setupP2PIPC(): void {
  // Initialize P2P network
  ipcMain.handle('p2p:initialize', async () => {
    try {
      return await initializeP2P();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Create OrbitDB with identity from renderer
  ipcMain.handle('p2p:createOrbitDB', async (_event, identity) => {
    try {
      return await createOrbitDBWithIdentity(identity);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Get peer ID
  ipcMain.handle('p2p:getPeerId', () => {
    return getPeerId();
  });

  // Get multiaddrs
  ipcMain.handle('p2p:getMultiaddrs', () => {
    return getMultiaddrs();
  });

  // Get connections
  ipcMain.handle('p2p:getConnections', () => {
    return getConnections();
  });

  // Dial peer
  ipcMain.handle('p2p:dialPeer', async (_event, multiaddr) => {
    try {
      return await dialPeer(multiaddr);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('✅ [Main] P2P IPC handlers registered');
}

// Initialize P2P IPC handlers
setupP2PIPC();

// Initialize OrbitDB IPC handlers (needs main window reference)
app.whenReady().then(async () => {
  // Wait for window to be created
  setTimeout(() => {
    const mainWindow = myCapacitorApp.getMainWindow();
    if (mainWindow) {
      setupOrbitDBIPC(mainWindow);
    }
  }, 1000); // Delay to ensure window is ready
});

// Initialize P2P on app ready (after Capacitor init)
app.whenReady().then(async () => {
  console.log('🚀 [Main] Initializing P2P on app ready...');
  try {
    await initializeP2P();
  } catch (error) {
    console.error('⚠️ [Main] Failed to initialize P2P on startup:', error);
    // Continue anyway - renderer can retry initialization
  }
});

// Shutdown P2P and OrbitDB before app quits
app.on('before-quit', async (event) => {
  console.log('👋 [Main] App quitting, shutting down...');
  event.preventDefault();
  await closeAllDatabases();
  await shutdownP2P();
  app.exit(0);
});
