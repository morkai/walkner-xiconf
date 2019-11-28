// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var sqlite3 = require('sqlite3');

exports.DEFAULT_CONFIG = {
  dbFile: 'db.sqlite3'
};

exports.start = function startSqlite3Module(app, module, done)
{
  module.db = new sqlite3.Database(module.config.dbFile, function(err)
  {
    if (err)
    {
      return done(err);
    }

    module.db.run("PRAGMA foreign_keys = ON", done);
  });
};
