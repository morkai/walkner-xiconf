// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

module.exports = function setUpHistoryDb(db, done)
{
  var sql = 'BEGIN TRANSACTION;\
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
COMMIT TRANSACTION;';

  db.exec(sql, done);
};
