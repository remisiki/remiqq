const { BrowserWindow } = require('electron');
const path = require('path');
const { getImgUrlFromSrc } = require('./image');

let windows = {imgWindowCount: 0};
function windowEmit(signal, ...data) {
	try {
		// const mainWindow = BrowserWindow.getAllWindows()[0];
		const mainWindow = windows.main;
		mainWindow.webContents.send(signal, ...data);
	}
	catch (e) {
		console.error(e);
	}
}
exports.windowEmit = windowEmit;

const mainWindow = () => {
	const window = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {
			enableRemoteModule: true,
			nodeIntegration: true,
			preload: path.join(__dirname, '../preload.js')
		}
	});
	windows.main = window;
	window.on("closed", () => {
	    delete windows.main;
	});

  // ipcMain.on('set-new-message', (event, msg) => {
  //   const webContents = event.sender
  //   const win = BrowserWindow.fromWebContents(webContents)
  //   // win.setNewMessage(msg)
  //   console.log(msg);
  //   // document.getElementById("msg-box")
  // })

	window.loadFile('index.html');
}
exports.mainWindow = mainWindow;

const imgWindow = (src) => {
    const window = new BrowserWindow({parent: mainWindow});
    windows[`img${windows.imgWindowCount}`] = window;
    windows.imgWindowCount ++;
    window.on("closed", () => {
        delete windows[`img${windows.imgWindowCount}`];
        windows.imgWindowCount --;
    });
    try {
	    window.loadURL(getImgUrlFromSrc(src));
    }
    catch (e) {
    	console.log(e);
    }
}
exports.imgWindow = imgWindow;