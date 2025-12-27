# Chrome DevTools Remote Debugging Guide

## Problem
Electron's embedded DevTools doesn't support copy/paste in the console.

## Solution: Use Chrome Browser for Full DevTools

Connect Google Chrome to Electron's debug port for **full DevTools with paste support**.

---

## Setup (One-Time)

### Step 1: Open Chrome Inspect Page
1. Open **Google Chrome** browser
2. Navigate to: `chrome://inspect`
3. You'll see the "Devices" page

### Step 2: Configure Debug Ports
1. Click **"Configure..."** button (next to "Discover network targets")
2. Add these two ports:
   - `localhost:9229`
   - `localhost:9230`
3. Click **"Done"**

### Step 3: Connect to Electron Instances
After starting your Electron instances, you'll see them listed under "Remote Target":

```
Remote Target #LOCALHOST

▼ Electron
  SyncEngine V2 (Instance 1)
  [inspect] [focus] [close]

  SyncEngine V2 (Instance 2)
  [inspect] [focus] [close]
```

4. Click **"inspect"** on the instance you want to debug
5. Full Chrome DevTools opens in a new window! 🎉

---

## Usage

### Testing Instance 2 → Instance 1 Connection

1. **Start both instances**:
   ```bash
   npx electron . --inspect=9229  # Instance 1
   npx electron . --user-data-dir=/tmp/syncengine-instance2 --inspect=9230  # Instance 2
   ```

2. **In Chrome**: Navigate to `chrome://inspect`

3. **Click "inspect" on Instance 2** (the one you want to test from)

4. **In the Chrome DevTools Console**, paste and run:
   ```javascript
   // Get your peer ID
   const myId = await window.electronP2P.getPeerId()
   console.log('My ID:', myId)

   // Get multiaddrs
   const addrs = await window.electronP2P.getMultiaddrs()
   console.log('My addresses:', addrs)

   // Connect to Instance 1 (update with Instance 1's peer ID)
   const result = await window.electronP2P.dialPeer('/ip4/127.0.0.1/tcp/4003/p2p/12D3KooWFkVTq8NwwQxNY4CiQsfmXo4NHBScsNkfTXJHfECgchJX')
   console.log('Connection result:', result)

   // Verify connection
   const connections = await window.electronP2P.getConnections()
   console.log('Active connections:', connections)
   ```

5. **✨ Copy/Paste works perfectly!** You can paste entire test scripts.

---

## Advantages

✅ **Full Chrome DevTools** - All features including paste, autocomplete, etc.
✅ **No code changes required** - Already have `--inspect` flags
✅ **Separate window** - Better screen real estate
✅ **Network panel** - Inspect all network requests
✅ **Performance profiling** - Full Chrome profiler
✅ **React DevTools** - Works with React extensions

---

## Troubleshooting

### "No targets found"
- Make sure Electron instances are running with `--inspect` flags
- Check ports 9229 and 9230 are not blocked by firewall
- Verify with: `lsof -nP -iTCP:9229,9230 -sTCP:LISTEN`

### "Connection refused"
- Restart Electron instances with `--inspect` flags
- Make sure you added `localhost:9229` and `localhost:9230` in Configure

### Multiple targets appear
- Each instance shows up separately
- Instance 1 = port 9229
- Instance 2 = port 9230
- Use "focus" button to identify which window belongs to which instance

---

## Alternative: Detached DevTools (Built-In)

We also updated `setup.ts` to open DevTools in a **separate window** instead of embedded:

```typescript
this.MainWindow.webContents.openDevTools({ mode: 'detach' });
```

This gives you a separate DevTools window that might have better paste support (though Chrome Remote Debugging is still the most reliable).

To use:
1. Rebuild: `node esbuild.config.js`
2. Restart Electron
3. DevTools opens in separate window

---

## Recommended Workflow

**For Testing**:
- Use Chrome Remote Debugging (`chrome://inspect`)
- Full paste support, best DevTools experience

**For Development**:
- Detached DevTools opens automatically
- Quick access without switching applications

**For Production**:
- DevTools disabled automatically (only enabled in dev mode)

---

## Current Electron Instances

Check your running instances:
```bash
# See instance 1 peer ID
cat /tmp/electron-instance1.log | grep "libp2p created"

# See instance 2 peer ID
cat /tmp/electron-instance2.log | grep "libp2p created"

# Check debug ports
lsof -nP -iTCP:9229,9230 -sTCP:LISTEN
```

---

## Resources

- Chrome DevTools: https://developer.chrome.com/docs/devtools/
- Electron Debugging: https://www.electronjs.org/docs/latest/tutorial/debugging-main-process
- Remote Debugging Protocol: https://chromedevtools.github.io/devtools-protocol/
