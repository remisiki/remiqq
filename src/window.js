const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getImgUrlFromSrc } = require('./image');

let windows = {imgWindowCount: 0};
function windowEmit(name, signal, ...data) {
	try {
		// const mainWindow = BrowserWindow.getAllWindows()[0];
		const window = windows[name];
		window.webContents.send(signal, ...data);
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
	window.on('ready-to-show', window.show);

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
    const window = new BrowserWindow({
    	parent: mainWindow,
    	backgroundColor: "#0e1621",
	    webPreferences: {
		}
	});
	const index = windows.imgWindowCount;
    windows[`img${index}`] = window;
    windows.imgWindowCount ++;
    window.on("closed", () => {
        delete windows[`img${windows.imgWindowCount}`];
        windows.imgWindowCount --;
    });
    window.loadURL(src);
}
exports.imgWindow = imgWindow;