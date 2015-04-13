// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var fs = require('fs');
var _ = require('lodash');
var setUpCommands = require('./commands');
var setUpBlockage = require('./blockage');
var setUpBarcodeScanner = require('./barcodeScanner');
var program = require('./program');
var printServiceTag = require('./printServiceTag');
var RemoteCoordinator = require('./RemoteCoordinator');
var LedManager = require('./LedManager');

exports.DEFAULT_CONFIG = {
  settingsId: 'settings',
  historyId: 'history',
  sqlite3Id: 'sqlite3',
  sioId: 'sio',
  featureDbPath: './',
  workflowFile: 'workflow.txt',
  lptIoFile: 'LptIo.exe',
  lastModeFile: 'lastMode.txt',
  spoolFile: 'spool.exe',
  motoBarScanFile: 'MotoBarScan.exe'
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

  var lastFeatureFile = null;

  module.OVERALL_SETUP_PROGRESS = 20;
  module.OVERALL_PROGRAMMING_PROGRESS = 100;

  module.currentState = historyModule.createEntry();

  module.remoteCoordinator = new RemoteCoordinator(app, module);

  module.ledManager = new LedManager(app.broker.sandbox(), module);

  module.newProgram = null;

  module.start = program.bind(null, app, module);

  module.getLastFeatureFile = function(nc12)
  {
    return lastFeatureFile !== null && lastFeatureFile.nc12 === nc12 ? lastFeatureFile : null;
  };

  module.setInputMode = function(inputMode, done)
  {
    if (module.currentState.isInProgress())
    {
      return done(new Error('IN_PROGRESS'));
    }

    if (module.currentState.inputMode === inputMode)
    {
      return done();
    }

    if (inputMode !== 'local' && inputMode !== 'remote')
    {
      return done(new Error('INPUT'));
    }

    module.currentState.clear();
    module.currentState.inputMode = inputMode;
    done();
    module.changeState();
  };

  module.setWorkMode = function(workMode, done)
  {
    if (module.currentState.isInProgress())
    {
      return done(new Error('IN_PROGRESS'));
    }

    if (module.currentState.workMode === workMode)
    {
      return done();
    }

    if (workMode !== 'programming' && workMode !== 'testing')
    {
      return done(new Error('INPUT'));
    }

    if (workMode === 'testing' && !settings.get('testingEnabled'))
    {
      return done(new Error('TESTING_DISABLED'));
    }

    module.currentState.clear(false);
    module.currentState.workMode = workMode;
    done();
    module.changeState();
  };

  module.selectOrderNo = function(orderNo, done)
  {
    if (module.currentState.isInProgress())
    {
      return done(new Error('IN_PROGRESS'));
    }

    if (module.currentState.inputMode !== 'remote')
    {
      return done(new Error('INVALID_INPUT_MODE'));
    }

    done(null);

    module.currentState.clear(true, false);
    module.currentState.selectedOrderNo = orderNo;
    module.currentState.selectedNc12 = null;
    module.changeState();
  };

  module.selectNc12 = function(nc12, password, done)
  {
    if (module.currentState.isInProgress())
    {
      return done(new Error('IN_PROGRESS'));
    }

    if (module.currentState.inputMode !== 'remote')
    {
      return done(new Error('INVALID_INPUT_MODE'));
    }

    if (password !== settings.get('password'))
    {
      return done(new Error('INVALID_PASSWORD'));
    }

    done(null);

    module.currentState.clear(false, false);
    module.currentState.selectedNc12 = nc12;
    module.changeState();
  };

  module.setProgram = function(programId, done)
  {
    if (module.currentState.isInProgress())
    {
      return done(new Error('IN_PROGRESS'));
    }

    if (module.currentState.workMode !== 'testing')
    {
      return done(new Error('INVALID_WORK_MODE'));
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

  module.reset = function(done)
  {
    if (module.currentState.isInProgress())
    {
      return done(new Error('IN_PROGRESS'));
    }

    module.currentState.clear();
    done();
    module.changeState();
  };

  module.resetLeds = function(done)
  {
    if (!module.currentState.waitingForLeds)
    {
      return done(new Error('NOT_WAITING_FOR_LEDS'));
    }

    var leds = module.currentState.leds;

    if (_.isEmpty(leds))
    {
      return done();
    }

    _.forEach(leds, function(led, i)
    {
      if (led.status !== 'waiting')
      {
        module.ledManager.resetLed(i, led);
      }
    });

    setImmediate(done);
  };

  module.reload = function(done)
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
    if (changes === undefined)
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

    _.merge(steps[stepIndex], stepProgress);

    app.broker.publish('programmer.stepProgressed', {
      stepIndex: stepIndex,
      stepProgress: stepProgress
    });

    var stepsProgress = [];

    module.currentState.program.steps.forEach(function(step, i)
    {
      if (step.enabled)
      {
        stepsProgress.push(steps[i].progress);
      }
    });

    var stepCount = stepsProgress.length;
    var percentPerStep = 100 / stepCount;
    var programmingProgress = 0;

    stepsProgress.forEach(function(stepProgress)
    {
      programmingProgress += percentPerStep * (stepProgress / 100);
    });

    module.updateOverallProgress(programmingProgress, true);
  };

  module.updateOverallProgress = function(progress, programming)
  {
    if (programming)
    {
      var setupProgress = module.OVERALL_SETUP_PROGRESS;
      var programmingProgress = module.OVERALL_PROGRAMMING_PROGRESS;

      progress = Math.round(setupProgress + ((programmingProgress - setupProgress) * (progress / 100)));
    }

    if (progress > module.currentState.overallProgress)
    {
      module.changeState({overallProgress: progress});
    }
  };

  module.printServiceTag = function(serviceTag, done)
  {
    return printServiceTag(
      module.config.spoolFile,
      settings.get('serviceTagPrinter'),
      settings.get('serviceTagLabelType'),
      settings.get('serviceTagLabelCode'),
      serviceTag,
      done
    );
  };

  module.checkSerialNumber = function(orderNo, nc12, serialNumber)
  {
    module.ledManager.check(orderNo, nc12, serialNumber);
  };

  setUpBlockage(app, module);
  setUpBarcodeScanner(app, module);

  app.onModuleReady(
    [
      module.config.sioId
    ],
    setUpCommands.bind(null, app, module)
  );

  app.broker.subscribe('app.started', readLastMode);

  app.broker.subscribe('updater.updating', function(message)
  {
    module.changeState({updating: message});
  });

  app.broker.subscribe('settings.changed', function(changes)
  {
    if (changes.testingEnabled === 0)
    {
      module.setWorkMode('programming', function(err)
      {
        if (err)
        {
          module.error("Failed to switch the work mode to programming after testing was disabled: %s", err.message);
        }
      });
    }

    lastFeatureFile = null;
  });

  app.broker.subscribe('programmer.finished', function(finishedState)
  {
    if (finishedState.result === 'success' && finishedState.featureFile && finishedState.nc12)
    {
      lastFeatureFile = {
        nc12: finishedState.nc12,
        fullPath: finishedState.featureFile,
        fileName: finishedState.featureFileName
      };
    }
    else
    {
      lastFeatureFile = null;
    }
  });

  app.broker.subscribe('programmer.stateChanged', function(changes)
  {
    if (changes.program !== undefined)
    {
      module.newProgram = null;
    }

    if (changes.inputMode !== undefined || changes.workMode !== undefined)
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

    if (module.currentState.isInProgress() || module.currentState.isFinished())
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

      try
      {
        lastMode = JSON.parse(lastMode);
      }
      catch (err)
      {
        return module.warn("Failed to parse the last mode file: %s", err.message);
      }

      module.setInputMode(lastMode.input, function(err)
      {
        if (err)
        {
          return module.error("Failed to set the last input mode [%s]: %s", lastMode.input, err.message);
        }
      });

      module.setWorkMode(lastMode.work, function(err)
      {
        if (err)
        {
          return module.error("Failed to set the last work mode [%s]: %s", lastMode.work, err.message);
        }
      });
    });
  }

  function saveLastMode()
  {
    var lastMode = {
      input: module.currentState.inputMode,
      work: module.currentState.workMode
    };

    fs.writeFile(module.config.lastModeFile, JSON.stringify(lastMode), function(err)
    {
      if (err)
      {
        return module.error("Failed to save the last mode: %s", err.message);
      }
    });
  }
};
