// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var _ = require('lodash');
var setUpDb = require('./db');
var setUpRoutes = require('./routes');
var setUpRemoteExport = require('./remoteExport');
var HistoryEntry = require('./HistoryEntry');

exports.DEFAULT_CONFIG = {
  safeFsId: 'safeFs',
  expressId: 'express',
  sqlite3Id: 'sqlite3',
  settingsId: 'settings',
  featureDbPath: './',
  lastExportTimeFile: './lastExportAt.txt'
};

var MAX_RECENT_HISTORY_ENTRIES = 50;
var MAX_RECENT_SN_HISTORY_ENTRIES = 25;

exports.start = function startProgrammerModule(app, module, done)
{
  var sqlite3Module = app[module.config.sqlite3Id];

  if (!sqlite3Module)
  {
    throw new Error("sqlite3 module is required!");
  }

  module.recent = [];

  module.recentSerialNumbers = [];

  module.createEntry = function()
  {
    return new HistoryEntry(sqlite3Module.db, app.broker.sandbox(), app[module.config.settingsId]);
  };

  module.findLedsFromRecentFailure = function(orderNo, nc12, done)
  {
    var ids = [];

    for (var i = 0; i < this.recent.length; ++i)
    {
      var recentHistoryEntry = this.recent[i];

      if (recentHistoryEntry.result !== 'failure'
        || recentHistoryEntry.no !== orderNo
        || recentHistoryEntry.nc12 !== nc12)
      {
        break;
      }

      if (recentHistoryEntry.errorCode !== 'CANCELLED')
      {
        ids.push("'" + recentHistoryEntry._id + "'");
      }
    }

    if (!ids.length)
    {
      return done(null, ids);
    }

    var sql = "SELECT leds\
               FROM historyEntries\
               WHERE _id IN(" + ids + ") AND leds IS NOT NULL\
               ORDER BY startedAt DESC\
               LIMIT 1";

    sqlite3Module.db.get(sql, {}, function(err, row)
    {
      if (err)
      {
        return done(err);
      }

      return done(null, row && row.leds ? JSON.parse(row.leds) : ids);
    });
  };

  module.checkRecentSerialNumber = function(orderNo, serialNumber, done)
  {
    var error = null;
    var xiconfOrder = null;

    for (var i = 0; i < module.recentSerialNumbers.length; ++i)
    {
      var serialNumbers = module.recentSerialNumbers[i];
      var candidate = serialNumbers[serialNumber];

      if (candidate && !candidate.cancelled && candidate.orderNo === orderNo)
      {
        error = {message: 'SERIAL_NUMBER_USED'};
        xiconfOrder = {
          _id: orderNo,
          name: null
        };

        break;
      }
    }

    setTimeout(done, 1, error, xiconfOrder);
  };

  app.onModuleReady(module.config.expressId, setUpRoutes.bind(null, app, module));

  app.onModuleReady(module.config.settingsId, setUpRemoteExport.bind(null, app, module));

  app.broker.subscribe('app.started', findRecentEntries).setLimit(1);

  app.broker.subscribe('programmer.finished', saveRecentEntry);

  app.broker.subscribe('programmer.resultToggled', toggleSerialNumberState);

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
    var program = _.isString(historyEntry.program)
      ? JSON.parse(historyEntry.program)
      : (historyEntry.program || null);
    var orderNo = historyEntry.order ? historyEntry.order.no : (historyEntry.orderNo || null);

    module.recent.unshift({
      _id: historyEntry._id,
      _order: historyEntry.order ? historyEntry.order._id : (historyEntry.orderId || null),
      no: orderNo,
      quantity: historyEntry.order ? historyEntry.order.quantity : (historyEntry.orderQuantity || null),
      serviceTag: historyEntry.serviceTag,
      nc12: historyEntry.nc12,
      finishedAt: historyEntry.finishedAt,
      counter: historyEntry.counter,
      result: historyEntry.result,
      errorCode: historyEntry.errorCode,
      featureFileName: historyEntry.featureFileName,
      program: !program ? null : {
        name: program.name
      },
      cancelled: historyEntry.cancelled ? 1 : 0
    });

    if (module.recent.length > MAX_RECENT_HISTORY_ENTRIES)
    {
      module.recent.pop();
    }

    if (historyEntry.result === 'success' && !_.isEmpty(historyEntry.leds))
    {
      if (_.isString(historyEntry.leds))
      {
        historyEntry.leds = JSON.parse(historyEntry.leds);
      }

      if (module.recentSerialNumbers.length > MAX_RECENT_SN_HISTORY_ENTRIES)
      {
        module.recentSerialNumbers.pop();
      }

      var serialNumbers = {};

      for (var i = 0; i < historyEntry.leds.length; ++i)
      {
        var led = historyEntry.leds[i];

        if (led.status === 'checked')
        {
          serialNumbers[led.serialNumber] = {
            orderNo: orderNo,
            resultId: historyEntry._id,
            cancelled: historyEntry.cancelled ? 1 : 0
          };
        }
      }

      if (!_.isEmpty(serialNumbers))
      {
        module.recentSerialNumbers.unshift(serialNumbers);
      }
    }
  }

  function toggleSerialNumberState(message)
  {
    _.forEach(module.recentSerialNumbers, function(recentSerialNumber)
    {
      if (recentSerialNumber.resultId === message.resultId)
      {
        recentSerialNumber.cancelled = message.cancelled;
      }
    });
  }
};
