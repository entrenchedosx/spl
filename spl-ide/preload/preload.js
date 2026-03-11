const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splIde', {
  getSplPath: () => ipcRenderer.invoke('get-spl-path'),
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    openFile: (opts) => ipcRenderer.invoke('dialog:openFile', opts),
    saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  },
  fs: {
    readFile: (p, enc) => ipcRenderer.invoke('fs:readFile', p, enc),
    writeFile: (p, data) => ipcRenderer.invoke('fs:writeFile', p, data),
    readdir: (p) => ipcRenderer.invoke('fs:readdir', p),
    mkdir: (p) => ipcRenderer.invoke('fs:mkdir', p),
    stat: (p) => ipcRenderer.invoke('fs:stat', p),
    unlink: (p) => ipcRenderer.invoke('fs:unlink', p),
    rename: (a, b) => ipcRenderer.invoke('fs:rename', a, b),
  },
  path: {
    join: (...s) => ipcRenderer.invoke('path:join', ...s),
    resolve: (p) => ipcRenderer.invoke('path:resolve', p),
    basename: (p) => ipcRenderer.invoke('path:basename', p),
    dirname: (p) => ipcRenderer.invoke('path:dirname', p),
    extname: (p) => ipcRenderer.invoke('path:extname', p),
  },
  shell: { openPath: (p) => ipcRenderer.invoke('shell:openPath', p) },
  spawn: (cmd, args, cwd) => {
    const id = Math.random().toString(36).slice(2);
    const promise = new Promise((resolve, reject) => {
      ipcRenderer.once(`spawn-exit-${id}`, (_, code, signal) => resolve({ code, signal }));
      ipcRenderer.once(`spawn-error-${id}`, (_, err) => reject(err));
    });
    ipcRenderer.send('spawn-start', { id, cmd, args, cwd });
    return { id, promise };
  },
  getSplVersion: () => ipcRenderer.invoke('get-spl-version'),
  /** Run SPL source from buffer. scriptArgs: optional string[] for cli_args(). Returns { id, promise }. */
  runSource: (source, cwd, scriptArgs) => {
    return ipcRenderer.invoke('run-source', source, cwd, scriptArgs).then((id) => {
      const promise = new Promise((resolve, reject) => {
        ipcRenderer.once(`spawn-exit-${id}`, (_, code, signal) => resolve({ code, signal }));
        ipcRenderer.once(`spawn-error-${id}`, (_, err) => reject(err));
      });
      return { id, promise };
    });
  },
  onSpawnData: (cb) => { ipcRenderer.on('spawn-data', (_, id, data, isStderr) => cb(id, data, isStderr)); },
  onSpawnExit: (cb) => { ipcRenderer.on('spawn-exit', (_, id, code, signal) => cb(id, code, signal)); },
  spawnWrite: (id, data) => ipcRenderer.send('spawn-write', id, data),
  spawnKill: (id) => ipcRenderer.send('spawn-kill', id),
  searchInFiles: (root, query, useRegex) => ipcRenderer.invoke('search-in-files', root, query, !!useRegex),
  listSplFiles: (root) => ipcRenderer.invoke('list-spl-files', root),
  splCapture: (args, source) => ipcRenderer.invoke('spl-capture', args, source),
  runFile: (filePath, cwd, scriptArgs) => ipcRenderer.invoke('run-file', filePath, cwd, scriptArgs),
  spawnTerminal: (cwd) => ipcRenderer.invoke('spawn-terminal', cwd),
  checkSource: (source) => ipcRenderer.invoke('check-source', source),
  formatSource: (source) => ipcRenderer.invoke('format-source', source),
  // Overlay (game drawing: boxes, text on screen)
  overlayShow: () => ipcRenderer.send('overlay-show'),
  overlayHide: () => ipcRenderer.send('overlay-hide'),
  overlayClear: () => ipcRenderer.send('overlay-clear'),
  overlayDraw: (shapes) => ipcRenderer.send('overlay-draw', shapes),
});
