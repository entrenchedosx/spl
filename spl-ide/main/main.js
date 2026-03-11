const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const processes = new Map();
ipcMain.on('spawn-start', (event, { id, cmd, args, cwd }) => {
  const child = spawn(cmd, args || [], { cwd: cwd || process.cwd(), shell: process.platform === 'win32' });
  processes.set(id, child);
  child.stdout.on('data', (data) => sendToRenderer('spawn-data', id, data.toString(), false));
  child.stderr.on('data', (data) => sendToRenderer('spawn-data', id, data.toString(), true));
  child.on('exit', (code, signal) => {
    sendToRenderer('spawn-exit', id, code, signal);
    sendToRenderer(`spawn-exit-${id}`, code, signal);
    processes.delete(id);
  });
  child.on('error', (err) => {
    sendToRenderer(`spawn-error-${id}`, err);
    processes.delete(id);
  });
});
ipcMain.on('spawn-write', (_, id, data) => { const p = processes.get(id); if (p && p.stdin.writable) p.stdin.write(data); });
ipcMain.on('spawn-kill', (_, id) => { const p = processes.get(id); if (p) { p.kill(); processes.delete(id); } });

let mainWindow = null;
let overlayWindow = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;
  overlayWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload-overlay.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile(path.join(__dirname, '../src/overlay.html'));
  overlayWindow.on('closed', () => { overlayWindow = null; });
  return overlayWindow;
}

// Safe send to renderer: avoid "Object has been destroyed" when window is closed but child process still emits
function sendToRenderer(channel, ...args) {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  } catch (_) {
    // window/webContents may be destroyed
  }
}

function getIconPath() {
  if (app.isPackaged && process.platform === 'win32') return process.execPath;
  const repoIcon = path.join(__dirname, '..', '..', 'icon.ico');
  try {
    if (fs.existsSync(repoIcon)) return repoIcon;
  } catch (_) {}
  return null;
}

function createWindow() {
  const iconPath = getIconPath();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'SPL IDE',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// Resolve path to SPL executable: cached for session to avoid repeated filesystem checks
let cachedSplPath = null;
function getSplPath() {
  if (cachedSplPath !== null) return cachedSplPath;
  const exe = process.platform === 'win32' ? 'spl.exe' : 'spl';
  if (app.isPackaged) {
    const sameDir = path.join(path.dirname(process.execPath), exe);
    if (fs.existsSync(sameDir)) { cachedSplPath = sameDir; return cachedSplPath; }
    const binDir = path.join(path.dirname(process.execPath), 'bin', exe);
    if (fs.existsSync(binDir)) { cachedSplPath = binDir; return cachedSplPath; }
    const resource = path.join(process.resourcesPath, 'spl', exe);
    if (fs.existsSync(resource)) { cachedSplPath = resource; return cachedSplPath; }
  }
  const root = path.join(app.getAppPath(), '..');
  const finalBin = path.join(root, 'FINAL', 'bin', exe);
  if (fs.existsSync(finalBin)) { cachedSplPath = path.resolve(finalBin); return cachedSplPath; }
  const finalRoot = path.join(root, 'FINAL', exe);
  if (fs.existsSync(finalRoot)) { cachedSplPath = path.resolve(finalRoot); return cachedSplPath; }
  const buildRelease = path.join(root, 'build', 'Release', exe);
  if (fs.existsSync(buildRelease)) { cachedSplPath = path.resolve(buildRelease); return cachedSplPath; }
  const buildDebug = path.join(root, 'build', 'Debug', exe);
  if (fs.existsSync(buildDebug)) { cachedSplPath = path.resolve(buildDebug); return cachedSplPath; }
  cachedSplPath = exe;
  return cachedSplPath;
}

ipcMain.handle('get-spl-path', () => getSplPath());

// Return SPL version string (e.g. "SPL 1.0.0") by running spl --version.
ipcMain.handle('get-spl-version', () => {
  return new Promise((resolve) => {
    const splPath = getSplPath();
    const child = spawn(splPath, ['--version'], { shell: process.platform === 'win32' });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('exit', () => resolve(out.trim() || 'SPL (unknown)'));
    child.on('error', () => resolve('SPL (not found)'));
  });
});

// Check source (parse/compile only) - returns stderr for IDE validation
// Uses spl --check so we only parse/compile, no execution
ipcMain.handle('check-source', async (_, source) => {
  const tmp = path.join(os.tmpdir(), `spl-check-${Date.now()}.spl`);
  await fs.promises.writeFile(tmp, source, 'utf8');
  const splPath = getSplPath();
  return new Promise((resolve) => {
    const child = spawn(splPath, ['--check', tmp], { shell: process.platform === 'win32' });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('exit', () => {
      fs.promises.unlink(tmp).catch(() => {});
      resolve(stderr);
    });
    child.on('error', () => resolve(stderr));
  });
});

// Run source from buffer: write to temp file, spawn spl, delete on exit.
// scriptArgs: optional array of strings passed to script (e.g. ["hello", "42"] for cli_args()).
ipcMain.handle('run-source', async (_, source, cwd, scriptArgs) => {
  const tmp = path.join(os.tmpdir(), `spl-ide-${Date.now()}-${Math.random().toString(36).slice(2)}.spl`);
  await fs.promises.writeFile(tmp, source, 'utf8');
  const splPath = getSplPath();
  const args = [tmp].concat(Array.isArray(scriptArgs) ? scriptArgs : []);
  const id = Math.random().toString(36).slice(2);
  const child = spawn(splPath, args, { cwd: cwd || process.cwd(), shell: false });
  const cleanup = () => { processes.delete(id); fs.promises.unlink(tmp).catch(() => {}); };
  processes.set(id, child);
  child.stdout.on('data', (data) => sendToRenderer('spawn-data', id, data.toString(), false));
  child.stderr.on('data', (data) => sendToRenderer('spawn-data', id, data.toString(), true));
  child.on('exit', (code, signal) => {
    sendToRenderer('spawn-exit', id, code, signal);
    sendToRenderer(`spawn-exit-${id}`, code, signal);
    cleanup();
  });
  child.on('error', (err) => {
    sendToRenderer(`spawn-exit-${id}`, null, null);
    sendToRenderer('spawn-exit', id, null, null);
    sendToRenderer(`spawn-error-${id}`, err);
    cleanup();
  });
  return id;
});

ipcMain.handle('dialog:openDirectory', () => dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }).then(r => r.canceled ? null : r.filePaths[0]));
ipcMain.handle('dialog:openFile', (_, opts) => dialog.showOpenDialog(mainWindow, opts || { properties: ['openFile'] }).then(r => r.canceled ? null : r.filePaths[0]));
ipcMain.handle('dialog:saveFile', (_, opts) => dialog.showSaveDialog(mainWindow, opts || {}).then(r => r.canceled ? null : r.filePath));

