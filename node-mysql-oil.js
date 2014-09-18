//  node-mysql-oil.js 0.4
//    Copyright (c) 2010-2014 Jonathan 'Wolf' Rentzsch: http://rentzsch.com
//    Some rights reserved: http://opensource.org/licenses/mit
//      
//  A slick api on top node-mysql:
//    https://github.com/rentzsch/node-mysql-oil

var sys = require('sys');
var MySQLClient = require('mysql');

////////////////////////////////////////////////////////////////////////////////////////////////////

function OilConnection(opts){
  this.connectionOptions = opts;
  this.mysqlConnection = null;
}

OilConnection.prototype.connect = function(cb) {
  if (this.mysqlConnection) {
    cb();
  } else {
    if (!('user' in this.connectionOptions)) {
      this.connectionOptions.user = 'root';
    }
    this.mysqlConnection = new MySQLClient.createConnection(this.connectionOptions);
    this.mysqlConnection.connect(cb);
  }
}

OilConnection.prototype.createAndExecuteQuery = function(query) {
  if (typeof query === 'string') {
    var _args = arguments;
    this.connect(function(ex){
      this.mysqlConnection.query.apply(this.mysqlConnection, _args);
    }.bind(this));
  } else {
    return new OilQuery(this, query);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

function OilQuery(oilConnection, query){
  this.oilConnection = oilConnection;
  this.query = query;
  this.executeQuery();
}

OilQuery.prototype.executeQuery = function() {
  this.oilConnection.connect(function(ex){
    if (ex) throw ex;
    
    var query = this.query;
    
    if (query.select) {
      this.executeSelect(query.select, query.from, query.join, query.where, query.order_by, query.group_by, query.having, query.limit);
    } else if (query.insert_into) {
      this.executeInsert(query.insert_into, query.values);
    } else if (query.update) {
      this.executeUpdate(query.update, query.values, query.where); 
    } else if (query.delete_from) {
      this.executeDelete(query.delete_from, query.where);
    } else {
      throw Error('unknown sql command: '+JSON.stringify(query));
    }
  }.bind(this));
}

OilQuery.prototype.executeSelect = function(columns, tables, join, condition, ordering, grouping, having, limit) {
  var generatedSQL = 'select ' + columns + ' from ' + tables;
  var wherePlaceholderParams;
  
  function processJoin(join) {
    var type, table;
    for (t in join) {
      t = t.toLowerCase();
      switch (t) {
        case 'inner':
        case 'cross':
        case 'left':
        case 'right':
          type = t;
          break;
        case 'join':
          type = '';
          break;
        case 'left_outer':
          type = 'left outer';
          break;
        case 'right_outer':
          type = 'right outer';
          break;
      }
      if (typeof type !== 'undefined') {
        table = join[t];
        break;
      }
    }
    return ' ' + type + ' join ' + table + ' on ' + join.on;
  }

  if (join) {
    if (Array.isArray(join)) {
      generatedSQL += join.map(processJoin).join('');
    } else {
      generatedSQL += processJoin(join);
    }
  }

  if (condition) {
    if (typeof condition === 'string') {
      generatedSQL += ' where ' + condition;
    } else {
      generatedSQL += ' where ' + condition[0];
      wherePlaceholderParams = condition.slice(1);
    }
  }
  if (grouping) generatedSQL += ' group by ' + grouping;
  if (having) generatedSQL += ' having ' + having;
  if (ordering) generatedSQL += ' order by ' + ordering;
  if (limit) generatedSQL += ' limit ' + limit;
  generatedSQL += ';';
  
  this.generatedSQL = generatedSQL;
  this.wherePlaceholderParams = wherePlaceholderParams;
  this.execute();
}

OilQuery.prototype.executeInsert = function(insert_into, values) {
  var columnNames = [];
  var rowValues = [];
  var columnName;
  var generatedSQL;
  
  for (columnName in values) {
    if (values.hasOwnProperty(columnName)) {
      columnNames.push(columnName);
      rowValues.push(this.sqlstr(values[columnName]));
    }
  }
  
  generatedSQL
    = 'insert into '
    + insert_into
    + ' ('
    + columnNames.join(', ')
    + ') values ('
    + rowValues.join(', ')
    + ');';
  this.generatedSQL = generatedSQL;
  this.execute();
}

OilQuery.prototype.executeUpdate = function(update_table, values, condition) {
  var setFragments = [];
  var conditionFragment = '';
  var columnName;
  var generatedSQL;
  var wherePlaceholderParams;
  
  for (columnName in values) {
    if (values.hasOwnProperty(columnName)) {
      setFragments.push(columnName + ' = ' + this.sqlstr(values[columnName]));
    }
  }
  generatedSQL
    = 'update '
    + update_table
    + ' set '
    + setFragments.join(', ');
  
  if (condition) {
    if (typeof condition === 'string') {
      generatedSQL += ' where ' + condition;
    } else {
      generatedSQL += ' where ' + condition[0];
      wherePlaceholderParams = condition.slice(1);
    }
  }
  
  generatedSQL += ';';
  this.generatedSQL = generatedSQL;
  this.wherePlaceholderParams = wherePlaceholderParams;
  this.execute();
}

OilQuery.prototype.executeDelete = function(delete_table, condition) {
  var conditionFragment = '';
  var generatedSQL;
  var wherePlaceholderParams;
  
  generatedSQL
    = 'delete from '
    + delete_table;
  
  if (condition) {
    if (typeof condition === 'string') {
      generatedSQL += ' where ' + condition;
    } else {
      generatedSQL += ' where ' + condition[0];
      wherePlaceholderParams = condition.slice(1);
    }
  }
  
  generatedSQL += ';';
  this.generatedSQL = generatedSQL;
  this.wherePlaceholderParams = wherePlaceholderParams;
  this.execute();
}

OilQuery.prototype.execute = function() {
  this.logSQL(this.generatedSQL, this.wherePlaceholderParams);
  if (this.wherePlaceholderParams) {
    this.oilConnection.mysqlConnection.query(
      this.generatedSQL,
      this.wherePlaceholderParams,
      this.query.cb
    );
  } else {
    this.oilConnection.mysqlConnection.query(
      this.generatedSQL,
      this.query.cb
    );
  }
}

OilQuery.prototype.sqlstr = function(x) {
  switch (typeof x) {
    case 'string':
      return this.oilConnection.mysqlConnection.escape(x);
    case 'number':
      return x.toString();
    case 'object':
      if (x === null) {
        return 'NULL';
      } else if (x.constructor === Date) {
        return "'"
          +x.getFullYear()
          +'-'
          +(x.getMonth()+1)
          +'-'
          +x.getDate()
          +' '
          +x.getHours()
          +':'
          +x.getMinutes()
          +':'
          +x.getSeconds()
          +"'"
      } else if (x instanceof OilRawSQLString) {
        return x.rawSQL;
      } else {
        throw Error('unsupported type "object"');
      }
    case 'boolean':
      return x === true ? '1' : '0';
      break;
    default:
      throw Error('unknown type: '+typeof x);
  }
}

function OilRawSQLString(rawSQL) {
  this.rawSQL = rawSQL;
}

if (process.env['LOGSQL']) {
  OilQuery.prototype.logSQL = function(sql, condition){
    if (condition) {
      console.log('SQL:', sql, condition);
    } else {
      console.log('SQL:', sql);
    }
  };
} else {
  OilQuery.prototype.logSQL = function(){};
}

////////////////////////////////////////////////////////////////////////////////////////////////////

var gOilConnectionsByDatabaseName = {};
var gLogEndDeprecation = true;

exports.connect = function(opts) {
  if (!('database' in opts) && 'db' in opts) {
    opts.database = opts.db;
    delete opts.db;
  }
  
  var existingConnection = gOilConnectionsByDatabaseName[opts.database];
  if (existingConnection) {
    return existingConnection;
  }
  
  var oilConnection = new OilConnection(opts);
  var result = function(){
    oilConnection.createAndExecuteQuery.apply(oilConnection, arguments);
  };
  result.end = function(){
    if (gLogEndDeprecation) {
      gLogEndDeprecation = false;
      console.log('oil: db.end() is deprecated');
    }
  };
  result.disconnect = function(cb){
      oilConnection.mysqlConnection.end(cb);
  }
  gOilConnectionsByDatabaseName[opts.database] = result;
  
  return result;
}

exports.rawSQL = function(rawSQL) {
  return new OilRawSQLString(rawSQL);
};