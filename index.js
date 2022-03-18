"use strict"

require("./App");
require('dotenv').config();
require("./src/chat");

const { sendMessage, getHistory } = require("./src/message");
const { getTime } = require("./src/utils");
const { contextBridge, ipcMain, BrowserWindow } = require('electron');
const { createClient, User } = require("oicq");
const core = require("oicq/lib/core");
const { runJS } = require("./src/window");
const account = 2871789759
const config = {
	platform: core.Platform.iPad
}
// "Android";
// "aPad";
// "Watch";
// "iMac";
// "iPad";
const bot = createClient(account, config);

if (require.main === module) {
	const my_id = 2635799987;
	let current_uid;
	let my_avatar_url;
	let my_name;
	// const me = new User(bot, 2635799987);

	const readline = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	})


	bot
		// .on("system.login.qrcode", function (e) {
		// 	this.logger.mark("扫码后按Enter完成登录")
		// 	process.stdin.once("data", () => {
		// 		this.login()
		// 	})
		// })
		.on("message", async e => {
			const sender_id = e.from_id;
			if (current_uid !== sender_id) {
				return;
			}
			const name = await bot.getMessageSenderName(e);
			const time = getTime(e.time);
			const from_me = (sender_id === bot.uin);
			const avatar_url = bot.getAvatar(sender_id);
			runJS(`window.api.setNewMessage("${e.raw_message}", "${name}", "${time}", ${from_me}, "${avatar_url}");`);
			// mainWindow.webContents.executeJavaScript(`window.api.getValue("#h11");`)
			// 	.then((value) => {
			// 		console.log(value);
			// 	});
			// e.sender.send('invokeReceive', e.raw_message);
			// addNewMessage(e.raw_message);
			// e.reply("hello world", true) //true表示引用对方的消息
		})
		.on("system.online", e => {
			// bot.syncMessage(my_id);
		})
		.on("sync.message", e => {
			const receiver_id = e.to_id;
			if (current_uid !== receiver_id) {
				return;
			}
			const time = getTime(e.time);
			runJS(`window.api.setNewMessage("${e.raw_message}", "${my_name}", "${time}", true, "${my_avatar_url}");`);
		})
		.login(process.env.SUB_PASSWORD_KEY);

	ipcMain.on("send-message", (e, args) => bot.sendMessage(...args));
	ipcMain.on("sync-message", (e, id) => {
		bot.syncMessage(id);
		current_uid = id;
	});
	ipcMain.on("set-name", (e) => {
		my_name = bot.nickname;
	});
	ipcMain.on("set-avatar", (e) => {
		// Set my avatar
		my_avatar_url = bot.getAvatar();
		runJS(`window.api.getMyAvatar("${my_avatar_url}");`);
		// Set all chat list avatar
		db.all("select * from chat", (err, rows) => {
		    bot.addChatList(JSON.parse(JSON.stringify(rows)));
	    });
	});

	const sqlite3 = require("sqlite3");
	const fs = require('fs');
	const dbFile = `./data/${account}/data.db`;
	const dbExists = fs.existsSync(dbFile);
	const db = new sqlite3.Database(dbFile);

	if (!dbExists) {
		db.run('create table if not exists chat(' + 
			'id integer not null unique, ' + 
			'name text, ' + 
			'last integer)');
	}


	// template plugins
	// require("./plugin-hello") //hello world
	// require("./plugin-image") //发送图文和表情
	// require("./plugin-request") //加群和好友
	// require("./plugin-online") //监听上线事件

	process.on("unhandledRejection", (reason, promise) => {
		console.log('Unhandled Rejection at:', promise, 'reason:', reason)
	})
}

exports.bot = bot