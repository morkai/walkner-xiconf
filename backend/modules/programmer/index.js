// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var fs = require('fs');
var lodash = require('lodash');
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
  lptIoFile: 'LptIo.exe',
  lastModeFile: 'lastMode.txt'
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

  module.newProgram = null;

  module.program = program.bind(null, app, module);

  module.updateCurrentProgram = function()
  {
    if (!module.newProgram)
    {
      return;
    }

    var newProgram = module.newProgram;
    module.newProgram = null;

    if (module.currentState.program && module.currentState.program._id === newProgram._id)
    {
      module.currentState.program = newProgram;
    }
  };

  module.switchMode = function(mode, done)
  {
    if (module.currentState.isProgramming())
    {
      return done(new Error('PROGRAMMING'));
    }

    if (module.currentState.mode === mode)
    {
      return done();
    }

    if (mode !== 'programming' && mode !== 'testing')
    {
      return done(new Error('INPUT'));
    }

    if (mode === 'testing' && !settings.get('testingEnabled'))
    {
      return done(new Error('TESTING_DISABLED'));
    }

    module.currentState.clear();
    module.currentState.mode = mode;
    done();
    module.changeState();
  };

  module.pickProgram = function(programId, done)
  {
    if (module.currentState.isProgramming())
    {
      return done(new Error('PROGRAMMING'));
    }

    if (module.currentState.mode !== 'testing')
    {
      return done(new Error('INVALID_MODE'));
    }

    sqlite3Module.db.get("SELECT * FROM programs WHERE _id=?", [programId], function(err, program)
    {
      if (err)
      {
        return done(err);
      }

      done(null);

      program.steps = JSON.parse(program.steps);

      module.currentState.clear(false);
      module.currentState.program = program;
      module.changeState();
    });
  };

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

  module.updateStepProgress = function(stepIndex, stepProgress)
  {
    var steps = module.currentState.steps;

    if (!steps || !steps[stepIndex])
    {
      return;
    }

    lodash.merge(steps[stepIndex], stepProgress);

    app.broker.publish('programmer.stepProgressed', {
      stepIndex: stepIndex,
      stepProgress: stepProgress
    });
  };

  setUpBlockage(app, module);

  app.onModuleReady(
    [
      module.config.sioId
    ],
    setUpCommands.bind(null, app, module)
  );

  app.broker.subscribe('app.started', readLastMode);

  app.broker.subscribe('settings.changed', function(changes)
  {
    if (changes.testingEnabled === 0)
    {
      module.switchMode('programming', function(err)
      {
        if (err)
        {
          module.error("Failed to switch mode to programming after testing was disabled: %s", err.message);
        }
      });
    }
  });

  app.broker.subscribe('programmer.stateChanged', function(message)
  {
    if (message.program !== undefined)
    {
      module.newProgram = null;
    }

    if (message.mode !== undefined)
    {
      saveLastMode();
    }
  });

  app.broker.subscribe('programs.edited', function(message)
  {
    var newProgram = message.model;
    var currentProgram = module.currentState.program;

    if (!currentProgram || currentProgram._id !== newProgram._id)
    {
      return;
    }

    if (module.currentState.isProgramming() || module.currentState.isFinished())
    {
      module.newProgram = newProgram;
    }
    else
    {
      module.changeState({program: newProgram});
    }
  });

  function readLastMode()
  {
    fs.readFile(module.config.lastModeFile, {encoding: 'utf8'}, function(err, lastMode)
    {
      if (err)
      {
        return module.warn("Failed to read the last mode file: %s", err.message);
      }

      module.switchMode(lastMode, function(err)
      {
        if (err)
        {
          return module.error("Failed to switch to the last mode [%s]: %s", lastMode, err.message);
        }
      });
    });
  }

  function saveLastMode()
  {
    fs.writeFile(module.config.lastModeFile, module.currentState.mode, function(err)
    {
      if (err)
      {
        return module.error("Failed to save the last mode: %s", err.message);
      }
    });
  }
};
