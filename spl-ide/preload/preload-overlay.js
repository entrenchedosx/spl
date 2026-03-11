const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayApi', {
  onOverlayDraw: (cb) => {
    ipcRenderer.on('overlay-draw', (_, shapes) => { if (typeof cb === 'function') cb(shapes); });
  },
});
