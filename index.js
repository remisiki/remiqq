"use strict"

require("./App");
require('dotenv').config();

const { sendMessage, getHistory } = require("./src/message");
const { contextBridge, ipcMain, BrowserWindow } = require('electron');
const { createClient, User } = require("oicq");
const { runJS } = require("./src/window");
const account = 2871789759
const bot = createClient(account)

if (require.main === module) {
	const my_id = 2635799987;
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
		const name = await bot.getMessageSenderName(e);
		runJS(`window.api.setNewMessage("${name} - ${e.raw_message}");`);
		// mainWindow.webContents.executeJavaScript(`window.api.getValue("#h11");`)
		// 	.then((value) => {
		// 		console.log(value);
		// 	});
		// e.sender.send('invokeReceive', e.raw_message);
		// receiveMessage(e.raw_message);
		// e.reply("hello world", true) //true表示引用对方的消息
	})
	.on("system.online", e => {
		bot.syncMessage(my_id);
	})
	.login(process.env.SUB_PASSWORD_KEY);

	ipcMain.on("send-message", (e, args) => bot.sendMessage(...args));

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