ipcMain.handle('fs:readFile', (_, p, enc) => fs.promises.readFile(p, enc || 'utf8'));
ipcMain.handle('fs:writeFile', (_, p, data) => fs.promises.writeFile(p, data));
ipcMain.handle('fs:readdir', async (_, p) => {
  const entries = await fs.promises.readdir(p, { withFileTypes: true });
  return entries.map(d => ({ name: d.name, isDirectory: d.isDirectory() }));
});
ipcMain.handle('fs:mkdir', (_, p) => fs.promises.mkdir(p, { recursive: true }));
ipcMain.handle('fs:stat', (_, p) => fs.promises.stat(p));
ipcMain.handle('fs:unlink', (_, p) => fs.promises.unlink(p));
ipcMain.handle('fs:rename', (_, a, b) => fs.promises.rename(a, b));
ipcMain.handle('path:join', (_, ...segments) => path.join(...segments));
ipcMain.handle('path:resolve', (_, p) => path.resolve(p));
ipcMain.handle('path:basename', (_, p) => path.basename(p));
ipcMain.handle('path:dirname', (_, p) => path.dirname(p));
ipcMain.handle('path:extname', (_, p) => path.extname(p));

ipcMain.handle('shell:openPath', (_, p) => shell.openPath(p));

// Overlay window for SPL game/overlay drawing (boxes, text on screen)
ipcMain.on('overlay-show', () => {
  const win = createOverlayWindow();
  win.setBounds(screen.getPrimaryDisplay().bounds);
  win.show();
});
ipcMain.on('overlay-hide', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
});
ipcMain.on('overlay-clear', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send('overlay-draw', []);
});
ipcMain.on('overlay-draw', (_, shapes) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send('overlay-draw', shapes || []);
});

// List all .spl file paths under dir (recursive)
async function listSplFiles(dir, maxFiles = 1000) {
  const paths = [];
  async function walk(d) {
    if (paths.length >= maxFiles) return;
    let entries;
    try { entries = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.name.startsWith('.') && e.name !== '.') continue;
      if (e.isDirectory()) await walk(full);
      else if (e.name.endsWith('.spl')) paths.push(full);
    }
  }
  await walk(dir);
  return paths;
}

// Run spl with args and capture stdout + stderr (for AST / bytecode viewer)
async function splCapture(args, source) {
  const tmp = path.join(os.tmpdir(), `spl-capture-${Date.now()}.spl`);
  await fs.promises.writeFile(tmp, source, 'utf8');
  const splPath = getSplPath();
  return new Promise((resolve) => {
    const child = spawn(splPath, [...args, tmp], { shell: process.platform === 'win32' });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('exit', (code) => {
      fs.promises.unlink(tmp).catch(() => {});
      resolve({ stdout, stderr, code: code || 0 });
    });
    child.on('error', () => resolve({ stdout: '', stderr: 'Failed to run spl', code: 1 }));
  });
}

