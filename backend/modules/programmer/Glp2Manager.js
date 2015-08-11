// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var step = require('h5.step');
var serialport = require('serialport');
var glp2 = require('./glp2');

module.exports = Glp2Manager;

var SAMPLE_TIME = 333;
var REQUEST_DELAY = 200;

/**
 * @constructor
 * @extends {EventEmitter}
 * @param {object} app
 * @param {object} programmer
 */
function Glp2Manager(app, programmer)
{
  EventEmitter.call(this);

  /**
   * @private
   * @type {h5.pubsub.Sandbox}
   */
  this.broker = app.broker.sandbox();

  /**
   * @private
   * @type {object}
   */
  this.settings = app[programmer.config.settingsId];

  /**
   * @private
   * @type {Object}
   */
  this.programmer = programmer;

  /**
   * @private
   * @type {HistoryEntry}
   */
  this.currentState = programmer.currentState;

  /**
   * @private
   * @type {Master|null}
   */
  this.master = null;

  /**
   * @private
   * @type {Glp2Manager.ReadyState}
   */
  this.readyState = Glp2Manager.ReadyState.STOPPED;

  /**
   * @private
   * @type {object}
   */
  this.readyStateTimer = setInterval(this.checkReadyState.bind(this), 10000);

  /**
   * @private
   * @type {object|null}
   */
  this.closeAfterErrorTimer = null;

  /**
   * @private
   * @type {Array.<string>}
   */
  this.deviceOptions = [];

  /**
   * @private
   * @type {Number}
   */
  this.softwareVersion = NaN;

  this.broker.subscribe('app.started', this.onAppStarted.bind(this)).setLimit(1);
  this.broker.subscribe('settings.changed', this.onSettingsChanged.bind(this));
  this.broker.subscribe('programmer.finished', this.onProgrammerFinished.bind(this));

  this.monitorActualValues = this.monitorActualValues.bind(this);
  this.onReady = this.onReady.bind(this);
  this.onMasterOpen = this.onMasterOpen.bind(this);
  this.onMasterError = this.onMasterError.bind(this);
  this.onMasterClose = this.onMasterClose.bind(this);
  this.onMasterTx = this.onMasterTx.bind(this);
  this.onMasterRx = this.onMasterRx.bind(this);

  this.on('error', function() {});
}

inherits(Glp2Manager, EventEmitter);

/**
 * @enum {number}
 */
Glp2Manager.ReadyState = {
  STOPPED: 0,
  DISCONNECTED: 1,
  CONNECTING: 2,
  RESETTING: 3,
  READY: 4
};

/**
 * @returns {number}
 */
Glp2Manager.prototype.getSoftwareVersion = function()
{
  return this.softwareVersion;
};

/**
 * @returns {boolean}
 */
Glp2Manager.prototype.isReady = function()
{
  return this.readyState === Glp2Manager.ReadyState.READY;
};

/**
 * @param {function(Error|null): void} done
 */
Glp2Manager.prototype.start = function(done)
{
  if (this.readyState > Glp2Manager.ReadyState.DISCONNECTED)
  {
    return done();
  }

  this.readyState = Glp2Manager.ReadyState.CONNECTING;

  if (!this.settings.get('glp2Enabled'))
  {
    var settingDisabledErr = new Error("GLP2 testing is disabled in the settings!");
    settingDisabledErr.code = 'GLP2:SETTING_DISABLED';

    this.readyState = Glp2Manager.ReadyState.STOPPED;

    return done(settingDisabledErr);
  }

  if (!this.settings.supportsFeature('glp2'))
  {
    var featureDisabledErr = new Error("The current license doesn't have the GLP2 option!");
    featureDisabledErr.code = 'GLP2:FEATURE_DISABLED';

    this.readyState = Glp2Manager.ReadyState.STOPPED;

    return done(featureDisabledErr);
  }

  var manager = this;

  step(
    function listSerialPortsStep()
    {
      serialport.list(this.next());
    },
    function findSerialPortStep(err, ports)
    {
      if (err)
      {
        var listSerialPortsErr = new Error("Failed to list serial ports: " + err.message);
        listSerialPortsErr.code = 'TESTING_SEARCHING_COM_FAILURE';

        manager.readyState = Glp2Manager.ReadyState.STOPPED;

        return this.done(done, listSerialPortsErr);
      }

      var comPattern = manager.settings.get('glp2ComPattern');

      for (var i = 0, l = ports.length; i < l; ++i)
      {
        var port = ports[i];
        var keys = Object.keys(port);

        for (var ii = 0, ll = keys.length; ii < ll; ++ii)
        {
          var key = keys[ii];

          if (typeof port[key] === 'string' && port[key].indexOf(comPattern) !== -1)
          {
            return setImmediate(this.next(), null, port.comName);
          }
        }
      }

      var noSerialPortErr = new Error("No serial port found that matches the pattern: " + comPattern);
      noSerialPortErr.code = 'TESTING_COM_NOT_FOUND';

      manager.readyState = Glp2Manager.ReadyState.DISCONNECTED;

      return this.done(done, noSerialPortErr);
    },
    function createMasterStep(err, comPort)
    {
      manager.master = new glp2.Master({
        comPort: comPort,
        comAddress: manager.settings.get('glp2ComAddress'),
        requestDelay: REQUEST_DELAY
      });
    },
    function openSerialConnectionStep()
    {
      manager.master.on('open', manager.onMasterOpen);
      manager.master.on('error', manager.onMasterError);
      manager.master.on('close', manager.onMasterClose);
      manager.master.on('tx', manager.onMasterTx);
      manager.master.on('rx', manager.onMasterRx);
      manager.master.open();
    }
  );
};

