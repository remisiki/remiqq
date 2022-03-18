const { User } = require("oicq");
const { Client } = require("oicq");
const { runJS } = require("./window");
const { getTime } = require("./utils");

const editText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) {
    	element.innerText = text;
    }
}

function addNewMessage(text, name = null, time = null, from_me = false, avatar_url = null) {
	const msg = document.createElement("div");
	msg.innerText = text;
	const title = document.createElement("div");
	title.className = "msg-title";
	const title_name = document.createElement("span");
	title_name.innerText = name;
	title_name.className = `msg-name${(from_me) ? "-me" : ""}`;
	title.appendChild(title_name);
	const title_time = document.createElement("span");
	title_time.innerText = time;
	title_time.className = "msg-time";
	msg.appendChild(title_time);
	const msg_container = document.createElement("div");
	msg_container.className = `msg${(from_me) ? "-me" : ""}`;
	msg_container.appendChild(title);
	msg_container.appendChild(msg);
	const avatar = document.createElement("img");
	avatar.className = `avatar${(from_me) ? "-me" : ""}`;
	avatar.src = avatar_url;
	const msg_wrapper = document.createElement("div");
	msg_wrapper.style.clear = "both";
	msg_wrapper.appendChild(avatar);
	msg_wrapper.appendChild(msg_container);
	const msg_box = document.querySelector('#msg-box');
	msg_box.appendChild(msg_wrapper);
	msg_box.scrollTop = msg_box.scrollHeight;
}
exports.addNewMessage = addNewMessage;

function clearMessage() {
	document.querySelector('#msg-box').innerHTML = "";
}
exports.clearMessage = clearMessage;

Client.prototype.sendMessage = async function (msg, id) {
	const user = new User(this, id);
	const msg_callback = await user.sendMsg(msg);
	const time = getTime(msg_callback.time);
	const avatar_url = this.getAvatar();
	runJS(`window.api.setNewMessage("${msg}", "${this.nickname}", "${time}", true, "${avatar_url}");`);
}

Client.prototype.getHistoryById = async function (id) {
	const user = new User(this, id);
	const msgs = await user.getChatHistory();
	const num = msgs.length;
	const names = await Promise.all(msgs.map((msg) => this.getMessageSenderName(msg)));
	return {
		num: num,
		msgs: msgs,
		names: names
	};
};

Client.prototype.syncMessage = async function (id) {
	const history = await this.getHistoryById(id);
	runJS(`window.api.clearMessage();`);
	for (let i = 0; i < history.num; i ++) {
		const name = history.names[i];
		const msg = history.msgs[i].raw_message;
		const time = getTime(history.msgs[i].time);
		const sender_id = history.msgs[i].from_id;
		const from_me = (sender_id === this.uin);
		const avatar_url = this.getAvatar(sender_id);
		runJS(`window.api.setNewMessage("${msg}", "${name}", "${time}", ${from_me}, "${avatar_url}");`);
	}
}

Client.prototype.getMessageSenderName = async function (msg) {
	const sender_id = msg.from_id;
	if (msg.sender.nickname) {
		return msg.sender.nickname;
	}
	else if (msg.sender.user_id === sender_id) {
		const user = new User(this, sender_id);
		const info = await user.getSimpleInfo();
		return info.nickname;
	}
	else {
		return this.nickname;
	}
}