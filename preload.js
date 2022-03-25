const { contextBridge, ipcRenderer, BrowserWindow } = require('electron');

const { addNewMessage, clearMessage, scrollMessageBoxToBottom } = require("./src/message");
const { addNewChat, addMyAvatar, updateChat, cacheChat, chatIsCached, setChatFromCache } = require("./src/chat");


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
    .on('set-chat', (e, id, name, time, raw_message, last_name, group, avatar_url, unread) => {
        addNewChat(id, group, name, time, raw_message, last_name, avatar_url, unread, () => ipcRenderer.send('sync-message', [id, group]));
      })
    .on('set-message', (e, doms, name, time, from_me, avatar_url, from_sync) => {
        addNewMessage(doms, name, time, from_me, avatar_url, from_sync);
      })
    .on('update-chat', (e, id, name, group, time, raw_message, top, unread) => {
        updateChat(id, name, group, time, raw_message, top, unread);
      })
    .on('clear', (e) => {
        clearMessage();
      })
    .on('scroll-message', (e) => {
        scrollMessageBoxToBottom();
      })
    .on('cache-chat', (e, id, group) => {
        cacheChat(id, group);
      })
    .on('check-cache', (e, id, group) => {
        const is_cached = chatIsCached(id, group);
        ipcRenderer.send('is-cached', is_cached);
      })
    .on('fetch-cache', (e, id, group) => {
        setChatFromCache(id, group);
      })
    ;
})
