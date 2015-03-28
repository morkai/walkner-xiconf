// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var setUpDb = require('./db');
var setUpRoutes = require('./routes');
var setUpRemoteExport = require('./remoteExport');
var HistoryEntry = require('./HistoryEntry');

exports.DEFAULT_CONFIG = {
  expressId: 'express',
  sqlite3Id: 'sqlite3',
  settingsId: 'settings',
  featureDbPath: './',
  lastExportTimeFile: './lastExportAt.txt'
};

exports.start = function startProgrammerModule(app, module, done)
{
  var sqlite3Module = app[module.config.sqlite3Id];

  if (!sqlite3Module)
  {
    throw new Error("sqlite3 module is required!");
  }

  module.recent = [];

  module.createEntry = function()
  {
    return new HistoryEntry(sqlite3Module.db, app.broker.sandbox(), app[module.config.settingsId]);
  };

  app.onModuleReady(module.config.expressId, setUpRoutes.bind(null, app, module));

  app.onModuleReady(module.config.settingsId, setUpRemoteExport.bind(null, app, module));

  app.broker.subscribe('app.started', findRecentEntries).setLimit(1);

  app.broker.subscribe('programmer.finished', saveRecentEntry);

  setUpDb(sqlite3Module, done);

  function findRecentEntries()
  {
    var sql = "SELECT e.*, o._id AS orderId, o.no AS orderNo, o.quantity as orderQuantity\
               FROM historyEntries e\
               LEFT JOIN orders o ON o._id=e._order\
               ORDER BY e.startedAt DESC\
               LIMIT 50";

    sqlite3Module.db.all(sql, function(err, historyEntries)
    {
      if (err)
      {
        return module.error("Failed to find recent entries: %s", err.message);
      }

      historyEntries.reverse().forEach(saveRecentEntry);
    });
  }

  function saveRecentEntry(historyEntry)
  {
    module.recent.unshift({
      _id: historyEntry._id,
      _order: historyEntry.order ? historyEntry.order._id : (historyEntry.orderId || null),
      no: historyEntry.order ? historyEntry.order.no : (historyEntry.orderNo || null),
      quantity: historyEntry.order ? historyEntry.order.quantity : (historyEntry.orderQuantity || null),
      serviceTag: historyEntry.serviceTag,
      nc12: historyEntry.nc12,
      finishedAt: historyEntry.finishedAt,
      counter: historyEntry.counter,
      result: historyEntry.result,
      featureFileName: historyEntry.featureFileName
    });

    if (module.recent.length > 50)
    {
      module.recent.pop();
    }
  }
};
