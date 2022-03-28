const IMG_REGEX = /(<img.*?>)/g;
const BASE64_REGEX = /.*base64,(.*)/g;
const SRC_REGEX = /src="(.*?)"/g;
const IS_HTTP_S = /(^https?:\/\/.*)/g;
const IS_BASE64 = /^data:image\/.*;base64,(.*)/g;
const IS_SENDABLE_BASE64 = /^base64:\/\/(.*)/g;
const IS_FILE = /^file:\/\/.*/g;
const BASE64_PREFIX = "data:image/png;base64,";
const BASE64_SENDABLE_PREFIX = "base64://";
const FILE_PREFIX = "file://";

const { unescapeHtml, setRandCacheName } = require("./utils");
const { imgWindow } = require("./window");
const path = require('path');
const fs = require('fs');
const { segment } = require("oicq/lib/message/elements");
const { JSDOM } = require('jsdom');

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
	return dom.split(IMG_REGEX).filter(x => x);
}
exports.splitDomByImg = splitDomByImg;

function getBase64FromImg(dom) {
	const src = SRC_REGEX.exec(dom)[1];
	const base64 = BASE64_REGEX.exec(src)[1];
	// Reset regex pointers
	SRC_REGEX.exec("");
	BASE64_REGEX.exec("");
	return String.raw`${BASE64_SENDABLE_PREFIX}${base64}`;
}
exports.getBase64FromImg = getBase64FromImg;

function domIsImg(dom) {
	return (dom.match(IMG_REGEX) ? true : false);
}
exports.domIsImg = domIsImg;

function getImgSrcFromSegment(segment) {
	const src = segment.url ?? segment.file;
	const is_http_s = IS_HTTP_S.exec(src);
	const is_base64 = IS_SENDABLE_BASE64.exec(src);
	const is_file = IS_FILE.exec(src);
	// Reset regex pointers
	IS_HTTP_S.exec("");
	IS_SENDABLE_BASE64.exec("");
	IS_FILE.exec("");
	if (is_http_s || is_file) {
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

function fsRead(path) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, (err, buffer) => {
		    if (err) {
		    	reject(err);
		    }
		    resolve(buffer);
	    });
	});
}

function createFileFromBase64(base64, id) {
    const buffer = createBufferFromBase64(base64);
    let file_name = `data/${id}/cache`;
    if (!fs.existsSync(file_name)){
	    fs.mkdirSync(file_name, { recursive: true });
	}
	file_name = path.join(file_name, setRandCacheName());
    fs.createWriteStream(file_name).write(buffer);
    file_name = path.resolve(file_name);
    return file_name;
};

function createBufferFromBase64(base64) {
	const bin = atob(base64);
    let buffer = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i ++) {
        buffer[i] = bin.charCodeAt(i);
    }
    buffer = Buffer.from(buffer.buffer);
    return buffer;
}

function getImgSrcFromDom(dom) {
	let src = SRC_REGEX.exec(dom);
	SRC_REGEX.exec("");
	if (!src) {
		throw new Error(`Image without source ${dom}.`);
	}
	src = src[1];
	const is_http_s = IS_HTTP_S.exec(src);
	const is_base64 = IS_BASE64.exec(src);
	IS_HTTP_S.exec("");
	IS_BASE64.exec("");
	if (is_http_s) {
		return `${unescapeHtml(src)}`;
	}
	else if (is_base64) {
		return `${BASE64_SENDABLE_PREFIX}${is_base64[1]}`;
	}
	else {
		throw new Error(`Invalid image source ${dom}.`);
	}
}
exports.getImgSrcFromDom = getImgSrcFromDom;

function cacheImgSrcFromDom(doms, id) {
	return doms.map(dom => {
		if (dom.type === "image") {
			const is_base64 = IS_SENDABLE_BASE64.exec(dom.file);
			IS_SENDABLE_BASE64.exec("");
			if (is_base64) {
				const cache_path = `${FILE_PREFIX}${createFileFromBase64(is_base64[1], id)}`;
				return segment.image(cache_path);
			}
			else {
				return dom;
			}
		}
		else {
			return dom;
		}
	});
}
exports.cacheImgSrcFromDom = cacheImgSrcFromDom;

function getImgUrlFromSrc(src) {
	const is_http_s = IS_HTTP_S.exec(src);
	const is_base64 = IS_BASE64.exec(src);
	const is_file = IS_FILE.exec(src);
	IS_HTTP_S.exec("");
	IS_BASE64.exec("");
	IS_FILE.exec("");
	if (is_http_s || is_file) {
		return `${unescapeHtml(src)}`;
	}
	else if (is_base64) {
		return `${BASE64_SENDABLE_PREFIX}${unescapeHtml(is_base64[1])}`;
	}
	else {
		throw new Error(`Invalid image source ${dom}.`);
	}
}
exports.getImgUrlFromSrc = getImgUrlFromSrc;

function isImgSrc(str) {
	const is_http_s = IS_HTTP_S.exec(str);
	const is_base64 = IS_BASE64.exec(str);
	// Reset regex pointers
	IS_HTTP_S.exec("");
	IS_BASE64.exec("");
	return (is_http_s || is_base64);
}
exports.isImgSrc = isImgSrc;

function isHttp(str) {
	const is_http_s = IS_HTTP_S.exec(str);
	IS_HTTP_S.exec("");
	return (is_http_s) ? true : false;
}

function isBase64(str) {
	const is_base64 = IS_BASE64.exec(str);
	IS_BASE64.exec("");
	return (is_base64) ? true : false;
}

function isFile(str) {
	const is_file = IS_FILE.exec(str);
	IS_FILE.exec("");
	return (is_file) ? true : false;
}

function imgSrcToDom(src) {
	return `<img src="${src}" />`;
}
exports.imgSrcToDom = imgSrcToDom;

async function getBase64FromUrl(src) {
	var request = require('request').defaults({ encoding: null });
	let base64_data;
	await request.get(src, (error, response, body) => {
	    if (!error && response.statusCode == 200) {
	        base64_data = "data:" + response.headers["content-type"] + ";base64," + Buffer.from(body).toString('base64');
	    }
	});
	return base64_data;
}
exports.getBase64FromUrl = getBase64FromUrl;

async function getBufferFromUrl(src) {
	let buffer;
	if (isHttp(src)) {
		const axios = require('axios');
		const response = await axios.get(src, {responseType: 'arraybuffer'});
		buffer = Buffer.from(response.data, "utf-8");
	}
	else if (isBase64(src)) {
		buffer = createBufferFromBase64(src);
	}
	else if (isFile(src)) {
		console.log(src);
		buffer = await fsRead(src.replace(FILE_PREFIX, ''));
	}
	return buffer;
}
exports.getBufferFromUrl = getBufferFromUrl;