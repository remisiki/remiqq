const { windowEmit } = require("./window");
const { Client } = require("oicq");
const { User, Group } = require("oicq");
const { getTime, unescapeHtml, removeNewLines } = require("./utils");


function addNewChat(id, group, name, time, seq, raw_message, avatar_url, callback) {
	const avatar = document.createElement("img");
	avatar.className = "avatar";
	avatar.src = avatar_url;

	const chat = document.createElement("div");
	chat.className = "chat";
	chat.innerText = name;

	const chat_last = document.createElement("div");
	chat_last.className = "chat-last";
	chat_last.innerText = removeNewLines(raw_message);

	const chat_time = document.createElement("div");
	chat_time.className = "chat-time";
	chat_time.innerText = time;
	
	const chat_container = document.createElement("div");
	chat_container.className = "chat-container";
	chat_container.id = `chat-list-${id}${(group) ? 'g' : 'p'}`;
	chat_container.addEventListener("click", () => {
		const chats = document.getElementsByClassName("chat-container");
		for (const chat of chats) {
			chat.classList.remove("chat-container-selected");
		}
		chat_container.classList.add("chat-container-selected");
		document.getElementById("bottom-area").style.display = "block";
		document.getElementById("before-start").style.display = "none";
		callback();
	});
	chat_container.appendChild(avatar);
	chat_container.appendChild(chat);
	chat_container.appendChild(chat_last);
	chat_container.appendChild(chat_time);
	document.querySelector("#chat-list").appendChild(chat_container);
}
exports.addNewChat = addNewChat;

function updateChat(id, group, time, raw_message) {
	const chat_container = document.getElementById(`chat-list-${id}${(group) ? 'g' : 'p'}`);
	chat_container.getElementsByClassName("chat-time")[0].innerText = time;
	chat_container.getElementsByClassName("chat-last")[0].innerText = removeNewLines(raw_message);
}
exports.updateChat = updateChat;

Client.prototype.addChatList = function (chats, group) {
	let chat_list = [];
	for (const chat of chats) {
		const id = chat.id;
		const name = chat.name;
		const time = getTime(chat.time);
		const seq = chat.seq;
		const avatar_url = this.getAvatar(id, group);
		const raw_message = chat.last;
		windowEmit('set-chat', id, name, time, seq, raw_message, group, avatar_url);
		chat_list.push({
			id: id,
			group: group
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