/*
 * Desktop shell. It boots the same local engine the CLI uses and points a window
 * at it, so the packaged app and `node agentproof.mjs serve` behave identically.
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

let server = null;

async function startEngine() {
  // lib/server.mjs is ESM, so it has to come in through a dynamic import.
  const { createServer, listen } = await import(
    require('node:url').pathToFileURL(path.join(__dirname, 'lib', 'server.mjs')).href
  );
  const instance = await createServer({ limit: 80 });
  const address = await listen(instance, 0); // ephemeral port: no clashes, not exposed
  server = instance;
  return 'http://127.0.0.1:' + address.port + '/';
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: '#08090b',
    show: false,
    autoHideMenuBar: true,
    title: 'AgentProof',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  try {
    await win.loadURL(await startEngine());
  } catch (error) {
    await win.loadURL('data:text/html,<pre style="font:14px monospace;padding:24px">' +
      encodeURIComponent('AgentProof failed to start the local engine:\n' + error) + '</pre>');
  }
}

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});
