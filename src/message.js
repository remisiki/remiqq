const { User, Group } = require("oicq");
const { segment } = require("oicq/lib/message/elements");
const { Client } = require("oicq");
const { windowEmit, imgWindow } = require("./window");
const { getTime, unescapeHtml, escapeHtml, escapeHtmlFromDom, unescapeHtmlFromDom, removeSpaces, compareChat, getRawMessage, removeNewLines, messageScroll, lazyImageLoad, lazyImageError, scrollMessageBoxToBottom } = require("./utils");
const { IMG_REGEX, BASE64_REGEX, SRC_REGEX, extractUrlFromMessage, splitDomByImg, getBase64FromImg, domIsImg, getImgSrcFromDom, getImgSrcFromSegment, cacheImgSrcFromDom } = require("./image");
const { JSDOM } = require('jsdom');
const { updateChatListData, dbUpdateUnread, dbStoreMessage, dbReadMessage } = require("./sqlite");
const { ipcMain } = require('electron');

function addNewMessage(doms, name = null, time = null, from_me = false, avatar_url = null, hide = false, top = true, merge = false, jsdom, send) {

	let virtual = false;
	if (!jsdom) {
		jsdom = document;
	}
	else {
		virtual = true;
	}
	const msg_box = jsdom.getElementById('msg-box');

	const title = jsdom.createElement("div");
	title.className = "msg-title";

	const title_name = jsdom.createElement("span");
	title_name.textContent = name;
	title_name.className = `msg-name${(from_me) ? "-me" : ""}`;
	title.appendChild(title_name);

	const title_time = jsdom.createElement("span");
	title_time.textContent = time;
	title_time.className = "msg-time";

	const msg_container = jsdom.createElement("div");
	msg_container.className = `msg${(from_me) ? "-me" : ""}`;
	if (!merge) {
		msg_container.appendChild(title);
	}

	for (const dom of doms) {
		switch (dom.type) {
			case "text":
				msg_container.innerHTML += unescapeHtml(dom.text).replace(/<br>/g, '\u000a');
				break;
			case "image":
				const msg_img = jsdom.createElement("img");
				const img_src = getImgSrcFromSegment(dom);
				msg_img.className = "msg-img";
				msg_img.loading = "lazy";
				msg_img.src = img_src;
				msg_container.classList.add("lazyImageWaiting");
				msg_container.appendChild(msg_img);
				break;
			default:
				msg_container.innerHTML += (`[${dom.type} not supported]`);
		}
	}

	let img_only = false;
	if (doms.every(x => x.type === "image")) {
		msg_container.className += " msg-transparent";
		msg_container.style.padding = 0;
		img_only = true;
	}

	msg_container.appendChild(title_time);

	const avatar = jsdom.createElement("img");
	avatar.src = avatar_url;
	const avatar_container = jsdom.createElement("div");
	avatar_container.className = "avatar-container";
	avatar_container.appendChild(avatar);
	let msg_chain;
	if (!merge) {
		msg_chain = jsdom.createElement("div");
		msg_chain.className = "msg-chain";
		const msg_wrapper = jsdom.createElement("div");
		msg_wrapper.className = "msg-wrapper";
		const msg_tail = jsdom.createElement("div");
		msg_tail.className = `msg-tail${(from_me) ? "-me" : ""}`;
		if (!img_only) {
			msg_wrapper.appendChild(msg_tail);
		}
		if (from_me) {
			msg_chain.style.float = "right";
			avatar_container.style.float = "right";
			msg_wrapper.style.float = "right";
			msg_wrapper.style.marginLeft = "unset";
			msg_wrapper.style.marginRight = "10px";
		}
		msg_wrapper.appendChild(avatar_container);
		msg_wrapper.appendChild(msg_chain);
		msg_box.appendChild(msg_wrapper);
	}
	else {
		msg_chain = msg_box.getElementsByClassName("msg-wrapper");
		msg_chain = msg_chain[msg_chain.length - 1].getElementsByClassName("msg-chain")[0];
	}
	msg_chain.appendChild(msg_container);

	if (virtual) {
		return msg_box.innerHTML;
	}
	if (hide) {
		msg_box.style.display = "none";
	}
	else {
		msg_box.style.display = "block";
	}

	if (top) {
		scrollMessageBoxToBottom();
	}

	for (const msg_img of msg_container.getElementsByClassName("msg-img")) {
		msg_img.addEventListener("error", lazyImageError);
		msg_img.addEventListener("load", lazyImageLoad);
		msg_img.addEventListener("click", () => send('new-img-window', msg_img.src));
	}
	
}
exports.addNewMessage = addNewMessage;

