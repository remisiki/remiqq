const { User, Group } = require("oicq");
const { segment } = require("oicq/lib/message/elements");
const { Client } = require("oicq");
const { windowEmit } = require("./window");
const { getTime, unescapeHtml, escapeHtml, escapeHtmlFromDom, unescapeHtmlFromDom, removeSpaces, compareChat, getRawMessage, removeNewLines } = require("./utils");
const { IMG_REGEX, BASE64_REGEX, SRC_REGEX, extractUrlFromMessage, splitDomByImg, getBase64FromImg, domIsImg, getImgSrcFromDom, getImgSrcFromSegment } = require("./image");
const jsdom = require("jsdom");
const { updateChatListData, dbUpdateUnread } = require("./sqlite");

const editText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) {
    	element.innerText = text;
    }
}

function addNewMessage(doms, name = null, time = null, from_me = false, avatar_url = null, no_scroll = false) {

	const messageScroll = (msg) => {
		const msg_box = document.getElementById("msg-box");
		if (msg_box.scrollHeight - msg_box.scrollTop <= msg.clientHeight + msg_box.clientHeight + 20) {
			msg_box.scrollTop = msg_box.scrollHeight;
		}
	}

	const title = document.createElement("div");
	title.className = "msg-title";

	const title_name = document.createElement("span");
	title_name.innerText = name;
	title_name.className = `msg-name${(from_me) ? "-me" : ""}`;
	title.appendChild(title_name);

	const title_time = document.createElement("span");
	title_time.innerText = time;
	title_time.className = "msg-time";

	const msg_container = document.createElement("div");
	msg_container.className = `msg${(from_me) ? "-me" : ""}`;
	msg_container.appendChild(title);

	for (const dom of doms) {
		switch (dom.type) {
			case "text":
				const msg_text = document.createElement("div");
				msg_text.innerText = unescapeHtml(dom.text);
				msg_text.innerHTML = msg_text.innerHTML.replace(/<br>/g, '\u000a');
				msg_container.appendChild(msg_text);
				break;
			case "image":
				const msg_img = document.createElement("img");
				msg_img.className = "msg-img";
				msg_img.src = getImgSrcFromSegment(dom);
				if (!no_scroll) {
					msg_img.addEventListener("load", () => {
						messageScroll(msg_container);
					});
				}
				msg_container.appendChild(msg_img);
				break;
			default:
				msg_container.innerHTML += (`[${dom.type} not supported]`);
		}
	}

	let img_only = false;
	if (doms.every(x => x.type === "image")) {
		msg_container.className += " msg-transparent";
		img_only = true;
	}

	msg_container.appendChild(title_time);

	const avatar = document.createElement("img");
	avatar.className = `avatar${(from_me) ? "-me" : ""}`;
	avatar.src = avatar_url;

	const msg_wrapper = document.createElement("div");
	msg_wrapper.style.clear = "both";
	msg_wrapper.appendChild(avatar);
	msg_wrapper.appendChild(msg_container);

	const msg_gap_bottom = document.createElement("div");
	msg_gap_bottom.className = "gap";

	const msg_box = document.querySelector('#msg-box');
	msg_box.removeChild(msg_box.lastChild);
	// msg_box.removeChild(msg_box.firstChild);
	msg_box.appendChild(msg_wrapper);
	msg_box.appendChild(msg_gap_bottom);
	// msg_box.insertBefore(msg_wrapper, msg_box.firstChild);
	// msg_box.insertBefore(msg_gap_bottom, msg_box.firstChild);
	if (!img_only && !no_scroll) {
		messageScroll(msg_container);
	}
	
}
exports.addNewMessage = addNewMessage;

function clearMessage() {
	const msg_box = document.querySelector('#msg-box');
	msg_box.innerHTML = "";
	const before_start = document.createElement("div");
	before_start.id = "before-start";
	before_start.style.display = "none";
	before_start.innerText = "Select a chat to start messaging";
	const msg_gap_top_0 = document.createElement("div");
	const msg_gap_top_1 = document.createElement("div");
	msg_gap_top_0.className = "gap";
	msg_gap_top_1.className = "gap";
	msg_box.appendChild(before_start);
	msg_box.appendChild(msg_gap_top_0);
	msg_box.appendChild(msg_gap_top_1);
}
exports.clearMessage = clearMessage;

Client.prototype.sendMessage = async function (html, id, group, db) {
	if (!html) return;
	const user = (group) ? (new Group(this, id)) : (new User(this, id));
	const doms = splitDomByImg(html);
	const send_list = doms.map(dom => {
		dom = removeSpaces(dom);
		if (domIsImg(dom)) {
			try {
				const sendable_img = getImgSrcFromDom(dom);
				return segment.image(sendable_img);
			}
			catch (e) {
				console.log(e);
				return segment.text(dom);
			}
		}
		else {
			return segment.text(dom);
		}
	});
	const unescaped_send_list = unescapeHtmlFromDom(send_list);
	const msg_callback = await user.sendMsg(unescaped_send_list);
	const time = getTime(msg_callback.time);
	const avatar_url = this.getAvatar();
	const raw_message = getRawMessage(send_list);
	const name = this.nickname;
	windowEmit('set-message', send_list, name, time, true, avatar_url);
	windowEmit('update-chat', id, name, group, time, raw_message, undefined, 0);
	updateChatListData(db, id, group, "", msg_callback.time, raw_message, name);
	dbUpdateUnread(db, id, group, "clear");
}

