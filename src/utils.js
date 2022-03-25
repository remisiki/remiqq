const { segment } = require("oicq/lib/message/elements");

function preTime(time) {
	return ("0" + time).slice(-2);
}

function getTime(timestamp, short = true) {
	if (timestamp === 0) {
		return null;
	}
	const date = new Date(timestamp * 1000);
	if (short) {
		return `${preTime(date.getHours())}:${preTime(date.getMinutes())}`;
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
	if (msg_box.scrollHeight - msg_box.scrollTop <= msg.clientHeight + msg_box.clientHeight + 20) {
		msg_box.scrollTop = msg_box.scrollHeight;
	}
}
exports.messageScroll = messageScroll;

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