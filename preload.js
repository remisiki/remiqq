const { contextBridge, ipcRenderer, BrowserWindow } = require('electron');

const { addNewMessage, clearMessage, scrollMessageBoxToBottom } = require("./src/message");
const { addNewChat, addMyAvatar, updateChat } = require("./src/chat");


contextBridge.exposeInMainWorld('api', {
    sendMessage: () => {
      const send_box = document.getElementById("send-box");
      ipcRenderer.send('send-message', send_box.innerHTML);
      send_box.innerHTML = "";
    },
})

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('set-name');
  ipcRenderer.send('set-avatar');
  ipcRenderer
    .on('set-my-avatar', (e, url) => {
        addMyAvatar(url);
      })
    .on('set-chat', (e, id, name, time, seq, raw_message, group, avatar_url) => {
        addNewChat(id, group, name, time, seq, raw_message, avatar_url, () => ipcRenderer.send('sync-message', [id, group]));
      })
    .on('set-message', (e, doms, name, time, from_me, avatar_url, from_sync) => {
          addNewMessage(doms, name, time, from_me, avatar_url, from_sync);
      })
    .on('update-chat', (e, id, group, time, raw_message) => {
        updateChat(id, group, time, raw_message);
      })
    .on('clear', (e) => {
        clearMessage();
      })
    .on('scroll-message', (e) => {
        scrollMessageBoxToBottom();
      });
})