Client.prototype.getHistoryById = async function (id, group) {
	let msgs;
	if (group) {
		const group = new Group(this, id);
		msgs = await group.getChatHistory();
	}
	else {
		const user = new User(this, id);
		msgs = await user.getChatHistory();
	}
	const num = msgs.length;
	const names = await Promise.all(msgs.map((msg) => this.getMessageSenderName(msg)));
	return {
		num: num,
		msgs: msgs,
		names: names
	};
};

Client.prototype.syncMessage = async function (db, id, group) {
	const history = await this.getHistoryById(id, group);
	windowEmit('clear');
	for (let i = 0; i < history.num; i ++) {
		// console.log(history.msgs[i]);
		const msg = history.msgs[i];
		const sender_name = history.names[i];
		const doms = msg.message;
		const raw_message = removeNewLines(msg.raw_message);
		const time = getTime(msg.time);
		const sender_id = (group) ? (msg.sender.user_id) : (msg.from_id);
		const from_me = (sender_id === this.uin);
		const avatar_url = this.getAvatar(sender_id);
		const seq = msg.seq;
		const _group = new Group(this, id);
		const last_seq = await _group._setting();
		windowEmit('set-message', doms, sender_name, time, from_me, avatar_url, true);
		if (i === (history.num - 1)) {
			const name = (group) ? null : await this.getName(id);
			windowEmit('update-chat', id, sender_name, group, time, raw_message, false, 0);
			updateChatListData(db, id, group, name ?? msg.group_name, msg.time, raw_message, sender_name);
		}
	}
	windowEmit('scroll-message');
	dbUpdateUnread(db, id, group, "clear");
}

Client.prototype.getMessageSenderName = async function (msg) {
	const message_type = msg.message_type;
	let sender_id;
	if (message_type === 'private') {
		sender_id = msg.from_id;
	}
	else if (message_type === 'group') {
		sender_id = msg.sender.user_id;
	}
	if (sender_id === undefined) {
		console.log(`Invalid message ${msg}.`);
		return -1;
	}
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

Client.prototype.getName = async function (id) {
	const user = new User(this, id);
	const info = await user.getSimpleInfo();
	return info.nickname;
}

Client.prototype.handleMessage = async function(e, db, current_uid, chat_list) {
	const msg_is_group = (e.message_type === "group");
	const group_id = (msg_is_group) ? e.group_id : null;
	const group_name = (msg_is_group) ? e.group_name : null;
	const sender_id = (msg_is_group) ? e.sender.user_id : e.from_id;
	const name = await this.getMessageSenderName(e);
	const time = getTime(e.time);
	const from_me = (sender_id === this.uin);
	const avatar_url = this.getAvatar(sender_id);
	const group_avatar_url = (msg_is_group) ? this.getAvatar(group_id, true) : null;
	const escaped_doms = escapeHtmlFromDom(e.message);
	const in_section = (current_uid === (group_id ?? sender_id));
	if (in_section) {
		windowEmit('set-message', e.message, name, time, from_me, avatar_url);
	}
	updateChatListData(db, group_id ?? sender_id, msg_is_group, group_name ?? name, e.time, e.raw_message, name);
	dbUpdateUnread(db, group_id ?? sender_id, msg_is_group, (in_section) ? "clear" : "plus");
	const search_item = {id: group_id ?? sender_id, group: msg_is_group};
	if (!chat_list.some(item => compareChat(item, search_item))) {
		windowEmit('set-chat', group_id ?? sender_id, group_name ?? name, time, e.raw_message, msg_is_group, group_avatar_url ?? avatar_url, (in_section) ? 0 : 1);
		return search_item;
	}
	else if (chat_list) {
		windowEmit('update-chat', group_id ?? sender_id, name, msg_is_group, time, e.raw_message, undefined, (in_section) ? 0 : 1);
	}
	return null;
}

Client.prototype.syncMessageFromOtherDevice = function(e, db, current_uid) {
	const msg_is_group = (e.message_type === "group");
	const receiver_id = e.to_id ?? null;
	const group_id = (msg_is_group) ? e.group_id : null;
	const time = getTime(e.time);
	const group_name = (msg_is_group) ? e.group_name : null;
	const name = this.nickname;
	const avatar_url = this.getAvatar();
	windowEmit('update-chat', group_id ?? receiver_id, name, msg_is_group, time, e.raw_message, undefined, 0);
	updateChatListData(db, group_id ?? receiver_id, msg_is_group, "", e.time, e.raw_message, name);
	if (current_uid === (group_id ?? receiver_id)) {
		windowEmit('set-message', e.message, name, time, true, avatar_url);
	}
	dbUpdateUnread(db, (group_id ?? receiver_id), msg_is_group, "clear");
}

function scrollMessageBoxToBottom() {
	const msg_box = document.getElementById("msg-box");
	msg_box.style.scrollBehavior = "unset";
	msg_box.scrollTop = msg_box.scrollHeight;
	msg_box.style.scrollBehavior = "smooth";
}
exports.scrollMessageBoxToBottom = scrollMessageBoxToBottom;