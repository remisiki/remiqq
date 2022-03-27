const fs = require('fs');
const sqlite3 = require("sqlite3");

function updateChatListData(db, id, group, name = "", timestamp, last_message, last_name, last_id) {
	let query;
	const _name = name.replace(/"/g, "&quot;");
	const _last_message = last_message.replace(/"/g, "&quot;");
	const _last_name = last_name.replace(/"/g, "&quot;");
	if (!_name) {
		query = `update "${(group) ? "group" : "private"}"
			set 
				time = ${timestamp}, 
				last = "${_last_message}",
				last_name = "${_last_name}",
				last_id = ${last_id}
			where
				id = ${id}
			;`;
	}
	else {
		query = `insert into "${(group) ? "group" : "private"}"
			(
				id, 
				name, 
				time, 
				last,
				last_name,
				last_id
			) 
			values
			(
				${id}, 
				"${_name}", 
				${timestamp}, 
				"${_last_message}",
				"${_last_name}",
				${last_id}
			) 
			on conflict(id) 
				do 
					update set 
						name = "${_name}", 
						time = ${timestamp}, 
						last = "${_last_message}",
						last_name = "${_last_name}",
						last_id = ${last_id}
			;`;
	}
	db.run(query);
}
exports.updateChatListData = updateChatListData;

function dbQueryResultSet(db, query) {
	return new Promise((resolve, reject) => {
		db.all(query, (err, rows) => {
		    if (err) {
		    	reject(err);
		    }
		    try {
			    resolve(JSON.parse(JSON.stringify(rows)));
			}
			catch (e) {
				reject(e);
			}
	    });
	});
}
exports.dbQueryResultSet = dbQueryResultSet;

function dbQuery(db, query) {
	return new Promise((resolve, reject) => {
		db.all(query, (err) => {
		    if (err) {
		    	reject(err);
		    }
		    resolve(true);
	    });
	});
}
exports.dbQuery = dbQuery;

function dbInit(account) {
	const dbFile = `./data/${account}/data.db`;
	const dbExists = fs.existsSync(dbFile);
	const db = new sqlite3.Database(dbFile);

	if (!dbExists) {
		db.run('create table if not exists private(' + 
			'id integer not null unique, ' + 
			'name text, ' + 
			'time integer, ' +
			'last text, ' +
			'unread integer default 0, ' +
			'last_name text, ' +
			'last_id integer)');
		db.run('create table if not exists group(' + 
			'id integer not null unique, ' + 
			'name text, ' + 
			'time integer, ' +
			'last text, ' +
			'unread integer default 0, ' +
			'last_name text, ' +
			'last_id integer)');
	}

	return db;
}
exports.dbInit = dbInit;

async function dbUpdateUnread(db, id, group, type = "clear") {
	let query;
	if (type === "clear") {
		query = `
			update "${(group) ? "group" : "private"}"
			set 
				unread = 0
			where
				id = ${id}
			;
		`;
	}
	else if (type === "plus" || type === "minus") {
		query = `
			select "unread" from "${(group) ? "group" : "private"}"
			where
				id = ${id}
			;
		`;
		let count = await dbQueryResultSet(db, query);
		count = count[0].unread ?? 0;
		if (type === "plus") {
			count ++;
		}
		else if (count > 0) {
			count --;
		}
		else {
			return;
		}
		query = `
			update "${(group) ? "group" : "private"}"
			set 
				unread = ${count}
			where
				id = ${id}
			;
		`;
	}
	db.run(query);
}
exports.dbUpdateUnread = dbUpdateUnread;

function dbStoreMessage(db, id, msg_id, time, segments, from_me) {
	const raw_message = JSON.stringify(segments).replace(/"/g, "&quot;");
	db.serialize(() => {
	    db.run(`
				create table if not exists "${id}"(
					msg_id text not null unique,  
					time integer, 
					msg text,
					from_me bit
				);
			`);
	    db.run(`
	    		insert or replace into "${id}" 
	    		values(
	    			"${msg_id}", 
	    			${time}, 
	    			"${raw_message}",
	    			"${from_me}"
	    		) 
	    	`);
	});
}
exports.dbStoreMessage = dbStoreMessage;

async function dbReadMessage(db, id, num, time) {
	let query;
	if (!num) {
		query = `
			select * from "${id}"
			order by "time" desc
		`;
	}
	else {
		query = `
			select * from "${id}" 
			${(time) ? `where "time" < ${time}` : ""} 
			order by "time" desc 
			limit ${num}
		`;
	}
	try {
		let result = await dbQueryResultSet(db, query);
		for (let i = 0; i < result.length; i ++) {
			result[i].msg = JSON.parse(result[i].msg.replace(/&quot;/g, '\"'));
		}
		return result.reverse();
	}
	catch (e) {
		console.log(e);
		return null;
	}
}
exports.dbReadMessage = dbReadMessage;