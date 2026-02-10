const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    send: (msg) => ipcRenderer.send('game-msg', msg),
    onMessage: (cb) => ipcRenderer.on('game-msg', (_e, msg) => cb(msg))
});
