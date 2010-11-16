var sys = require('sys');
var assert = require('assert');
var mysql_oil = require('mysql-oil');
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
    mysql.end();
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
  function insertRow(err){
    if (err) throw err;
    console.log('table created');
    
    testDB({
      insert_into: 't_test',
      values: {
        c_string: '“Iñtërnâtiônàlizætiøn”',
        c_number: 42,
        c_date: new Date(),
        c_boolean: true
      },
      cb: this
    });
  },
  function selectRow(err){
    if (err) throw err;
    console.log('row inserted');
    
    testDB({
      select: 'c_number, c_date',
      from: 't_test',
      where: ['c_string = ?', '“Iñtërnâtiônàlizætiøn”'],
      cb: this
    });
  },
  function updateRow(err, rows){
    if (err) throw err;
    console.log('row selected');
    
    assert.ok(rows instanceof Array);
    assert.equal(rows.length, 1);
    
    testDB({
      update: 't_test',
      values:{
        c_number: 43
      },
      where: ['c_number = ?', 42],
      cb: this
    });
  },
  function incrementRow(err, result){
    testDB.end();
    if (err) throw err;
    
    console.log('row updated');
    assert.equal(result.affectedRows, 1);
    console.log('success!');
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