ipcMain.handle('list-spl-files', (_, root) => listSplFiles(root || ''));

ipcMain.handle('spl-capture', async (_, args, source) => splCapture(args || [], source));

// Format source with spl --fmt (write temp, run --fmt, read back)
ipcMain.handle('format-source', async (_, source) => {
  const tmp = path.join(os.tmpdir(), `spl-fmt-${Date.now()}.spl`);
  await fs.promises.writeFile(tmp, source, 'utf8');
  const splPath = getSplPath();
  return new Promise((resolve) => {
    const child = spawn(splPath, ['--fmt', tmp], { shell: process.platform === 'win32' });
    child.on('exit', async () => {
      try {
        const formatted = await fs.promises.readFile(tmp, 'utf8');
        resolve({ ok: true, content: formatted });
      } catch (e) {
        resolve({ ok: false, content: source });
      }
      fs.promises.unlink(tmp).catch(() => {});
    });
    child.on('error', () => {
      resolve({ ok: false, content: source });
      fs.promises.unlink(tmp).catch(() => {});
    });
  });
});

// Project-wide search in directory (recursive, .spl files). useRegex: match with RegExp(query) instead of substring.
async function searchInDirectory(dir, query, useRegex = false, maxFiles = 500) {
  const results = [];
  let re;
  if (useRegex) {
    try { re = new RegExp(query); } catch (err) { throw new Error('Invalid regex: ' + err.message); }
  }
  async function walk(d) {
    if (results.length >= maxFiles) return;
    let entries;
    try { entries = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.name.startsWith('.') && e.name !== '.') continue;
      if (e.isDirectory()) await walk(full);
      else if (e.name.endsWith('.spl')) {
        if (results.length >= maxFiles) return;
        try {
          const content = await fs.promises.readFile(full, 'utf8');
          const lines = content.split(/\r\n|\r|\n/);
          lines.forEach((line, i) => {
            const matches = useRegex ? re.test(line) : line.toLowerCase().includes(query.toLowerCase());
            if (matches)
              results.push({ path: full, line: i + 1, text: line.trim() });
          });
        } catch {}
      }
    }
  }
  await walk(dir);
  return results;
}
ipcMain.handle('search-in-files', (_, root, query, useRegex) => searchInDirectory(root || app.getPath('userHome'), query, !!useRegex));

// Run SPL file by path. scriptArgs: optional array passed after file path (for cli_args()).
ipcMain.handle('run-file', async (_, filePath, cwd, scriptArgs) => {
  const splPath = getSplPath();
  const args = [filePath].concat(Array.isArray(scriptArgs) ? scriptArgs : []);
  const id = Math.random().toString(36).slice(2);
  const child = spawn(splPath, args, { cwd: cwd || path.dirname(filePath), shell: false });
  const cleanup = () => processes.delete(id);
  processes.set(id, child);
  child.stdout.on('data', (data) => sendToRenderer('spawn-data', id, data.toString(), false));
  child.stderr.on('data', (data) => sendToRenderer('spawn-data', id, data.toString(), true));
  child.on('exit', (code, signal) => {
    sendToRenderer('spawn-exit', id, code, signal);
    sendToRenderer(`spawn-exit-${id}`, code, signal);
    cleanup();
  });
  child.on('error', (err) => {
    sendToRenderer(`spawn-exit-${id}`, null, null);
    sendToRenderer('spawn-exit', id, null, null);
    sendToRenderer(`spawn-error-${id}`, err);
    cleanup();
  });
  return id;
});

// Integrated terminal: spawn system shell
ipcMain.handle('spawn-terminal', (_, cwd) => {
  const shellCmd = process.platform === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/sh';
  const id = Math.random().toString(36).slice(2);
  const child = spawn(shellCmd, [], { cwd: cwd || process.cwd(), shell: false });
  processes.set(id, child);
  child.stdout.on('data', (data) => sendToRenderer('spawn-data', id, data.toString(), false));
  child.stderr.on('data', (data) => sendToRenderer('spawn-data', id, data.toString(), true));
  child.on('exit', (code, signal) => {
    sendToRenderer('spawn-exit', id, code, signal);
    sendToRenderer(`spawn-exit-${id}`, code, signal);
    processes.delete(id);
  });
  child.on('error', (err) => {
    sendToRenderer(`spawn-exit-${id}`, null, null);
    sendToRenderer('spawn-exit', id, null, null);
    sendToRenderer(`spawn-error-${id}`, err);
    processes.delete(id);
  });
  return id;
});
