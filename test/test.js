var sys = require('sys');
var assert = require('assert');
var path = require('path');
require.paths.unshift(path.dirname(__dirname)+'/lib');
var mysql_oil = require('node-mysql-oil');
var mysql = mysql_oil.connect({});
var testDB = mysql_oil.connect({db:'db_oil_test'});

step(
  function dropDatabase(){
    mysql('drop database if exists db_oil_test', this);
  },
  function createDatabase(err){
    if (err) throw err;
    console.log('database dropped');
    
    mysql('create database db_oil_test', this);
  },
  function dropTable(err){
    if (err) throw err;
    console.log('database created');
    
    testDB('drop table if exists t_test', this);
  },
  function createTable(err){
    if (err) throw err;
    console.log('table dropped');
    
    testDB(
      'create table t_test ('+
        'id int not null primary key auto_increment,'+
        'c_string varchar(255),'+
        'c_number int,'+
        'c_date datetime,'+
        'c_boolean boolean'+
      ') engine=innodb default charset=utf8 collate=utf8_unicode_ci',
      this
    );
  },
  function createJoinTable1(err){
    if (err) throw err;

    testDB(
      'create table t_join ('+
        'id int not null primary key auto_increment,'+
        'test_id int,'+
        'c_join_string varchar(255)'+
      ') engine=innodb default charset=utf8 collate=utf8_unicode_ci',
      this
    );
  },
  function createJoinTable2(err){
    if (err) throw err;

    testDB(
      'create table t_join2 ('+
        'id int not null primary key auto_increment,'+
        'join_id int,'+
        'c_amount int'+
      ') engine=innodb default charset=utf8 collate=utf8_unicode_ci',
      this
    );
  },
  function insertRow1(err){
    if (err) throw err;
    console.log('tables created');
    
    testDB({
      insert_into: 't_test',
      values: {
        id: 1,
        c_string: '“Iñtërnâtiônàlizætiøn”',
        c_number: 42,
        c_date: new Date(),
        c_boolean: true
      },
      cb: this
    });
  },
  function insertRow2(err){
    if (err) throw err;

    testDB({
      insert_into: 't_join',
      values: {
        id: 2,
        test_id: 1,
        c_join_string: 'joined'
      },
      cb: this
    });
  },
  function insertRow3(err){
    if (err) throw err;

    testDB({
      insert_into: 't_join2',
      values: {
        id: 3,
        join_id: 2,
        c_amount: 1,
      },
      cb: this
    });
  },
  function insertRow4(err){
    if (err) throw err;

    testDB({
      insert_into: 't_join2',
      values: {
        id: 4,
        join_id: 2,
        c_amount: 1,
      },
      cb: this
    });
  },
  function selectRow1(err){
    if (err) throw err;
    console.log('rows inserted');
    
    testDB({
      select: 'c_number, c_date, t1.c_join_string AS c_join1, SUM(t2.c_amount) AS c_total',
      from: 't_test',
      join: [{inner: 't_join t1', on: 't_test.id = t1.test_id'},
             {join: 't_join2 t2', on: 't1.id = t2.join_id'}],
      where: ['c_string = ? AND t1.c_join_string = ? AND t2.c_amount = ?', '“Iñtërnâtiônàlizætiøn”', 'joined', 1],
      group_by: 't_test.id',
      having: 'c_total > 1',
      order_by: 't_test.id',
      cb: this
    });
  },
  function checkRow1(err, rows){
    if (err) throw err;
    
    assert.ok(rows instanceof Array);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].c_join1, 'joined', 'JOIN failed, c_join1 != "joined"');
    assert.equal(rows[0].c_total, 2, "GROUP BY failed, c_total != 2");
    
    testDB({
      select: '*',
      from: 't_join2',
      limit: 1,
      cb: this
    });
  },
  function updateRow(err, rows){
    if (err) throw err;
    console.log('rows selected');
    
    assert.ok(rows instanceof Array);
    assert.equal(rows.length, 1, '"LIMIT 1" failed');
    
    testDB({
      update: 't_test',
      values:{
        c_number: 43
      },
      where: ['c_number = ?', 42],
      cb: this
    });
  },
  function deleteRow(err, result){
    if (err) throw err;
    console.log('row updated');
    assert.equal(result.affectedRows, 1);
    console.log('success!');
    
    testDB({
      delete_from: 't_test',
      where: ['c_number = ?', 43],
      cb: this
    });
  },
  function deletedRow(err, result){
      if (err) throw err;
    
      console.log('row deleted');
      assert.equal(result.affectedRows, 1);
      console.log('success!');

      mysql('drop database if exists db_oil_test', this);
  },
  function droppedDatabase(err){
      if (err) throw err;
      console.log('cleaned up');

      testDB.disconnect();
      mysql.disconnect(this);
  },
  function disconnected(err) {
      if (err) throw err;
      console.log('disconnected');
  }
);

// Simplified version of https://github.com/creationix/step
function step() {
  var steps = Array.prototype.slice.call(arguments);
  
  function callNextStep(){
    if (steps.length === 0) {
      if (arguments[0]) {
        throw arguments[0];
      } else {
        return;
      }
    }
    
    var step = steps.shift();
    var result;
    try {
      result = step.apply(callNextStep, arguments);
    } catch (ex) {
      callNextStep(ex);
    }
    
    if (result !== undefined) {
      callNextStep(undefined, result);
    }
  }
  callNextStep();
}