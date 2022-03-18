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