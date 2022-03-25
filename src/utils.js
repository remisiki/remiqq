const { segment } = require("oicq/lib/message/elements");

function preTime(time) {
	return ("0" + time).slice(-2);
}

function getTime(timestamp, short = true) {
	if (timestamp === 0) {
		return null;
	}
	const date = new Date(timestamp * 1000);
	const now = new Date(Date.now());
	if (short) {
		if (now.getFullYear() === date.getFullYear()) {
			if (now.getMonth() === date.getMonth() && now.getDate() === date.getDate()) {
				return `${preTime(date.getHours())}:${preTime(date.getMinutes())}`;
			}
			else {
				return `${preTime(date.getMonth() + 1)}-${preTime(date.getDate())}`;
			}
		}
		else {
			return `${date.getFullYear()}`;
		}
	}
	else {
		return `${date.getFullYear()}-${preTime(date.getMonth() + 1)}-${preTime(date.getDate())} ${preTime(date.getHours())}:${preTime(date.getMinutes())}:${preTime(date.getSeconds())}`;
	}
}
exports.getTime = getTime;

function unescapeHtml(html) {
	if (html) {
		return html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#36;/g, '$').replace(/&#96;/g, '`').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
	}
	else {
		return null;
	}
}
exports.unescapeHtml = unescapeHtml;

function escapeHtml(html) {
	if (html) {
		return html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\$/g, '&#36;').replace(/`/g, '&#96;').replace(/"/g, '&quot;');
	}
	else {
		return null;
	}
}
exports.escapeHtml = escapeHtml;

function escapeHtmlFromDom(doms) {
	return doms.map(dom => {
		if (dom.type === "text") {
			return segment.text(escapeHtml(dom.text));
		}
		else {
			return dom;
		}
	});
}
exports.escapeHtmlFromDom = escapeHtmlFromDom;

function unescapeHtmlFromDom(doms) {
	return doms.map(dom => {
		if (dom.type === "text") {
			return segment.text(unescapeHtml(dom.text));
		}
		else {
			return dom;
		}
	});
}
exports.unescapeHtmlFromDom = unescapeHtmlFromDom;

function removeSpaces(html) {
	if (html) {
		return html.replace(/&nbsp;/g, ' ').replace(/<br>/g, '');
	}
	else {
		return null;
	}
}
exports.removeSpaces = removeSpaces;

function removeNewLines(str) {
	if (str) {
		return str.replace(/\r/g, "").replace(/\n/g, " ");
	}
	else {
		return null;
	}
}
exports.removeNewLines = removeNewLines;

function compareChat(a, b) {
	return (a.id === b.id) && (a.group === b.group);
}
exports.compareChat = compareChat;

function getRawMessage(msg) {
	return msg.map((segment) => {
		const msg_type = segment.type;
		switch (msg_type) {
			case "text":
				return removeNewLines(segment.text);
			case "image":
				return "[Image]";
			default:
				return `[${msg_type} not supported]`;
		}
	}).reduce((a, b) => (a + b));
}
exports.getRawMessage = getRawMessage;

function messageScroll(msg) {
	const msg_box = document.getElementById("msg-box");
	if (msg_box.scrollHeight - msg_box.scrollTop <= msg.clientHeight + msg_box.clientHeight + 10) {
		msg_box.scrollTop = msg_box.scrollHeight;
	}
}
exports.messageScroll = messageScroll;

function isAtUp() {
	const msg_box = document.getElementById("msg-box");
	return (msg_box.scrollHeight - msg_box.scrollTop > msg_box.clientHeight + 210);
}
exports.isAtUp = isAtUp;

function lazyImageLoad(e) {
	const parent = e.currentTarget.parentNode;
	parent.classList.remove("lazyImageWaiting");
	messageScroll(parent);
}
exports.lazyImageLoad = lazyImageLoad;

function lazyImageError(e) {
	const parent = e.currentTarget.parentNode;
	parent.classList.remove("lazyImageWaiting");
	parent.classList.add("lazyImageError");
	setTimeout(() => {
		parent.classList.add("lazyImageErrorShow");
	}, 10);
}
exports.lazyImageError = lazyImageError;

function scrollMessageBoxToBottom(smooth = true) {
	const msg_box = document.getElementById("msg-box");
	if (!smooth) {
		msg_box.style.scrollBehavior = "unset";
	}
	msg_box.scrollTop = msg_box.scrollHeight;
	if (!smooth) {
		msg_box.style.scrollBehavior = "smooth";
	}
}
exports.scrollMessageBoxToBottom = scrollMessageBoxToBottom;

function cacheUnread(unread) {
	window.sessionStorage.setItem('unread', unread);
}
exports.cacheUnread = cacheUnread;

function decreaseUnread() {
	const unread = window.sessionStorage.getItem('unread');
	window.sessionStorage.setItem('unread', unread - 1);
	const arrow_unread = document.getElementsByClassName("arrow-unread")[0];
	if (unread <= 1) {
		arrow_unread.classList.remove("arrow-down");
		document.getElementsByClassName("arrow-container")[0].classList.remove("arrow-down");
		arrow_unread.innerText = "";
	}
	else {
		arrow_unread.innerText = unread - 1;
	}
}
exports.decreaseUnread = decreaseUnread;