/**
 * @param {function(Error|null): void} done
 */
Glp2Manager.prototype.stop = function(done)
{
  var oldReadyState = this.readyState;

  this.readyState = Glp2Manager.ReadyState.STOPPED;

  if (oldReadyState === Glp2Manager.ReadyState.STOPPED
    || oldReadyState === Glp2Manager.ReadyState.DISCONNECTED)
  {
    return done();
  }

  this.programmer.debug("[glp2] Stopping...");

  this.master.once('close', done);
  this.master.close();
};

/**
 * @param {number} [cancelDelay]
 * @param {function(Error|null): void} done
 */
Glp2Manager.prototype.reset = function(cancelDelay, done)
{
  if (_.isFunction(cancelDelay))
  {
    done = cancelDelay;
    cancelDelay = this.settings.get('glp2CancelDelay') || 2000;
  }

  if (this.readyState !== Glp2Manager.ReadyState.CONNECTING
    && this.readyState !== Glp2Manager.ReadyState.READY)
  {
    return done();
  }

  this.readyState = Glp2Manager.ReadyState.RESETTING;

  var manager = this;

  step(
    function cancelTestStep()
    {
      if (!manager.master)
      {
        return this.skip();
      }

      manager.master.cancelTest(this.next());
    },
    function delayNextStep(err)
    {
      if (err)
      {
        manager.programmer.error("[glp2] Failed to cancel test: %s", err.message);

        return this.skip(err);
      }

      if (!manager.master)
      {
        return this.skip();
      }

      setTimeout(this.next(), cancelDelay);
    },
    function removeTestResultsStep()
    {
      if (!manager.master)
      {
        return this.skip();
      }

      manager.master.removeTestResults(this.next());
    },
    function removeTestProgramsStep(err)
    {
      if (err)
      {
        manager.programmer.error("[glp2] Failed to remove test results: %s", err.message);

        return this.skip(err);
      }

      if (!manager.master)
      {
        return this.skip();
      }

      manager.master.removeTestPrograms(this.next());
    },
    function setParametersStep(err)
    {
      if (err)
      {
        manager.programmer.error("[glp2] Failed to remove test programs: %s", err.message);

        return this.skip(err);
      }

      if (!manager.master)
      {
        return this.skip();
      }

      var params = {
        transmittingMode: glp2.TransmittingMode.SINGLE_TESTS,
        remoteControl: glp2.RemoteControl.FULL,
        sampleTime: SAMPLE_TIME,
        actualValueData: glp2.ActualValueData.EXTRA_RESULTS
      };

      manager.master.setParameters(params, this.next());
    },
    function handleResponseStep(err)
    {
      if (err)
      {
        manager.programmer.error("[glp2] Failed to set parameters: %s", err.message);

        return this.skip(err);
      }
    },
    function emptyActualValuesStep(err)
    {
      if (err)
      {
        return setImmediate(manager.onReady, err, done);
      }

      var counter = 0;

      emptyActualValues();

      function emptyActualValues(err, res)
      {
        if (!manager.master)
        {
          return setImmediate(manager.onReady, null, done);
        }

        if (err)
        {
          return setImmediate(manager.onReady, err, done);
        }

        if (res === null)
        {
          return setImmediate(manager.onReady, null, done);
        }

        if (counter > 10 && res && res.faultStatus > 0)
        {
          return setImmediate(
            manager.onReady,
            new Error("Failed to empty actual values buffer, bacause of tester being faulty: " + res.faultStatus),
            done
          );
        }

        ++counter;

        manager.master.getActualValues(emptyActualValues);
      }
    }
  );
};

