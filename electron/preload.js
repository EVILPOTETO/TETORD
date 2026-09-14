const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('TETORD_DESKTOP', {
  saveFile: (options, base64) => ipcRenderer.invoke('tetord:save-file', { options, base64 }),
  savePdf: (options) => ipcRenderer.invoke('tetord:save-pdf', options)
});
