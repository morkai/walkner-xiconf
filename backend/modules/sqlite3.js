// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
