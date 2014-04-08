// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var sqlite3 = require('sqlite3');

app.db = new sqlite3.Database(__dirname + '/../data/db.sqlite3', function(err)
{
  if (err)
  {
    console.error(err);
    process.exit(1);
  }

  var db = this;

  db.serialize(function()
  {
    db.run(
      "CREATE TABLE IF NOT EXISTS history (startedAt INT, "
        + "finishedAt INT, nc TEXT, error TEXT, exitCode INT, result TEXT, "
        + "feature TEXT, workflow TEXT)"
    );

    db.run("DELETE FROM history WHERE finishedAt IS NULL");
  });
});
