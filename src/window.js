const { BrowserWindow } = require('electron');

function runJS(code) {
	try {
		const mainWindow = BrowserWindow.getAllWindows()[0];
	// mainWindow.webContents.executeJavaScript(code);
		mainWindow.webContents.executeJavaScript(String.raw`${code.replace(/\n/g, "")}`);
	}
	catch (e) {
		console.error(e);
	}
}
exports.runJS = runJS;