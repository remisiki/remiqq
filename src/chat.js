const { runJS } = require("./window");
const { Client } = require("oicq");
const { User } = require("oicq");


function addNewChat(id, name, last, avatar_url, callback) {
	const avatar = document.createElement("img");
	avatar.className = "avatar";
	avatar.src = avatar_url;
	const chat = document.createElement("div");
	chat.className = "chat";
	chat.innerText = name;
	const chat_container = document.createElement("div");
	chat_container.className = "chat-container";
	chat_container.addEventListener("click", () => {
		const chats = document.getElementsByClassName("chat-container");
		for (const chat of chats) {
			chat.classList.remove("chat-container-selected");
		}
		chat_container.classList.add("chat-container-selected");
		callback();
	});
	chat_container.appendChild(avatar);
	chat_container.appendChild(chat);
	document.querySelector("#chat-list").appendChild(chat_container);
}
exports.addNewChat = addNewChat;

Client.prototype.addChatList = function (chats) {
	for (const chat of chats) {
		const id = chat.id;
		const name = chat.name;
		const last = chat.last;
		const avatar_url = this.getAvatar(id);
		runJS(`window.api.addNewChat(${id}, "${name}", ${last}, "${avatar_url}");`);
	}
}

Client.prototype.getAvatar = function (id = this.uin) {
	const user = new User(this, id);
	return user.getAvatarUrl(40);
}

function addMyAvatar(url) {
	const my_avatar = document.createElement("img");
	my_avatar.className = "avatar";
	my_avatar.src = url;
	document.querySelector("#list-head").appendChild(my_avatar);
}
exports.addMyAvatar = addMyAvatar;