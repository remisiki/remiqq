const IMG_REGEX = /(<img.*?>)/g;
exports.IMG_REGEX = IMG_REGEX;
const BASE64_REGEX = /.*base64,(.*)/g;
exports.BASE64_REGEX = BASE64_REGEX;
const SRC_REGEX = /src="(.*?)"/g;
exports.SRC_REGEX = SRC_REGEX;
const IS_HTTP_S = /(^https?:\/\/.*)/g;
const IS_BASE64 = /^base64:\/\/(.*)/g;
const BASE64_PREFIX = "data:image/png;base64,";

function extractUrlFromMessage(msg) {
	let img_urls = [];
	let img_count = 0;
	for (const msg_elem of msg.message) {
		if (msg_elem.type === "image") {
			img_urls.push(msg_elem.url ?? null);
			img_count ++;
		}
	}
	const img_only = (img_count === msg.message.length);
	return {
		img_urls: img_urls,
		img_only: img_only
	};
}
exports.extractUrlFromMessage = extractUrlFromMessage;

function splitDomByImg(dom) {
	return String.raw`${dom}`.split(IMG_REGEX).filter(x => x);
}
exports.splitDomByImg = splitDomByImg;

function getBase64FromImg(dom) {
	const src = SRC_REGEX.exec(dom)[1];
	const base64 = BASE64_REGEX.exec(src)[1];
	// Reset regex pointers
	SRC_REGEX.exec("");
	BASE64_REGEX.exec("");
	return String.raw`base64://${base64}`;
}
exports.getBase64FromImg = getBase64FromImg;

function domIsImg(dom) {
	return (dom.match(IMG_REGEX) ? true : false);
}
exports.domIsImg = domIsImg;

function getImgSrcFromSegment(segment) {
	const src = segment.url ?? segment.file;
	const is_http_s = IS_HTTP_S.exec(src);
	const is_base64 = IS_BASE64.exec(src);
	// Reset regex pointers
	IS_HTTP_S.exec("");
	IS_BASE64.exec("");
	if (is_http_s) {
		return src;
	}
	else if (is_base64) {
		return `${BASE64_PREFIX}${is_base64[1]}`;
	}
	else {
		console.log(`Invalid image source ${segment}.`);
		return null;
	}
}
exports.getImgSrcFromSegment = getImgSrcFromSegment;