const { app, BrowserWindow, ipcMain, nativeImage, clipboard } = require('electron');
const { mainWindow } = require('./src/window');
const contextMenu = require('electron-context-menu');
const { getBase64FromUrl, getBufferFromUrl } = require('./src/image');

contextMenu({
  menu: (actions, params, browserWindow, dictionarySuggestions) => [
    ...dictionarySuggestions,
    actions.separator(),
    actions.searchWithGoogle(),
    actions.separator(),
    {
      label: "画像をコピー",
      visible: params.mediaType === 'image',
      click: async () => {
        const src = params.srcURL;
        const buffer = await getBufferFromUrl(src);
        const image = nativeImage.createFromBuffer(buffer);
        clipboard.writeImage(image);
      }
    },
    actions.saveImageAs(),
    actions.copyImageAddress(),
    actions.separator(),
    actions.cut(),
    actions.copy(),
    actions.paste(),
    actions.separator(),
  ],
  labels: {
    copy: 'コピー',
    paste: '貼り付け',
    cut: '切り取り',
    // copyImage: '画像をコピー',
    copyImageAddress: 'アドレスをコピー',
    saveImageAs: '画像を保存する…',
    searchWithGoogle: 'Googleで検索'
  }
});

app.whenReady().then(() => {
  mainWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
})