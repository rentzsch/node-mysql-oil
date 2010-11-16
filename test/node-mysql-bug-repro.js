var sys = require('sys');
var assert = require('assert');
var MySQLClient = require('mysql').Client;
var mysqlDB = new MySQLClient({user:'root', database:'db_node_test'});

mysqlDB.connect();

function insertRow(err) {
  if (err) throw err;
  mysqlDB.query(
    'insert into t_test (c_string, c_number) values ("hello", 42);',
    function(err){
      if (err) throw err;
      mysqlDB.query(
        'select * from t_test;',
        function(err, rows){
          if (err) throw err;
          console.log(rows);
          assert.ok(rows instanceof Array);
          mysqlDB.end();
          console.log('success!');
        }
      );
    }
  );
};

if (!(process.env['NO_TABLE'])) {
  mysqlDB.query(
    'drop table if exists t_test;'+
    'create table t_test ('+
      'id int not null primary key auto_increment,'+
      'c_string varchar(255),'+
      'c_number int,'+
      'c_date datetime,'+
      'c_boolean boolean'+
    ') engine=innodb default charset=utf8 collate=utf8_unicode_ci;',
    insertRow
  );
} else {
  insertRow(null);
}