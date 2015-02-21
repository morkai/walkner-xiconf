// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var setUpRoutes = require('./routes');
var syncPrograms = require('./syncPrograms');

exports.DEFAULT_CONFIG = {
  expressId: 'express',
  sqlite3Id: 'sqlite3',
  settingsId: 'settings'
};

exports.start = function startProgramsModule(app, module)
{
  var syncTimer = null;

  module.syncing = false;

  module.scheduleSync = scheduleSync;

  app.onModuleReady(
    [
      module.config.expressId,
      module.config.sqlite3Id,
      module.config.settingsId
    ],
    setUpRoutes.bind(null, app, module)
  );

  app.onModuleReady(module.config.sqlite3Id, function cleanUpDeletedPrograms()
  {
    var db = app[module.config.sqlite3Id].db;

    db.run("DELETE FROM programs WHERE deleted=1 AND updatedAt < ?", [Date.now() - 7 * 3600 * 1000], function(err)
    {
      if (err)
      {
        module.error("Failed to clean up deleted programs: %s", err.message);
      }
    });
  });

  app.broker.subscribe('app.started', syncPrograms.bind(null, app, module)).setLimit(1);
  app.broker.subscribe('programs.added', scheduleSyncNow);
  app.broker.subscribe('programs.edited', scheduleSyncNow);
  app.broker.subscribe('programs.deleted', scheduleSyncNow);

  function scheduleSyncNow()
  {
    scheduleSync(false);
  }

  function scheduleSync(later)
  {
    if (module.syncing)
    {
      return;
    }

    clearTimeout(syncTimer);

    syncTimer = setTimeout(syncPrograms, (later ? 30 : 1) * 60 * 1000, app, module);
  }
};
