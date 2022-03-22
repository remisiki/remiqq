"use strict"

require("./App");
require('dotenv').config();
require("./src/chat");

const { sendMessage, getHistory } = require("./src/message");
const { getTime, escapeHtmlFromDom, compareChat } = require("./src/utils");
const { extractUrlFromMessage } = require("./src/image");
const { contextBridge, ipcMain, BrowserWindow } = require('electron');
const { createClient, User } = require("oicq");
const core = require("oicq/lib/core");
const { windowEmit } = require("./src/window");
const { dbQueryResultSet, dbInit } = require("./src/sqlite");
// const account = 2871789759;
const account = 2635799987;
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
	let current_uid;
	let current_is_group;
	let my_avatar_url;
	let my_name;
	let chat_list = [];
	// const me = new User(bot, 2635799987);

	const readline = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	})

	bot
		// .login(process.env.SUB_PASSWORD_KEY);
		.login(process.env.PASSWORD_KEY);

	ipcMain.on("send-message", (e, html) => bot.sendMessage(html, current_uid, current_is_group, db));
	ipcMain.on("sync-message", (e, args) => {
		bot.syncMessage(db, ...args);
		current_uid = args[0];
		current_is_group = args[1];
	});
	ipcMain.on("set-name", (e) => {
		my_name = bot.nickname;
	});
	ipcMain.on("set-avatar", async (e) => {
		let chat_list_private;
		let chat_list_group;
		// Set my avatar
		my_avatar_url = bot.getAvatar();
		windowEmit('set-my-avatar', my_avatar_url);
		// Set all chat list avatar
		try {
			chat_list = chat_list.concat(
				bot.addChatList(
					await dbQueryResultSet(db, `select * from "private"`), 
					false
				), 
				bot.addChatList(
					await dbQueryResultSet(db, `select * from "group"`), 
					true
				)
			);
		}
		catch (e) {
			console.log(e);
		}
		bot
			// .on("system.login.qrcode", function (e) {
			// 	this.logger.mark("扫码后按Enter完成登录")
			// 	process.stdin.once("data", () => {
			// 		this.login()
			// 	})
			// })
			.on("message", async e => {
				const new_chat = await bot.handleMessage(e, db, current_uid, chat_list);
				if (new_chat) {
					chat_list = chat_list.concat([new_chat]);
				}
			})
			.on("system.online", e => {
				// bot.syncMessage(my_id);
			})
			.on("sync.message", e => {
				bot.syncMessageFromOtherDevice(e, db, current_uid);
			})
			.on("sync.read", e => {
				console.log(e);
			});
	});

	const db = dbInit(account);

	process.on("unhandledRejection", (reason, promise) => {
		console.log('Unhandled Rejection at:', promise, 'reason:', reason)
	})
}

exports.bot = bot