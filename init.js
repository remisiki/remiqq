const IMG_REGEX = /(<img.*?>)/g;
const BASE64_REGEX = /.*base64,(.*)/g;
const SRC_REGEX = /src="(.*?)"/g;
const IS_HTTP_S = /(^https?:\/\/.*)/g;
const IS_BASE64 = /^base64:\/\/(.*)/g;
const BASE64_PREFIX = "data:image/png;base64,";

function htmlToPlainText(html) {
	const pastedDom = new DOMParser().parseFromString(html, "text/html");
	const doms = pastedDom.documentElement.getElementsByTagName("body")[0].children;
	let plain_msg = "";
	for (const dom of doms) {
		plain_msg += `${dom.textContent}\n`;
	}
	return plain_msg;
}

function handlePaste(e) {
	var types, pastedData, savedContent;

	// Browsers that support the 'text/html' type in the Clipboard API (Chrome, Firefox 22+)
	if (e && e.clipboardData && e.clipboardData.types && e.clipboardData.getData) {

	// Check for 'text/html' in types list. See abligh's answer below for deatils on
	// why the DOMStringList bit is needed. We cannot fall back to 'text/plain' as
	// Safari/Edge don't advertise HTML data even if it is available
		types = e.clipboardData.types;
		if (((types instanceof DOMStringList) && types.contains("text/html")) || (types.indexOf && types.indexOf('text/html') !== -1)) {

			// Extract data and pass it to callback
			pastedData = e.clipboardData.getData('text/html');
			const plain_msg = htmlToPlainText(pastedData);
			insertTextAtCaret(plain_msg);

			// Stop the data from actually being pasted
			e.stopPropagation();
			e.preventDefault();
			return false;
		}
	}

	return true;

	// Everything else: Move existing element contents to a DocumentFragment for safekeeping
	// savedContent = document.createDocumentFragment();
	// while (editableDiv.childNodes.length > 0) {
	//   savedContent.appendChild(editableDiv.childNodes[0]);
	// }

	// // Then wait for browser to paste content into it and cleanup
	// waitForPastedData(editableDiv, savedContent);
	// return true;
}

function insertTextAtCaret(text) {
    var sel, range;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode( document.createTextNode(text) );
        }
    } else if (document.selection && document.selection.createRange) {
        document.selection.createRange().text = text;
    }
}

function handleDrop(e) {
	e.preventDefault();
	const content = e.dataTransfer.getData('text');
	if (isImgSrc(content)) {
		document.getElementById("send-box").innerHTML += imgSrcToDom(content);
	}
	else {
		document.getElementById("send-box").innerHTML += escapeHtml(content);
	}
}

function handleKey(e) {
	if (e.keyCode == 13) {
		if (e.ctrlKey) {
			if (window.getSelection) {
				let selection = window.getSelection(),
					range = selection.getRangeAt(0),
					newline = document.createTextNode("\u000d\u000a");
					space = document.createTextNode("\u00a0");
					// space = document.createTextNode("\u000d");
				selection.modify("extend", "right", "line");
				range = selection.getRangeAt(0);
				// if (range.toString() == " ") {
				// 	range.deleteContents();
				// }

				range.deleteContents();
				range.insertNode(newline);
				range.collapse(false);
				range.insertNode(space);
				// range.selectNodeContents(space);

				selection.removeAllRanges();
				selection.addRange(range);
				// selection.modify("move", "right", "line");
				selection.modify("move", "left", "character");
				return false;
			}
		}
		else {
			window.api.sendMessage();
			return false;
		}
	}
	else if (e.keyCode == 8) {
		// const send_box = document.getElementById("send-box");
		// send_box.removeChild(send_box.getElementsByTagName("br")[0]);
		// $('#send-box').find('br').remove();
	}
}

function isImgSrc(str) {
	const is_http_s = IS_HTTP_S.exec(str);
	const is_base64 = IS_BASE64.exec(str);
	// Reset regex pointers
	IS_HTTP_S.exec("");
	IS_BASE64.exec("");
	return (is_http_s || is_base64);
}

function imgSrcToDom(src) {
	return `<img src="${src}" />`;
}

function escapeHtml(html) {
	return html.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\$/g, '&#36;').replace(/`/g, '&#96;');
}

document.getElementById("send-box").addEventListener('paste', handlePaste, false);
document.getElementById("send-box").addEventListener('drop', handleDrop);
document.getElementById("send-box").addEventListener('dragover', (e) => {
	e.dataTransfer.setData('text', 'copy');
	e.dataTransfer.effectAllowed = 'copy';
});
document.getElementById("send-box").onkeydown = (e) => handleKey(e);
document.getElementById("send-btn").addEventListener("click",
	() => window.api.sendMessage());