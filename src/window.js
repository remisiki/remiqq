const { BrowserWindow } = require('electron');

function windowEmit(signal, ...data) {
	try {
		const mainWindow = BrowserWindow.getAllWindows()[0];
		mainWindow.webContents.send(signal, ...data);
	}
	catch (e) {
		console.error(e);
	}
}
exports.windowEmit = windowEmit;