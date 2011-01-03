**node-mysql-oil**  
*(a slick api on top [node-mysql](https://github.com/felixge/node-mysql))*

Oil makes SQL more *JavaScripty* by transforming JavaScript structures into SQL statements.

For example, this:

	var db = require('mysql-oil').connect({db:'db_demo'});
	db({
		insert_into: 't_test',
		values:{
			c_user: 'root',
			c_pass: 'pass',
			c_uid: 501
		}
	});

Instead of this:

	var MySQLClient = require('mysql').Client;
	var db = new MySQLClient({user:'root', database:'db_demo'});
	db.connect();
	db.query(
		'insert into t_test '+
		'(c_user, c_pass, c_uid) '+
		'values ("root", "pass", 501)'
	);

JavaScript Strings, Numbers, Booleans and Dates are automatically marshaled into their SQL form.

See `test/test.js` for examples of API usage. Most everything is there: raw SQL support (for creating and dropping databases and tables), row inserting, selecting, updating, and deleting. Patches welcome.

A word about security: arguments to `values` and placeholders (the `?` in queries) are escaped. All other inputs should be be hard-coded strings (not variables, especially when supplied by users).

**Installation**

`npm install mysql-oil`