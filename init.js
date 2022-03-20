function handlepaste(e) {
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
			const pastedDom = new DOMParser().parseFromString(pastedData, "text/html");
			const doms = pastedDom.documentElement.getElementsByTagName("body")[0].children;
			let plain_msg = "";
			for (const dom of doms) {
				plain_msg += `${dom.textContent}\n`;
			}
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

function handleKey(e) {
	if (e.keyCode == 13) {
		if (e.ctrlKey) {
			if (window.getSelection) {
				const selection = window.getSelection(),
					range = selection.getRangeAt(0),
					newline = document.createTextNode("\u000a");
					space = document.createTextNode("\u00a0");
				range.deleteContents();
				range.insertNode(newline);
				range.collapse(false);
				range.insertNode(space);
				range.selectNodeContents(space);

				selection.removeAllRanges();
				selection.addRange(range);
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

document.getElementById("send-box").addEventListener('paste', handlepaste, false);
document.getElementById("send-box").onkeydown = (e) => handleKey(e);
document.getElementById("send-btn").addEventListener("click",
	() => window.api.sendMessage());