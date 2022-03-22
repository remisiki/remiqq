const fs = require('fs');
const sqlite3 = require("sqlite3");

function updateChatListData(db, id, group, name = "", timestamp, last_message, last_name) {
	let query;
	name = name.replace(/"/g, "&quot;");
	last_message = last_message.replace(/"/g, "&quot;");
	last_name = last_name.replace(/"/g, "&quot;");
	if (!name) {
		query = `update "${(group) ? "group" : "private"}"
			set 
				time = ${timestamp}, 
				last = "${last_message}",
				last_name = "${last_name}"
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
				last_name
			) 
			values
			(
				${id}, 
				"${name}", 
				${timestamp}, 
				"${last_message}",
				"${last_name}"
			) 
			on conflict(id) 
				do 
					update set 
						name = "${name}", 
						time = ${timestamp}, 
						last = "${last_message}",
						last_name = "${last_name}"
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
		    resolve(JSON.parse(JSON.stringify(rows)));
	    });
	});
}
exports.dbQueryResultSet = dbQueryResultSet;

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
			'last_name text)');
		db.run('create table if not exists group(' + 
			'id integer not null unique, ' + 
			'name text, ' + 
			'time integer, ' +
			'last text, ' +
			'unread integer default 0, ' +
			'last_name text)');
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
	else if (type === "plus") {
		query = `
			select "unread" from "${(group) ? "group" : "private"}"
			where
				id = ${id}
			;
		`;
		let count = await dbQueryResultSet(db, query);
		count = count[0].unread ?? 0;
		count ++;
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