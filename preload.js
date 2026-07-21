// bridge script for electron context
const { contextBridge, ipcRenderer } = require('electron');

// expose ipc channels safely to the react app window
contextBridge.exposeInMainWorld('electronAPI', {
  onPrint: (callback) => ipcRenderer.on('print-command', (_event, value) => callback(value)),
  storeRead: () => ipcRenderer.invoke('store-read'),
  storeWrite: (data) => ipcRenderer.invoke('store-write', data)
});
