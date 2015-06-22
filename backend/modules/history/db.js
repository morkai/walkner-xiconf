// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var step = require('h5.step');

module.exports = function setUpHistoryDb(sqlite3Module, done)
{
  var baseSchemaSql = 'BEGIN TRANSACTION;\
CREATE TABLE IF NOT EXISTS orders (\
  _id TEXT PRIMARY KEY NOT NULL,\
  no TEXT NOT NULL,\
  quantity INT NOT NULL,\
  successCounter INT NOT NULL,\
  failureCounter INT NOT NULL,\
  startedAt INT NOT NULL,\
  finishedAt INT NOT NULL,\
  duration INT NOT NULL\
) WITHOUT ROWID;\
CREATE INDEX IF NOT EXISTS startedAt_D ON orders(startedAt DESC);\
CREATE INDEX IF NOT EXISTS no_A_startedAt_D ON orders(no ASC, startedAt DESC);\
CREATE TABLE IF NOT EXISTS historyEntries (\
  _id TEXT PRIMARY KEY NOT NULL,\
  _order TEXT,\
  nc12 TEXT NOT NULL,\
  counter INT NOT NULL,\
  startedAt INT NOT NULL,\
  finishedAt INT NOT NULL,\
  duration INT NOT NULL,\
  log TEXT NOT NULL,\
  result TEXT NOT NULL,\
  errorCode INT,\
  exception TEXT,\
  output TEXT,\
  featureFile TEXT,\
  featureFileName TEXT,\
  featureFileHash TEXT,\
  workflowFile TEXT,\
  workflow TEXT\
) WITHOUT ROWID;\
CREATE INDEX IF NOT EXISTS _order_D ON historyEntries(_order DESC);\
CREATE INDEX IF NOT EXISTS startedAt_D ON historyEntries(startedAt DESC);\
CREATE INDEX IF NOT EXISTS nc12_A_startedAt_D ON historyEntries(nc12 ASC, startedAt DESC);\
CREATE INDEX IF NOT EXISTS result_A_startedAt_D ON historyEntries(result ASC, startedAt DESC);\
CREATE TABLE IF NOT EXISTS programs (\
  _id TEXT PRIMARY KEY NOT NULL,\
  createdAt INT NOT NULL,\
  updatedAt INT NOT NULL,\
  deleted INT NOT NULL,\
  type TEXT NOT NULL,\
  name TEXT NOT NULL,\
  steps TEXT NOT NULL\
) WITHOUT ROWID;\
COMMIT TRANSACTION;';

  step(
    function()
    {
      sqlite3Module.db.exec(baseSchemaSql, this.next());
    },
    function(err)
    {
      if (err)
      {
        return this.skip(err);
      }

      sqlite3Module.db.get('PRAGMA user_version', this.next());
    },
    function(err, row)
    {
      if (err)
      {
        return this.skip(err);
      }

      var sql = '';
      var userVersion = row.user_version;

      if (row.user_version < 1)
      {
        userVersion = 1;

        sql += 'ALTER TABLE historyEntries ADD COLUMN program TEXT;\n';
        sql += 'ALTER TABLE historyEntries ADD COLUMN steps TEXT;\n';
        sql += 'ALTER TABLE historyEntries ADD COLUMN metrics TEXT;\n';
      }

      if (row.user_version < 2)
      {
        userVersion = 2;

        sql += 'ALTER TABLE historyEntries ADD COLUMN serviceTag TEXT;\n';
        sql += 'CREATE INDEX IF NOT EXISTS serviceTag_D ON historyEntries(serviceTag DESC);\n';
      }

      if (row.user_version < 3)
      {
        userVersion = 3;

        sql += 'ALTER TABLE historyEntries ADD COLUMN leds TEXT;\n';
        sql += 'ALTER TABLE historyEntries ADD COLUMN prodLine TEXT;\n';
      }

      if (row.user_version < 4)
      {
        userVersion = 4;

        sql += 'ALTER TABLE historyEntries ADD COLUMN gprsNc12 TEXT;\n';
        sql += 'ALTER TABLE historyEntries ADD COLUMN gprsOrderFileHash TEXT;\n';
        sql += 'ALTER TABLE historyEntries ADD COLUMN gprsInputFileHash TEXT;\n';
        sql += 'ALTER TABLE historyEntries ADD COLUMN gprsOutputFileHash TEXT;\n';
      }

      if (row.user_version < 5)
      {
        userVersion = 5;

        sql += 'ALTER TABLE programs ADD COLUMN prodLines TEXT;\n';
      }

      if (sql === '')
      {
        return sqlite3Module.info("Database user version: %d", userVersion);
      }

      sqlite3Module.info("Updating database from user version [%d] to [%d]...", row.user_version, userVersion);

      sql = 'BEGIN TRANSACTION;\n' + sql + 'PRAGMA user_version=' + userVersion + ';\nCOMMIT TRANSACTION;';

      sqlite3Module.db.exec(sql, this.next());
    },
    done
  );

};
