**node-mysql-oil**  
*(a slick api on top [node-mysql](https://github.com/felixge/node-mysql))*

Oil makes SQL more *JavaScripty* by transforming JavaScript structures into SQL statements.

For example, this:

	var db = require('mysql-oil').connect({db:'db_demo'});
	db({
		select: 'avg(t_main) as average, sum(t1.amount) as total',
		from: 't_main',
		join: [{inner: 't_join1 t1', on: 't1.main_id = t_main.id'},
		       {left: 't_join2 t2', on: 't2.join_id = t1.id'}],
		where: ['t1.amount > ? AND t_main.cat = ?', 0, 'sale'],
		group_by: 't_main.cust_id',
		having: 'total > 0',
		order_by: 't_main.cust_name',
		limit: 100
	});

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
		'select avg(t_main) as average, sum(t1.amount) as total '+
		'from: t_main inner join t_join1 t1 on t1.main_id = t_main.id '+
		'left join t_join2 t2 on t2.join_id = t1.id '+
		'where t1.amount > 0 group by t_main.id having total > 0 limit 1'
	);

	db.query(
		'insert into t_test '+
		'(c_user, c_pass, c_uid) '+
		'values ("root", "pass", 501)'
	);

JavaScript Strings, Numbers, Booleans and Dates are automatically marshaled into their SQL form.

See `test/test.js` for examples of API usage. Most everything is there: raw SQL support (for creating and dropping databases and tables), row inserting, selecting (with joins, group by, ordering, and limiting), updating, and deleting. Patches welcome.

A word about security: arguments to `values` and placeholders (the `?` in queries) are escaped. All other inputs should be be hard-coded strings (not variables, especially when supplied by users).

**Installation**

`npm install mysql-oil`