function insertMessage(html, send) {
	const msg_box = document.getElementById("msg-box");
	const original_bottom = msg_box.scrollHeight - msg_box.scrollTop;
	msg_box.style.scrollBehavior = "unset";
	msg_box.innerHTML = html + msg_box.innerHTML;
	msg_box.scrollTop = msg_box.scrollHeight - original_bottom;
	msg_box.style.scrollBehavior = "smooth";
	for (const msg_img of msg_box.getElementsByClassName("msg-img")) {
		if (msg_img.getAttribute('listener') !== 'true') {
			msg_img.addEventListener("error", lazyImageError);
			msg_img.addEventListener("load", lazyImageLoad);
			msg_img.addEventListener("click", () => send('new-img-window', msg_img.src));
		}
	}
}
exports.insertMessage = insertMessage;

function clearMessage() {
	const msg_box = document.getElementById('msg-box');
	msg_box.innerHTML = "";
	const before_start = document.createElement("div");
	before_start.id = "before-start";
	before_start.style.display = "none";
	before_start.innerText = "Select a chat to start messaging";
	msg_box.appendChild(before_start);
}
exports.clearMessage = clearMessage;

Client.prototype.sendMessage = async function (html, id, group, db, chat_list) {
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
	const cached_send_list = cacheImgSrcFromDom(send_list, this.uin);
	const msg_callback = await user.sendMsg(unescaped_send_list);
	const time = getTime(msg_callback.time);
	const avatar_url = this.getAvatar();
	const raw_message = getRawMessage(send_list);
	const name = this.nickname;
	const search_item = {id: id, group: group, unread: 0};
	const chat_data = chat_list.find(item => compareChat(item, search_item));
	const merge_msg = (chat_data.last_id === this.uin);
	chat_data.last_id = this.uin;
	windowEmit('main', 'set-message', cached_send_list, name, time, true, avatar_url, undefined, undefined, merge_msg);
	windowEmit('main', 'update-chat', id, name, group, time, raw_message, undefined, 0);
	windowEmit('main', 'cache-chat', id, group);
	updateChatListData(db, id, group, "", msg_callback.time, raw_message, name, this.uin);
	dbUpdateUnread(db, id, group, "clear");
	if (!group) {
		dbStoreMessage(db, id, msg_callback.message_id, msg_callback.time, cached_send_list, true);
	}
}

Client.prototype.getHistoryById = async function (id, group, seq) {
	let msgs;
	if (group) {
		const group = new Group(this, id);
		msgs = await group.getChatHistory(seq ? (seq - 1) : undefined, 20);
	}
	else {
		const user = new User(this, id);
		msgs = await user.getChatHistory(seq ? (seq - 1) : undefined, 20);
	}
	const num = msgs.length;
	const names = await Promise.all(msgs.map((msg) => this.getMessageSenderName(msg)));
	return {
		num: num,
		msgs: msgs,
		names: names
	};
};

