const fs = require('fs');
const sqlite3 = require("sqlite3");

function updateChatListData(db, id, group, name = "", timestamp, last_message) {
	let query;
	last_message = last_message.replace(/"/g, "&quot;");
	if (!name) {
		query = `update "${(group) ? "group" : "private"}"
			set 
				time = ${timestamp}, 
				last = "${last_message}"
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
				last
			) 
			values
			(
				${id}, 
				"${name}", 
				${timestamp}, 
				"${last_message}"
			) 
			on conflict(id) 
				do 
					update set 
						name = "${name}", 
						time = ${timestamp}, 
						last = "${last_message}"
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
			'seq integer, ' +
			'last text)');
		db.run('create table if not exists group(' + 
			'id integer not null unique, ' + 
			'name text, ' + 
			'time integer, ' +
			'seq integer, ' +
			'last text)');
	}

	return db;
}
exports.dbInit = dbInit;