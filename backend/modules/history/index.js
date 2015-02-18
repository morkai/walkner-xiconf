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
    return new HistoryEntry(sqlite3Module.db, app.broker.sandbox());
  };

  app.onModuleReady(module.config.expressId, setUpRoutes.bind(null, app, module));

  app.onModuleReady(module.config.settingsId, setUpRemoteExport.bind(null, app, module));

  app.broker.subscribe('programmer.finished', saveRecentEntry);

  setUpDb(sqlite3Module, done);

  function saveRecentEntry(historyEntry)
  {
    module.recent.unshift({
      _id: historyEntry._id,
      _order: historyEntry.order ? historyEntry.order._id : null,
      no: historyEntry.order ? historyEntry.order.no : null,
      quantity: historyEntry.order ? historyEntry.order.quantity : null,
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
