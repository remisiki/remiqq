const { User } = require("oicq");
const { Client } = require("oicq");
const { runJS } = require("./window");

const editText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) {
    	element.innerText = text;
    }
}

function receiveMessage(text) {
	const msg = document.createElement("div");
	msg.innerText = text;
	document.querySelector('#msg-box').appendChild(msg);
}
exports.receiveMessage = receiveMessage;

function clearMessage() {
	document.querySelector('#msg-box').innerHTML = "";
}
exports.clearMessage = clearMessage;

Client.prototype.sendMessage = function (msg, id) {
	const user = new User(this, id);
	user.sendMsg(msg);
	runJS(`window.api.setNewMessage("${this.nickname} - ${msg}");`);
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
		runJS(`window.api.setNewMessage("${name} - ${msg}");`);
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