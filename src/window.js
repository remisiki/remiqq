const { contextBridge, ipcMain, BrowserWindow } = require('electron');

function runJS(code) {
	const mainWindow = BrowserWindow.getAllWindows()[0];
	mainWindow.webContents.executeJavaScript(code);
}
exports.runJS = runJS;