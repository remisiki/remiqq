const { segment } = require("oicq/lib/message/elements");

function preTime(time) {
	return ("0" + time).slice(-2);
}

function getTime(timestamp, short = true) {
	const date = new Date(timestamp * 1000);
	if (short) {
		return `${preTime(date.getHours())}:${preTime(date.getMinutes())}`;
	}
	else {
		return `${date.getFullYear()}-${preTime(date.getMonth())}-${preTime(date.getDate())} ${preTime(date.getHours())}:${preTime(date.getMinutes())}:${preTime(date.getSeconds())}`;
	}
}
exports.getTime = getTime;

function unescapeHtml(html) {
	return html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#36;/g, '$').replace(/&#96;/g, '`');
}
exports.unescapeHtml = unescapeHtml;

function escapeHtml(html) {
	return html.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\$/g, '&#36;').replace(/`/g, '&#96;');
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
	return html.replace(/&nbsp;/g, ' ').replace(/<br>/g, '');
}
exports.removeSpaces = removeSpaces;