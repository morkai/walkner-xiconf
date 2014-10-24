// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var setUpCommands = require('./commands');
var setUpBlockage = require('./blockage');
var program = require('./program');

exports.DEFAULT_CONFIG = {
  settingsId: 'settings',
  historyId: 'history',
  sqlite3Id: 'sqlite3',
  sioId: 'sio',
  featureDbPath: './',
  workflowFile: 'workflow.txt',
  lptIoFile: 'LptIo.exe'
};

exports.start = function startProgrammerModule(app, module)
{
  var settings = app[module.config.settingsId];

  if (!settings)
  {
    throw new Error("settings module is required!");
  }

  var sqlite3Module = app[module.config.sqlite3Id];

  if (!sqlite3Module)
  {
    throw new Error("sqlite3 module is required!");
  }

  var historyModule = app[module.config.historyId];

  if (!historyModule)
  {
    throw new Error("history module is required!");
  }

  module.currentState = historyModule.createEntry();

  module.program = program.bind(null, app, module);

  module.resetOrder = function(done)
  {
    if (module.currentState.isProgramming())
    {
      return done(new Error('PROGRAMMING'));
    }

    module.currentState.clear();
    done();
    module.changeState();
  };

  module.repeatOrder = function(done)
  {
    var sql = "SELECT * FROM orders ORDER BY startedAt DESC LIMIT 1";

    sqlite3Module.db.get(sql, function(err, row)
    {
      if (err)
      {
        return done(err);
      }

      if (!row)
      {
        return done(null, null);
      }

      return done(null, row);
    });
  };

  module.log = function(text, data)
  {
    if (!Array.isArray(module.currentState.log))
    {
      return;
    }

    if (!data)
    {
      data = {};
    }

    if (typeof data.time !== 'number')
    {
      data.time = Date.now();
    }

    data.text = text;

    module.currentState.log.push(data);

    app.broker.publish('programmer.logged', data);
  };

  module.changeState = function(changes)
  {
    if (typeof changes === 'undefined')
    {
      app.broker.publish('programmer.stateChanged', module.currentState.toJSON());
    }
    else
    {
      Object.keys(changes).forEach(function(key)
      {
        module.currentState[key] = changes[key];
      });

      app.broker.publish('programmer.stateChanged', changes);
    }
  };

  setUpBlockage(app, module);

  app.onModuleReady(
    [
      module.config.sioId
    ],
    setUpCommands.bind(null, app, module)
  );
};
