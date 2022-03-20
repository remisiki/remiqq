const { runJS } = require("./window");
const { Client } = require("oicq");
const { User, Group } = require("oicq");


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
	let chat_list = [];
	for (const chat of chats) {
		const id = chat.id;
		const name = chat.name;
		const last = chat.last;
		const is_group = (chat.type === 1);
		const avatar_url = this.getAvatar(id, is_group);
		runJS(`window.api.addNewChat(${id}, "${name}", ${last}, ${is_group}, "${avatar_url}");`);
		chat_list.push({
			id: id,
			group: is_group
		});
	}
	return chat_list;
}

Client.prototype.getAvatar = function (id = this.uin, group = false) {
	if (group) {
		const group = new Group(this, id);
		return group.getAvatarUrl(40);
	}
	else {
		const user = new User(this, id);
		return user.getAvatarUrl(40);
	}
}

function addMyAvatar(url) {
	const my_avatar = document.createElement("img");
	my_avatar.className = "avatar";
	my_avatar.src = url;
	document.querySelector("#list-head").appendChild(my_avatar);
}
exports.addMyAvatar = addMyAvatar;