Glp2Manager.prototype.requestStart = function()
{
  if (this.readyState === Glp2Manager.ReadyState.READY && !this.currentState.isInProgress())
  {
    this.broker.publish('programmer.startRequested');
  }
};

/**
 * @param {string} programName
 * @param {ProgramStep|Array.<ProgramStep>} programSteps
 * @param {function(Error|string|null, Response|null): void} done
 */
Glp2Manager.prototype.setTestProgram = function(programName, programSteps, done)
{
  if (this.readyState !== Glp2Manager.ReadyState.READY)
  {
    return done('GLP2:TESTER_NOT_READY', null);
  }

  if (!Array.isArray(programSteps))
  {
    programSteps = [programSteps];
  }

  this.master.setTestProgram(programName, programSteps, done);
};

/**
 * @param {function(Error|string|null, Response|null): void} done
 */
Glp2Manager.prototype.startTest = function(done)
{
  if (this.readyState !== Glp2Manager.ReadyState.READY)
  {
    return done('GLP2:TESTER_NOT_READY', null);
  }

  this.master.startTest(done);
};

/**
 * @param {function(Error|string|null, Response|null): void} done
 */
Glp2Manager.prototype.getActualValues = function(done)
{
  if (this.readyState !== Glp2Manager.ReadyState.READY)
  {
    return done('GLP2:TESTER_NOT_READY', null);
  }

  this.master.getActualValues(done);
};

/**
 * @param {boolean} evaluation
 * @param {function(Error|string|null, Response|null): void} done
 */
Glp2Manager.prototype.ackVisTest = function(evaluation, done)
{
  if (this.readyState !== Glp2Manager.ReadyState.READY)
  {
    return done('GLP2:TESTER_NOT_READY', null);
  }

  this.master.ackVisTest(evaluation, done);
};

/**
 * @private
 */
Glp2Manager.prototype.checkReadyState = function()
{
  if (this.readyState !== Glp2Manager.ReadyState.DISCONNECTED)
  {
    return;
  }

  var manager = this;

  this.start(function(err)
  {
    if (err)
    {
      manager.programmer.error("[glp2] Failed to restart: %s", err.message);
    }
  });
};

/**
 * @private
 */
Glp2Manager.prototype.monitorActualValues = function(timeouts)
{
  if (this.readyState !== Glp2Manager.ReadyState.READY)
  {
    return;
  }

  if (!timeouts)
  {
    timeouts = 0;
  }

  var manager = this;

  this.master.getActualValues(function(err, res)
  {
    if (manager.readyState !== Glp2Manager.ReadyState.READY || manager.currentState.isInProgress())
    {
      return;
    }

    if (err)
    {
      if (err instanceof glp2.ResponseTimeoutError)
      {
        ++timeouts;
      }
      else
      {
        timeouts = 0;
      }

      if (timeouts < 5)
      {
        manager.programmer.error("[glp2] Failed to monitor actual values: %s", err.message);
      }

      return setTimeout(manager.monitorActualValues, 1337, timeouts);
    }

    if (res && res.faultStatus === glp2.FaultStatus.NO_TEST_STEP_DEFINED)
    {
      manager.requestStart();
    }

    return setImmediate(manager.monitorActualValues, 0);
  });
};

/**
 * @private
 */
Glp2Manager.prototype.onAppStarted = function()
{
  var manager = this;

  this.start(function(err)
  {
    if (err)
    {
      return manager.programmer.debug("[glp2] Failed to start after app started: %s", err.message);
    }
  });
};

/**
 * @private
 * @param {object} changes
 */
