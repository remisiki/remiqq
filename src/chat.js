const { windowEmit } = require("./window");
const { Client } = require("oicq");
const { User, Group } = require("oicq");
const { getTime, unescapeHtml, removeNewLines } = require("./utils");


function addNewChat(id, group, name, time, raw_message, last_name, avatar_url, unread, callback) {
	const avatar = document.createElement("img");
	avatar.className = "avatar";
	avatar.src = avatar_url;

	const chat = document.createElement("div");
	chat.className = "chat";
	chat.innerText = name;

	const chat_last = document.createElement("div");
	chat_last.className = "chat-last";

	const chat_time = document.createElement("div");
	chat_time.className = "chat-time";

	const chat_unread = document.createElement("div");
	chat_unread.className = "chat-unread";
	
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
	chat_container.appendChild(chat_unread);
	document.getElementById("chat-list").appendChild(chat_container);
	updateChat(id, last_name, group, time, raw_message, undefined, unread);
}
exports.addNewChat = addNewChat;

function updateChat(id, name, group, time, raw_message, top = true, unread = 0) {
	const chat_container = document.getElementById(`chat-list-${id}${(group) ? 'g' : 'p'}`);
	chat_container.getElementsByClassName("chat-time")[0].innerText = time;
	const chat_last = chat_container.getElementsByClassName("chat-last")[0];
	chat_last.innerHTML = "";
	const chat_sender_name = document.createElement("span");
	chat_sender_name.className = `link-text`;
	chat_sender_name.innerText = `${name}:`;
	if (group) {
		chat_last.appendChild(chat_sender_name);
	}
	chat_last.innerHTML += removeNewLines(raw_message) ?? "";
	if (top) {
		const chat_list = document.getElementById("chat-list");
		chat_list.insertBefore(chat_container, chat_list.firstChild);
	}
	const chat_unread = chat_container.getElementsByClassName("chat-unread")[0];
	if (chat_unread.innerText && unread) {
		const count = parseInt(chat_unread.innerText);
		if (count >= 99) {
			chat_unread.innerText = "99+";
		}
		else {
			chat_unread.innerText = count + unread;
		}
		chat_unread.style.display = "block";
	}
	else if (unread) {
		if (unread >= 99) {
			chat_unread.innerText = "99+";
		}
		else {
			chat_unread.innerText = unread;
		}
		chat_unread.style.display = "block";
	}
	else {
		chat_unread.innerText = "";
		chat_unread.style.display = "none";
	}
}
exports.updateChat = updateChat;

Client.prototype.addChatList = function (chats) {
	let chat_list = [];
	for (const chat of chats) {
		const id = chat.id;
		const name = chat.name;
		const time = getTime(chat.time);
		const group = (chat.src === "group");
		const avatar_url = this.getAvatar(id, group);
		const raw_message = chat.last;
		const last_name = chat.last_name;
		const unread=chat.unread;
		windowEmit('set-chat', id, name, time, raw_message, last_name, group, avatar_url, unread);
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