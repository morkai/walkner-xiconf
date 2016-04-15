// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var fs = require('fs');
var _ = require('lodash');
var step = require('h5.step');
var setUpCommands = require('./commands');
var setUpBlockage = require('./blockage');
var setUpBarcodeScanner = require('./barcodeScanner');
var setUpFtStartMonitor = require('./ftStartMonitor');
var program = require('./program');
var printServiceTag = require('./printServiceTag');
var RemoteCoordinator = require('./RemoteCoordinator');
var LedManager = require('./LedManager');
var Glp2Manager = require('./Glp2Manager');

exports.DEFAULT_CONFIG = {
  safeFsId: 'safeFs',
  settingsId: 'settings',
  historyId: 'history',
  sqlite3Id: 'sqlite3',
  sioId: 'sio',
  httpServerId: 'httpServer',
  featureDbPath: './',
  gprsOutputFile: 'gprs-output.xml',
  workflowFile: 'workflow.txt',
  lptIoFile: 'LptIo.exe',
  lastModeFile: 'lastMode.txt',
  spoolFile: 'spool.exe',
  motoBarScanFile: 'MotoBarScan.exe',
  fakeFeatureFile: 'fake-feature.xml',
  httpPort: 80
};

exports.start = function startProgrammerModule(app, module, done)
{
  var safeFs = app[module.config.safeFsId];
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
  var savingLastMode = 0;

  module.OVERALL_SETUP_PROGRESS = 20;
  module.OVERALL_PROGRAMMING_PROGRESS = 100;

  module.currentState = historyModule.createEntry();

  module.remoteCoordinator = new RemoteCoordinator(app, module);

  module.ledManager = new LedManager(app.broker.sandbox(), settings, historyModule, module);

  module.glp2Manager = new Glp2Manager(app, module);

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

    module.debug("Changed input mode from [%s] to [%s].", module.currentState.inputMode, inputMode);

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

    if (workMode === 'testing' && !settings.get('testingEnabled') && !settings.get('glp2Enabled'))
    {
      return done(new Error('TESTING_DISABLED'));
    }

    if (settings.get('glp2Enabled'))
    {
      workMode = 'testing';
    }

    module.debug("Changed work mode from [%s] to [%s].", module.currentState.workMode, workMode);

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

    if (orderNo === module.currentState.selectedOrderNo)
    {
      return;
    }

    module.debug(
      "Changed selected order from [%s] to [%s].",
      module.currentState.selectedOrderNo,
      orderNo
    );

    module.currentState.clear(true, true);
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

    module.debug(
      "Changed selected 12NC from [%s] to [%s].",
      module.currentState.selectedNc12,
      nc12
    );

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

      if (!program)
      {
        return done(new Error('NOT_FOUND'));
      }

      module.debug(
        "Changed selected program from [%s] to [%s].",
        module.currentState.program ? module.currentState.program._id : null,
        programId
      );

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

    module.debug("Reset state.");

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

    module.debug("Reset LEDs.");

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

      module.debug("Reloaded last order: %s", row ? row._id : null);

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

  module.checkSerialNumber = function(orderNo, raw, nc12, serialNumber, scannerId)
  {
    module.ledManager.check(orderNo, raw, nc12, serialNumber, scannerId);
  };

  module.toggleResult = function(resultId, state, done)
  {
    if (!_.isString(resultId) || _.isEmpty(resultId) || !_.isBoolean(state))
    {
      return done(new Error('INPUT'));
    }

    var newCancelled = state ? 0 : 1;

    module.info("%s result: %s...", newCancelled ? "Cancelling" : "Restoring", resultId);

    step(
      function findResultStep()
      {
        var sql = "SELECT * FROM historyEntries WHERE _id=? LIMIT 1";

        sqlite3Module.db.get(sql, [resultId], this.next());
      },
      function findOrderStep(err, result)
      {
        if (err)
        {
          return this.skip(err);
        }

        if (!result)
        {
          return this.skip(new Error('RESULT_NOT_FOUND'));
        }

        if (newCancelled === result.cancelled)
        {
          return this.skip(new Error('SAME_STATE'));
        }

        if (result.result !== 'success' || _.isEmpty(result.serviceTag))
        {
          return this.skip(new Error('INVALID_RESULT'));
        }

        this.result = result;

        var sql = "SELECT * FROM orders WHERE _id=? LIMIT 1";

        sqlite3Module.db.get(sql, [result._order], this.next());
      },
      function toggleResultStep(err, order)
      {
        if (err)
        {
          return this.skip(err);
        }

        if (!order)
        {
          return this.skip(new Error('ORDER_NOT_FOUND'));
        }

        var historyEntry = historyModule.createEntry().fromDb(this.result, order);
        var serviceTagRequestData = _.extend(historyEntry.createServiceTagRequestData(), {
          resultId: resultId
        });
        var command = newCancelled ? 'releaseServiceTag' : 'acquireServiceTag';

        module.remoteCoordinator[command](serviceTagRequestData, this.next());
      },
      function updateResultStep(err)
      {
        if (err)
        {
          return this.skip(err);
        }

        var sql = "UPDATE historyEntries SET cancelled=? WHERE _id=?";

        sqlite3Module.db.run(sql, [newCancelled, resultId], this.next());
      },
      function finalizeStep(err)
      {
        if (err)
        {
          module.error("Failed to toggle result [%s]: %s", resultId, err.message);
        }
        else
        {
          module.info("Toggled result: %s", resultId);

          app.broker.publish('programmer.resultToggled', {resultId: resultId, cancelled: newCancelled});
        }

        done(err);
      }
    );
  };

  setUpBlockage(app, module);
  setUpBarcodeScanner(app, module);
  setUpFtStartMonitor(app, module);

  app.onModuleReady(
    [
      module.config.sioId
    ],
    setUpCommands.bind(null, app, module)
  );

  readLastMode(done);

  app.broker.subscribe('updater.updating', function(message)
  {
    module.changeState({updating: message});
  });

  app.broker.subscribe('settings.changed', function(changes)
  {
    if (changes.glp2Enabled !== undefined
      || changes.testingEnabled !== undefined
      || changes.ftEnabled !== undefined)
    {
      updateWorkMode();
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

  app.broker.subscribe('xiconfPrograms.edited', function(message)
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

  function readLastMode(done)
  {
    (safeFs || fs).readFile(module.config.lastModeFile, {encoding: 'utf8'}, function(err, lastMode)
    {
      if (err)
      {
        module.warn("Failed to read the last mode file: %s", err.message);
      }
      else
      {
        try
        {
          lastMode = JSON.parse(lastMode);
        }
        catch (err)
        {
          module.warn("Failed to parse the last mode file: %s", err.message);
        }
      }

      if (!_.isObject(lastMode))
      {
        lastMode = {};
      }

      module.currentState.inputMode = lastMode.input || 'remote';
      module.currentState.workMode = lastMode.work || 'programming';

      saveLastMode();

      setImmediate(done);
    });
  }

  function saveLastMode()
  {
    ++savingLastMode;

    if (savingLastMode > 1)
    {
      return;
    }

    var lastMode = {
      input: module.currentState.inputMode,
      work: module.currentState.workMode
    };

    (safeFs || fs).writeFile(module.config.lastModeFile, JSON.stringify(lastMode), function(err)
    {
      if (err)
      {
        module.error("Failed to save the last mode: %s", err.message);
      }

      if (savingLastMode > 1)
      {
        setImmediate(saveLastMode);
      }

      savingLastMode = 0;
    });
  }

  function updateWorkMode()
  {
    var t24vdcEnabled = !!settings.get('testingEnabled');
    var glp2Enabled = !!settings.get('glp2Enabled');
    var ftEnabled = !!settings.get('ftEnabled');
    var newWorkMode;

    if (ftEnabled)
    {
      newWorkMode = 'programming';
    }
    else if (glp2Enabled)
    {
      newWorkMode = 'testing';
    }
    else if (!t24vdcEnabled && !glp2Enabled)
    {
      newWorkMode = 'programming';
    }
    else
    {
      return;
    }

    module.setWorkMode(newWorkMode, function(err)
    {
      if (err)
      {
        module.error(
          "Failed to switch the work mode to [%s] after settings were changed: %s",
          newWorkMode,
          err.message
        );
      }
    });
  }
};
