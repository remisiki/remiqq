const { BrowserWindow } = require('electron');
// const { imgWindow } = require('../App');

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

// function newImgWindow(src) {
// 	imgWindow(src).show();
// }
// exports.newImgWindow = newImgWindow;