Glp2Manager.prototype.onSettingsChanged = function(changes)
{
  if (changes.glp2Enabled === undefined
    && changes.glp2ComPattern === undefined
    && changes.glp2ComAddress === undefined
    && changes.licenseInfo === undefined)
  {
    return;
  }

  var manager = this;

  this.stop(function(err)
  {
    if (err)
    {
      return manager.programmer.error("[glp2] Failed to stop after settings changed: %s", err.message);
    }

    manager.start(function(err)
    {
      if (err)
      {
        return manager.programmer.error("[glp2] Failed to start after settings change: %s", err.message);
      }
    });
  });
};

/**
 * @private
 */
Glp2Manager.prototype.onProgrammerFinished = function()
{
  if (!this.settings.get('glp2Enabled'))
  {
    return;
  }

  this.readyState = Glp2Manager.ReadyState.READY;

  var manager = this;

  this.reset(function(err)
  {
    if (err)
    {
      manager.programmer.error("[glp2] Failed to reset the tester after programming: %s", err.message);
    }
  });
};

/**
 * @private
 */
Glp2Manager.prototype.onMasterOpen = function()
{
  this.stopCloseAfterErrorTimer();

  this.emit('open');

  var manager = this;

  this.reset(function(err)
  {
    if (err)
    {
      manager.programmer.error("[glp2] Failed to reset the tester after connecting: %s", err.message);
    }
    else
    {
      manager.getDeviceOptions();
    }
  });
};

Glp2Manager.prototype.getDeviceOptions = function()
{
  if (!this.master)
  {
    return;
  }

  var manager = this;

  this.master.getDeviceOptions(function(err, res)
  {
    if (err)
    {
      return manager.programmer.error("[GLP2] Failed to get device options: %s", err.message);
    }

    manager.deviceOptions = res.deviceOptions;
    manager.softwareVersion = res.getSoftwareVersion();

    manager.programmer.debug("[GLP2] Device options:", manager.deviceOptions);
  });
};

/**
 * @private
 */
Glp2Manager.prototype.startCloseAfterErrorTimer = function()
{
  if (this.closeAfterErrorTimer === null)
  {
    this.closeAfterErrorTimer = setTimeout(this.onMasterClose.bind(this), 1000);
  }
};

/**
 * @private
 */
Glp2Manager.prototype.stopCloseAfterErrorTimer = function()
{
  if (this.closeAfterErrorTimer !== null)
  {
    clearTimeout(this.closeAfterErrorTimer);
    this.closeAfterErrorTimer = null;
  }
};

/**
 * @private
 * @param {Error} err
 */
Glp2Manager.prototype.onMasterError = function(err)
{
  this.stopCloseAfterErrorTimer();
  this.startCloseAfterErrorTimer();

  this.programmer.error("[glp2] %s", err.message);

  this.emit('error', err);
};

/**
 * @private
 */
Glp2Manager.prototype.onMasterClose = function()
{
  this.stopCloseAfterErrorTimer();

  if (this.readyState !== Glp2Manager.ReadyState.STOPPED)
  {
    this.readyState = Glp2Manager.ReadyState.DISCONNECTED;
  }

  if (this.master)
  {
    this.master.removeListener('open', this.onMasterOpen);
    this.master.removeListener('error', this.onMasterError);
    this.master.removeListener('close', this.onMasterClose);
    this.master.removeListener('tx', this.onMasterTx);
    this.master.removeListener('rx', this.onMasterRx);
    this.master.on('error', function() {});
    this.master.close();
    this.master = null;
  }

  this.programmer.debug("[glp2] Closed.");

  this.emit('close');
};

/**
 * @private
 * @param {Buffer} buffer
 */
Glp2Manager.prototype.onMasterTx = function(buffer)
{
  this.emit('tx', buffer);
};

/**
 * @private
 * @param {Buffer} buffer
 */
Glp2Manager.prototype.onMasterRx = function(buffer)
{
  this.emit('rx', buffer);
};

/**
 * @private
 * @param {Error|null} err
 * @param {function(Error|null): void} done
 */
Glp2Manager.prototype.onReady = function(err, done)
{
  if (!this.master)
  {
    if (this.readyState === Glp2Manager.ReadyState.RESETTING)
    {
      this.readyState = Glp2Manager.ReadyState.DISCONNECTED;
    }

    return done(new Error("No connection."));
  }

  if (err)
  {
    done(err);

    this.master.close();

    return;
  }

  this.readyState = Glp2Manager.ReadyState.READY;

  this.programmer.debug("[glp2] Ready.");

  setImmediate(done);

  this.monitorActualValues();

  this.emit('ready');
};
