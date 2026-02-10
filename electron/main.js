const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { startServer } = require('../server/index');

const PORT = process.env.PORT || 3000;
let win = null;

function createWindow() {
    win = new BrowserWindow({
        fullscreen: true,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadURL(`http://localhost:${PORT}/game/`);
}

app.whenReady().then(() => {
    const serverHandle = startServer({
        port: PORT,
        ipcSendToGame: (msg) => {
            if (win && !win.isDestroyed()) {
                win.webContents.send('game-msg', msg);
            }
        }
    });

    ipcMain.on('game-msg', (_e, msg) => {
        serverHandle.handleGameMessage(msg);
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
