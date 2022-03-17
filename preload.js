const { contextBridge, ipcRenderer, BrowserWindow } = require('electron');

const { receiveMessage, clearMessage } = require("./src/message");


contextBridge.exposeInMainWorld('api', {
    setTitle: (title) => ipcRenderer.send('set-title', title),
    setNewMessage: (msg) => {
      receiveMessage(msg);
    },
    alertMessage: (msg) => alert(msg),
    getValue: (query) => {
      return document.querySelector(query).innerText;
    },
    sendMessage: () => {
      ipcRenderer.send('send-message', [document.querySelector("#send-box").value, 2635799987]);
    },
    clearMessage: () => {
      clearMessage();
    },
})

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})