Client.prototype.syncMessage = async function (db, id, group, chat_list, sync_more = false) {
	let history;
	let search_item = {id: id, group: group, unread: 0};
	let chat_data = chat_list.find(item => compareChat(item, search_item));
	if (chat_data.first_record >= chat_data.top_time) {
		console.log("stop");
		return;
	}
	if (sync_more) {
		if (chat_data?.top_time) {
			history = await this.getHistoryById(id, group, chat_data.top_time);
			if (!history.num) {
				if (!group) {
					const cache_history = await dbReadMessage(db, id, 20, chat_data.top_time);
					if (cache_history) {
						if (!cache_history.length) {
							chat_data.first_record = chat_data.top_time;
							return;
						}
						history.num = cache_history.length;
						history.msgs = [];
						history.names = [];
						for (let i = 0; i < history.num; i ++) {
							const cache = cache_history[i];
							const msg = cache.msg;
							const from_me = (cache.from_me === "true");
							const sender_name = (from_me) ? this.nickname : await this.getName(id);
							const time = cache.time;
							const from_id = (from_me) ? this.uin : id;
							const history_msg = {
								from_id: from_id,
								time: time,
								message: msg
							};
							history.msgs.push(history_msg);
							history.names.push(sender_name);
						}
					}
					else {
						console.log("Database error.");
						return;
					}
				}
				else {
					console.log("No more group messages.");
					chat_data.first_record = chat_data.top_time;
					return;
				}
			}
			let last_id, top_time;
			const { document } = (new JSDOM(`...`)).window;
			const msg_box = document.createElement("div");
			msg_box.id = "msg-box";
			document.body.appendChild(msg_box);
			for (let i = 0; i < history.num; i ++) {
				const msg = history.msgs[i];
				const sender_name = history.names[i];
				const doms = msg.message;
				const time = getTime(msg.time);
				const sender_id = (group) ? (msg.sender.user_id) : (msg.from_id);
				const from_me = (sender_id === this.uin);
				const avatar_url = this.getAvatar(sender_id);
				let merge_msg;
				if (i === 0) {
					merge_msg = false;
					top_time = (group) ? msg.seq : msg.time;
				}
				else {
					merge_msg = (last_id === sender_id);
				}
				last_id = sender_id;
				document.getElementById("msg-box").innerHTML = addNewMessage(doms, sender_name, time, from_me, avatar_url, false, undefined, merge_msg, document);
				if (!group) {
					dbStoreMessage(db, id, msg.message_id, msg.time, doms, from_me);
				}
			}
			windowEmit('main', 'insert-message', document.getElementById("msg-box").innerHTML);
			chat_data.top_time = top_time;
			return;
		}
		else {
			console.log(chat_data);
			return;
		}
	}
	else {
		history = await this.getHistoryById(id, group);
		windowEmit('main', 'clear');
	}
	let top_time, last_cache_time, cache_top_time;
	if (!group) {
		const segments = await dbReadMessage(db, id, 20);
		if (segments) {
			last_cache_time = segments[segments.length - 1].time;
			const name = await this.getName(id);
			for (let i = 0; i < segments.length; i ++) {
				const item = segments[i];
				const time = getTime(item.time);
				const doms = item.msg;
				const from_me = (item.from_me === "true");
				const sender_id = (from_me) ? this.uin : id;
				const avatar_url = this.getAvatar(sender_id);
				const sender_name = (from_me) ? this.nickname : name;
				let merge_msg;
				if (!chat_data) {
					const raw_message = getRawMessage(doms);
					windowEmit('main', 'set-chat', id, name, time, raw_message, sender_name, false, this.getAvatar(id), 0);
					search_item.name = name;
					search_item.last_id = sender_id;
					search_item.top_time = item.time;
					search_item.seq_reserved = cache_top_time;
					chat_list = chat_list.concat([search_item]);
					chat_data = chat_list.find(item => compareChat(item, search_item));
				}
				merge_msg = (chat_data.last_id === sender_id);
				if (i === 0) {
					merge_msg = false;
					cache_top_time = item.time;
				}
				windowEmit('main', 'set-message', doms, sender_name, time, from_me, avatar_url, (i !== segments.length - 1), undefined, merge_msg);
				chat_data.last_id = sender_id;
			}
			windowEmit('main', 'scroll-message', false);
		}
	}
	for (let i = 0; i < history.num; i ++) {
		const msg = history.msgs[i];
		const sender_name = history.names[i];
		const name = (group) ? msg.group_name : sender_name;
		const doms = msg.message;
		const raw_message = removeNewLines(msg.raw_message);
		const time = getTime(msg.time);
		const sender_id = (group) ? (msg.sender.user_id) : (msg.from_id);
		const from_me = (sender_id === this.uin);
		const avatar_url = this.getAvatar(sender_id);
		const group_avatar_url = (group) ? this.getAvatar(id, true) : null;
		if (!chat_data) {
			windowEmit('main', 'set-chat', id, name, time, raw_message, sender_name, group, group_avatar_url ?? avatar_url, 0);
			search_item.name = name;
			search_item.last_id = sender_id;
			search_item.top_time = msg.time;
			search_item.seq_reserved = msg.time;
			chat_list = chat_list.concat([search_item]);
			chat_data = chat_list.find(item => compareChat(item, search_item));
		}
		let merge_msg = (chat_data.last_id === sender_id);
		if (i === 0) {
			merge_msg = false;
			top_time = (group) ? msg.seq : msg.time;
		}
		if (!group && last_cache_time) {
			if (i === 0 && last_cache_time < msg.time) {
				windowEmit('main', 'clear');
			}
			else if (last_cache_time >= msg.time) {
				top_time = cache_top_time;
				chat_data.top_time = top_time;
				chat_data.seq_reserved = top_time;
				continue;
			}
		}
		if (i === (history.num - 1)) {
			windowEmit('main', 'set-message', doms, sender_name, time, from_me, avatar_url, false, undefined, merge_msg);
			windowEmit('main', 'update-chat', id, sender_name, group, time, raw_message, undefined, 0);
			chat_data.unread = 0;
			chat_data.last_id = sender_id;
			chat_data.top_time = top_time;
			chat_data.seq_reserved = top_time;
			updateChatListData(db, id, group, name ?? msg.group_name, msg.time, raw_message, sender_name, sender_id);
		}
		else {
			windowEmit('main', 'set-message', doms, sender_name, time, from_me, avatar_url, true, undefined, merge_msg);
			chat_data.last_id = sender_id;
		}
		if (!group) {
			dbStoreMessage(db, id, msg.message_id, msg.time, doms, from_me);
		}
	}
	windowEmit('main', 'scroll-message', false);
	windowEmit('main', 'cache-chat', id, group);
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
	if (!id) {
		return null;
	}
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
	const in_section = (current_uid === (group_id ?? sender_id));
	if (!msg_is_group) {
		dbStoreMessage(db, sender_id, e.message_id, e.time, e.message, from_me);
	}
	if (in_section) {
		windowEmit('main', 'get-view-height');
		ipcMain.once('is-at-up', (_e, is_at_up) => {
			const search_item = {id: group_id ?? sender_id, name: group_name ?? name, group: msg_is_group, unread: (is_at_up) ? 1 : 0, last_id: sender_id};
			const chat_data = chat_list.find(item => compareChat(item, search_item));
			let merge_msg = false;
			if (!chat_data) {
				windowEmit('main', 'set-chat', group_id ?? sender_id, group_name ?? name, time, e.raw_message, name, msg_is_group, group_avatar_url ?? avatar_url, (is_at_up) ? 1 : 0);
				chat_list = chat_list.concat([search_item]);
			}
			else if (chat_list) {
				windowEmit('main', 'update-chat', group_id ?? sender_id, name, msg_is_group, time, e.raw_message, undefined, (is_at_up) ? 1 : 0);
				if (!is_at_up) {
					chat_data.unread = 0;
				}
				else {
					chat_data.unread ++;
					windowEmit('main', 'set-scroll-unread', chat_data.unread);
				}
				merge_msg = (chat_data.last_id === sender_id);
				chat_data.last_id = sender_id;
			}
			windowEmit('main', 'set-message', e.message, name, time, from_me, avatar_url, undefined, false, merge_msg);
			if (!is_at_up) {
				windowEmit('main', 'scroll-message');
			}
			windowEmit('main', 'cache-chat', group_id ?? sender_id, msg_is_group);
			updateChatListData(db, group_id ?? sender_id, msg_is_group, group_name ?? name, e.time, e.raw_message, name, sender_id);
			dbUpdateUnread(db, group_id ?? sender_id, msg_is_group, (is_at_up) ? "plus" : "clear");
		});
	}
	else {
		const search_item = {id: group_id ?? sender_id, name: group_name ?? name, group: msg_is_group, unread: 1, last_id: sender_id, top_time: (msg_is_group) ? e.seq : e.time, seq_reserved: (msg_is_group) ? e.seq : e.time};
		const chat_data = chat_list.find(item => compareChat(item, search_item));
		if (!chat_data) {
			windowEmit('main', 'set-chat', group_id ?? sender_id, group_name ?? name, time, e.raw_message, name, msg_is_group, group_avatar_url ?? avatar_url, 1);
			chat_list = chat_list.concat([search_item]);
		}
		else if (chat_list) {
			windowEmit('main', 'update-chat', group_id ?? sender_id, name, msg_is_group, time, e.raw_message, undefined, 1);
			chat_data.unread ++;
		}
		updateChatListData(db, group_id ?? sender_id, msg_is_group, group_name ?? name, e.time, e.raw_message, name, sender_id);
		dbUpdateUnread(db, group_id ?? sender_id, msg_is_group, "plus");
	}
}

