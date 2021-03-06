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
const { windowEmit, imgWindow } = require("./src/window");
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
	let loading_history = false;
	// const me = new User(bot, 2635799987);

	const readline = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	})

	bot
		// .login(process.env.SUB_PASSWORD_KEY);
		.login(process.env.PASSWORD_KEY);

	ipcMain.on("send-message", (e, html) => bot.sendMessage(html, current_uid, current_is_group, db, chat_list));
	ipcMain.on("mark-read", (e) => {
		bot.markRead(db, current_uid, current_is_group, chat_list);
	});
	ipcMain.on("sync-message", (e, args) => {
		windowEmit('main', 'check-cache', ...args);
		current_uid = args[0];
		current_is_group = args[1];
		ipcMain.once('is-cached', async (_e, is_cached) => {
			const search_item = {id: current_uid, group: current_is_group};
			const chat_data = chat_list.find(item => compareChat(item, search_item));
			const unread = chat_data.unread;
			const name = chat_data.name;
			windowEmit('main', 'set-chat-name', name);
			if (!is_cached || unread) {
				bot.syncMessage(db, ...args, chat_list);
			}
			else {
				windowEmit('main', 'fetch-cache', ...args);
				for (const chat of chat_list) {
					chat.top_time = chat.seq_reserved;
				}
			}
		});
	});
	ipcMain.on('sync-message-more', async (e) => {
		if (loading_history) {
			console.log("Rejected");
			return;
		}
		loading_history = true;
		await bot.syncMessage(db, current_uid, current_is_group, chat_list, true);
		loading_history = false;
	})
	ipcMain.on("set-name", (e) => {
		my_name = bot.nickname;
	});
	ipcMain.on("set-avatar", async (e) => {
		let chat_list_private;
		let chat_list_group;
		// Set my avatar
		my_avatar_url = bot.getAvatar();
		windowEmit('main', 'set-my-avatar', my_avatar_url);
		// Set all chat list avatar
		try {
			chat_list = chat_list.concat(
				bot.addChatList(
					await dbQueryResultSet(db, `
							select "private".*, "private" as "src" from "private"
							union all
							select "group".*, "group" as "src" from "group"
							order by "time" asc
						`)
				)
			);
		}
		catch (e) {
			console.log(e);
		}
		bot
			// .on("system.login.qrcode", function (e) {
			// 	this.logger.mark("????????????Enter????????????")
			// 	process.stdin.once("data", () => {
			// 		this.login()
			// 	})
			// })
			.on("message", e => {
				bot.handleMessage(e, db, current_uid, chat_list);
			})
			.on("system.online", e => {
				// bot.syncMessage(my_id);
			})
			.on("sync.message", e => {
				bot.syncMessageFromOtherDevice(e, db, current_uid, chat_list);
			})
			.on("sync.read", e => {
				console.log(e);
			});
	});
	ipcMain.on('new-img-window', (e, src) => {
		imgWindow(src);
	});

	const db = dbInit(account);

	process.on("unhandledRejection", (reason, promise) => {
		console.log('Unhandled Rejection at:', promise, 'reason:', reason)
	})
}

exports.bot = bot