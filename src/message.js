const { User, Group } = require("oicq");
const { segment } = require("oicq/lib/message/elements");
const { Client } = require("oicq");
const { runJS } = require("./window");
const { getTime, unescapeHtml, escapeHtml, escapeHtmlFromDom, unescapeHtmlFromDom, removeSpaces } = require("./utils");
const { IMG_REGEX, BASE64_REGEX, SRC_REGEX, extractUrlFromMessage, splitDomByImg, getBase64FromImg, domIsImg, getImgSrcFromSegment } = require("./image");
const jsdom = require("jsdom");

const editText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) {
    	element.innerText = text;
    }
}

function addNewMessage(doms, name = null, time = null, from_me = false, avatar_url = null, img_urls = [], img_only = false) {

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
				msg_container.appendChild(msg_img);
				break;
			default:
				msg_container.innerHTML += (`[${dom.type} not supported]`);
		}
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
	msg_box.appendChild(msg_wrapper);
	msg_box.appendChild(msg_gap_bottom);
	msg_box.scrollTop = msg_box.scrollHeight;
}
exports.addNewMessage = addNewMessage;

function clearMessage() {
	const msg_box = document.querySelector('#msg-box');
	msg_box.innerHTML = "";
	const msg_gap_top_0 = document.createElement("div");
	const msg_gap_top_1 = document.createElement("div");
	msg_gap_top_0.className = "gap";
	msg_gap_top_1.className = "gap";
	msg_box.appendChild(msg_gap_top_0);
	msg_box.appendChild(msg_gap_top_1);
}
exports.clearMessage = clearMessage;

Client.prototype.sendMessage = async function (html, id) {
	if (!html) return;
	const user = new User(this, id);
	const doms = splitDomByImg(html);
	const send_list = doms.map(dom => {
		dom = removeSpaces(dom);
		if (domIsImg(dom)) {
			try {
				const sendable_img = getBase64FromImg(dom);
				return segment.image(sendable_img);
			}
			catch (e) {
				return segment.text(dom);
			}
		}
		else {
			return segment.text(dom);
		}
	});
	const unescaped_send_list = unescapeHtmlFromDom(send_list);
	const escaped_send_list = escapeHtmlFromDom(send_list);
	const msg_callback = await user.sendMsg(unescaped_send_list);
	const time = getTime(msg_callback.time);
	const avatar_url = this.getAvatar();
	runJS(`window.api.setNewMessage(String.raw\`${JSON.stringify(escaped_send_list)}\`, "${this.nickname}", "${time}", true, "${avatar_url}");`);
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

Client.prototype.syncMessage = async function (id, group) {
	const history = await this.getHistoryById(id, group);
	runJS(`window.api.clearMessage();`);
	for (let i = 0; i < history.num; i ++) {
		// console.log(history.msgs[i]);
		const name = history.names[i];
		const msg = history.msgs[i].raw_message;
		const time = getTime(history.msgs[i].time);
		const sender_id = (group) ? (history.msgs[i].sender.user_id) : (history.msgs[i].from_id);
		const from_me = (sender_id === this.uin);
		const avatar_url = this.getAvatar(sender_id);
		const img_urls_result = extractUrlFromMessage(history.msgs[i]);
		const img_urls = img_urls_result.img_urls;
		const img_only = img_urls_result.img_only;
		const doms = history.msgs[i].message;
		const escaped_doms = escapeHtmlFromDom(doms);
		runJS(`window.api.setNewMessage(String.raw\`${JSON.stringify(escaped_doms)}\`, "${name}", "${time}", ${from_me}, "${avatar_url}", ${JSON.stringify(img_urls)}, ${img_only});`);
	}
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