Client.prototype.syncMessageFromOtherDevice = async function(e, db, current_uid, chat_list) {
	const msg_is_group = (e.message_type === "group");
	const receiver_id = e.to_id ?? null;
	const receiver_name = await this.getName(receiver_id);
	const group_id = (msg_is_group) ? e.group_id : null;
	const time = getTime(e.time);
	const group_name = (msg_is_group) ? e.group_name : null;
	const name = this.nickname;
	const avatar_url = this.getAvatar();
	const receiver_avatar_url = this.getAvatar(receiver_id);
	const group_avatar_url = (msg_is_group) ? this.getAvatar(group_id, true) : null;
	const in_section = (current_uid === (group_id ?? receiver_id));
	const search_item = {id: group_id ?? receiver_id, name: group_name ?? receiver_name, group: msg_is_group, unread: 0, last_id: this.uin};
	const chat_data = chat_list.find(item => compareChat(item, search_item));
	const merge_msg = (chat_data.last_id === this.uin);
	windowEmit('main', 'update-chat', group_id ?? receiver_id, name, msg_is_group, time, e.raw_message, undefined, 0);
	if (in_section) {
		windowEmit('main', 'set-message', e.message, name, time, true, avatar_url, undefined, undefined, merge_msg);
		windowEmit('main', 'cache-chat', group_id ?? receiver_id, msg_is_group);
	}
	if (!chat_data) {
		windowEmit('main', 'set-chat', group_id ?? receiver_id, group_name ?? receiver_name, time, e.raw_message, group_name ?? receiver_name, msg_is_group, group_avatar_url ?? receiver_avatar_url, (in_section) ? 0 : 1);
		chat_list = chat_list.concat([search_item]);
	}
	else if (chat_list) {
		windowEmit('main', 'update-chat', group_id ?? receiver_id, group_name ?? receiver_name, msg_is_group, time, e.raw_message, undefined, (in_section) ? 0 : 1);
		chat_data.unread = 0;
		chat_data.last_id = this.uin;
	}
	updateChatListData(db, group_id ?? receiver_id, msg_is_group, "", e.time, e.raw_message, name, this.uin);
	dbUpdateUnread(db, (group_id ?? receiver_id), msg_is_group, "clear");
	if (!msg_is_group) {
		dbStoreMessage(db, id, e.message_id, e.time, e.message, true);
	}
}

Client.prototype.markRead = function(db, current_uid, group, chat_list) {
	const search_item = {id: current_uid, group: group, unread: 1};
	const chat_data = chat_list.find(item => compareChat(item, search_item));
	if (chat_list && (chat_data?.unread > 0)) {
		chat_data.unread --;
		windowEmit('main', 'update-chat', current_uid, undefined, group, undefined, undefined, undefined, -1);
		dbUpdateUnread(db, current_uid, group, "minus");
	}
}