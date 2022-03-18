const { contextBridge, ipcRenderer, BrowserWindow } = require('electron');

const { addNewMessage, clearMessage } = require("./src/message");
const { addNewChat, addMyAvatar } = require("./src/chat");


contextBridge.exposeInMainWorld('api', {
    setTitle: (title) => ipcRenderer.send('set-title', title),
    setNewMessage: (msg, name, time, from_me, avatar_url) => {
      addNewMessage(msg, name, time, from_me, avatar_url);
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
    addNewChat: (id, name, last, avatar_url) => {
      addNewChat(id, name, last, avatar_url, () => ipcRenderer.send('sync-message', id));
    },
    getMyAvatar: (url) => {
      addMyAvatar(url);
    },
})

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('set-name');
  ipcRenderer.send('set-avatar');
  // const replaceText = (selector, text) => {
  //   const element = document.getElementById(selector)
  //   if (element) element.innerText = text
  // }

  // for (const type of ['chrome', 'node', 'electron']) {
  //   replaceText(`${type}-version`, process.versions[type])
  // }
})
