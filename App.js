const { app, BrowserWindow, ipcMain } = require('electron');
const { mainWindow } = require('./src/window');

app.whenReady().then(() => {
  mainWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
})