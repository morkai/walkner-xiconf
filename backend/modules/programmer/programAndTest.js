// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var serialport = require('serialport');
var step = require('h5.step');
var modbus = require('h5.modbus');
var sdp = require('./sdp');
var programSolDriver = require('./programSolDriver');

module.exports = function programAndTest(app, programmerModule, done)
{
  var MODBUS_UNIT = 0x01;
  var MODBUS_COILS_STARTING_ADDRESS = 0x0500;
  var CURRENT_READINGS_INTERVAL = 200;

  var settings = app[programmerModule.config.settingsId];
  var currentState = programmerModule.currentState;

  programmerModule.log('TESTING_STARTED', {program: currentState.program.name});

  if (!settings.supportsFeature('t24vdc'))
  {
    return done('T24VDC_FEATURE_DISABLED');
  }

  var serialPortError = null;
  var modbusError = null;

  step(
    function findComPortStep()
    {
      this.output = [];
      this.metrics = [];

      var comPattern = settings.get('testingComPattern');

      programmerModule.log('TESTING_SEARCHING_COM', {pattern: comPattern});

      var next = this.next();

      serialport.list(function(err, ports)
      {
        if (err)
        {
          return next(err);
        }

        for (var i = 0, l = ports.length; i < l; ++i)
        {
          var port = ports[i];
          var keys = Object.keys(port);

          for (var ii = 0, ll = keys.length; ii < ll; ++ii)
          {
            var key = keys[ii];

            if (typeof port[key] === 'string' && port[key].indexOf(comPattern) !== -1)
            {
              return next(null, port.comName);
            }
          }
        }

        return next(null, null);
      });
    },
    function openComPortStep(err, comPort)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (err)
      {
        err.code = 'TESTING_SEARCHING_COM_FAILURE';

        return this.skip(err);
      }

      if (comPort === null)
      {
        return this.skip('TESTING_COM_NOT_FOUND');
      }

      programmerModule.log('TESTING_OPENING_COM', {comPort: comPort});

      var serialPort = this.serialPort = new serialport.SerialPort(comPort, {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      }, false);

      serialPort.once('error', function(err)
      {
        serialPortError = err;
      });

      serialPort.open(this.next());
    },
    function createSdpMasterStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (serialPortError)
      {
        return this.skip();
      }

      if (err)
      {
        err.code = 'TESTING_OPENING_COM_FAILURE';

        return this.skip(err);
      }

      programmerModule.log('TESTING_SDP_SETUP');

      var output = this.output;
      var sdpMaster = this.sdpMaster = new sdp.Master({
        serialPort: this.serialPort,
        address: settings.get('testingComAddress'),
        timeout: settings.get('testingComTimeout')
      });
      var skipNextOutputLine = false;

      sdpMaster.on('tx', function(reqBuffer)
      {
        var resString = reqBuffer.toString();

        if (/^GETD/.test(resString))
        {
          skipNextOutputLine = true;

          return;
        }

        output.push('[SDP] TX: ' + reqBuffer.toString());
      });

      sdpMaster.on('rx', function(resBuffer)
      {
        if (skipNextOutputLine)
        {
          skipNextOutputLine = false;

          return;
        }

        output.push('[SDP] RX: ' + resBuffer.toString().replace(/\r/g, ' ').trim());
      });

      output.push('[SDP] SETUP');

      resetSdpMaster(sdpMaster, this.next());
    },
    function createModbusMasterStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (serialPortError)
      {
        return this.skip();
      }

      if (err)
      {
        return this.skip(err);
      }

      if (!settings.get('testingModbusEnabled'))
      {
        return;
      }

      var output = this.output;
      var modbusMaster = this.modbusMaster = modbus.createMaster({
        transport: {
          type: 'ip',
          connection: {
            type: 'tcp',
            host: settings.get('testingModbusHost'),
            port: settings.get('testingModbusPort'),
            autoConnect: false,
            autoReconnect: false
          }
        },
        suppressTransactionErrors: true,
        retryOnException: false,
        maxConcurrentRequests: 1
      });
      var modbusConnection = modbusMaster.getConnection();
      var next = this.next();

      modbusMaster.on('error', function() {});

      modbusConnection.once('open', onConnectSuccess);
      modbusConnection.once('close', onConnectFailure);
      modbusConnection.once('error', onConnectFailure);

      programmerModule.log('TESTING_PLC_SETUP');

      output.push('[PLC] SETUP');

      modbusConnection.connect();

      function cleanUpConnection()
      {
        modbusConnection.removeListener('open', onConnectSuccess);
        modbusConnection.removeListener('close', onConnectFailure);
        modbusConnection.removeListener('error', onConnectFailure);
      }

      function onConnectSuccess()
      {
        cleanUpConnection();

        modbusMaster.once('error', function(err)
        {
          modbusError = err;
        });

        modbusConnection.on('write', function(reqBuffer)
        {
          output.push('[PLC] TX: ' + reqBuffer.toString('hex').toUpperCase().match(/.{2}/g).join(' '));
        });

        modbusConnection.on('data', function(resBuffer)
        {
          output.push('[PLC] RX: ' + resBuffer.toString('hex').toUpperCase().match(/.{2}/g).join(' '));
        });

        resetModbusMaster(modbusMaster, next);
      }

      function onConnectFailure(err)
      {
        err.code = 'TESTING_PLC_NO_CONNECTION';

        cleanUpConnection();
        next(err);
      }
    },
    function executeProgramStepsStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (serialPortError || modbusError)
      {
        return this.skip();
      }

      if (err)
      {
        return this.skip(err);
      }

      var modbusMaster = this.modbusMaster;
      var sdpMaster = this.sdpMaster;
      var output = this.output;
      var metrics = this.metrics;
      var steps = [];

      currentState.program.steps.forEach(function(step, i)
      {
        if (step.enabled)
        {
          steps.push(createExecuteProgramStepStep(step, i, modbusMaster, sdpMaster, output, metrics));
        }
      });

      steps.push(this.next());

      step(steps);
    },
    function tearDownStep(err)
    {
      var output = this.output;
      var metrics = this.metrics;
      var serialPort = this.serialPort;
      var sdpMaster = this.sdpMaster;
      var modbusMaster = this.modbusMaster;

      this.output = null;
      this.metrics = null;
      this.serialPort = null;
      this.sdpMaster = null;
      this.modbusMaster = null;

      if (serialPort && !err && serialPortError)
      {
        err = serialPortError;
        err.code = 'TESTING_SERIAL_PORT_FAILURE';
      }
      else if (modbusMaster && !err && modbusError)
      {
        err = modbusError;
        err.code = 'TESTING_PLC_FAILURE';
      }
      else if (err && /^SDP_/.test(err.message))
      {
        err = 'TESTING_' + err.message;
      }

      tearDownModbusMaster(modbusMaster, sdpMaster, serialPort, output, metrics, err, done);
    }
  );

  function tearDownModbusMaster(modbusMaster, sdpMaster, serialPort, output, metrics, err, done)
  {
    if (!modbusMaster)
    {
      return tearDownSdpMaster(sdpMaster, serialPort, output, metrics, err, done);
    }

    programmerModule.log('TESTING_PLC_TEARDOWN');

    output.push('[PLC] TEARDOWN');

    resetModbusMaster(modbusMaster, function()
    {
      modbusMaster.destroy();

      tearDownSdpMaster(sdpMaster, serialPort, output, metrics, err, done);
    });
  }

  function tearDownSdpMaster(sdpMaster, serialPort, output, metrics, err, done)
  {
    if (!sdpMaster)
    {
      return tearDownSerialPort(serialPort, output, metrics, err, done);
    }

    programmerModule.log('TESTING_SDP_TEARDOWN');

    output.push('[SDP] TEARDOWN');

    resetSdpMaster(sdpMaster, function()
    {
      sdpMaster.destroy();

      tearDownSerialPort(serialPort, output, metrics, err, done);
    });
  }

  function tearDownSerialPort(serialPort, output, metrics, err, done)
  {
    if (!serialPort)
    {
      return tearDown(output, metrics, err, done);
    }

    serialPort.close(function()
    {
      serialPort.removeAllListeners();
      serialPort = null;

      tearDown(output, metrics, err, done);
    });
  }

  function tearDown(output, rawMetrics, err, done)
  {
    if (Array.isArray(output))
    {
      programmerModule.changeState({
        output: output.join('\n')
      });
    }

    var metricsInS = {
      count: 0,
      s: 0,
      uSet: 0,
      uGet: 0,
      i: 0
    };

    for (var i = 0; i < rawMetrics.length; ++i)
    {
      var metricsInMs = rawMetrics[i];

      if (metricsInMs.s === metricsInS.s)
      {
        metricsInS.count += 1;
        metricsInS.uSet += metricsInMs.uSet;
        metricsInS.uGet += metricsInMs.uGet;
        metricsInS.i += metricsInMs.i;
      }
      else
      {
        pushMetrics(metricsInS);

        metricsInS = {
          count: 1,
          s: metricsInMs.s,
          uSet: metricsInMs.uSet,
          uGet: metricsInMs.uGet,
          i: metricsInMs.i
        };
      }
    }

    pushMetrics(metricsInS);

    done(err);
  }

  function pushMetrics(metricsInS)
  {
    var metrics = programmerModule.currentState.metrics;

    metrics.uSet.push((Math.round(metricsInS.uSet / metricsInS.count * 100) / 100) || 0);
    metrics.uGet.push((Math.round(metricsInS.uGet / metricsInS.count * 100) / 100) || 0);
    metrics.i.push((Math.round(metricsInS.i / metricsInS.count * 100) / 100) || 0);
  }

  function resetSdpMaster(sdpMaster, done)
  {
    step(
      createSdpCommandStep(false, sdpMaster, 'SOUT', false),
      createSdpCommandStep(false, sdpMaster, 'SOVP', settings.get('testingMaxVoltage')),
      createSdpCommandStep(false, sdpMaster, 'VOLT', 0),
      createSdpCommandStep(false, sdpMaster, 'CURR', 0),
      done
    );
  }

  function resetModbusMaster(modbusMaster, done)
  {
    switchCoils(modbusMaster, false, false, done);
  }

  function switchCoils(modbusMaster, peCoil, fnCoil, done)
  {
    if (!modbusMaster)
    {
      return setImmediate(done);
    }

    var states = [peCoil, fnCoil];
    var options = {
      unit: MODBUS_UNIT,
      timeout: 100,
      maxRetries: 2,
      onComplete: function(err, res)
      {
        if (res && res.isException())
        {
          err = new Error(res.toString());
        }

        if (err)
        {
          if (this.shouldRetry())
          {
            return;
          }

          err.code = 'TESTING_PLC_FAILURE';
        }

        setImmediate(function() { done(err); });
      }
    };

    modbusMaster.writeMultipleCoils(MODBUS_COILS_STARTING_ADDRESS, states, options);
  }

  function createSwitchCoilsStep(modbusMaster, peCoil, fnCoil)
  {
    return function switchCoilsStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (err)
      {
        return this.skip(err);
      }

      switchCoils(modbusMaster, peCoil, fnCoil, this.next());
    };
  }

  function createSdpCommandStep(allowCancel, sdpMaster, command)
  {
    var commandArgs = Array.prototype.slice.call(arguments, 3);

    return function execSdpCommandStep(err)
    {
      if (allowCancel && programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (err)
      {
        return this.skip(err);
      }

      commandArgs.push(this.next());

      sdpMaster[command].apply(sdpMaster, commandArgs);
    };
  }

  function createExecuteProgramStepStep(step, stepIndex, modbusMaster, sdpMaster, output, metrics)
  {
    if (step.type === 'pe')
    {
      return createExecutePeStepStep(step, stepIndex, modbusMaster, sdpMaster, metrics);
    }

    if (step.type === 'sol')
    {
      return createExecuteSolStepStep(step, stepIndex, modbusMaster, sdpMaster, output, metrics);
    }

    if (step.type === 'fn')
    {
      return createExecuteFnStepStep(step, stepIndex, modbusMaster, sdpMaster, metrics);
    }
  }

  function createExecutePeStepStep(programStep, stepIndex, modbusMaster, sdpMaster, metrics)
  {
    return function executePeStepStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (err)
      {
        return this.skip(err);
      }

      programmerModule.log('TESTING_EXECUTING_STEP', {type: programStep.type, index: stepIndex});

      programmerModule.updateStepProgress(stepIndex, {
        status: 'active',
        progress: 0,
        value: 0
      });

      var nextProgramStep = this.next();

      step(
        createSwitchCoilsStep(modbusMaster, true, false),
        createSdpCommandStep(true, sdpMaster, 'CURR', settings.get('testingCurrent')),
        createSdpCommandStep(true, sdpMaster, 'VOLT', programStep.voltage),
        createSdpCommandStep(true, sdpMaster, 'SOUT', true),
        createMonitorProgressStep(
          programStep,
          stepIndex,
          sdpMaster,
          metrics,
          handlePeStepMetrics.bind(null, programStep.resistanceMax)
        ),
        createFinalizeProgramStep(stepIndex, nextProgramStep)
      );
    };
  }

  function createExecuteSolStepStep(programStep, stepIndex, modbusMaster, sdpMaster, output, metrics)
  {
    return function executeSolStepStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (err)
      {
        return this.skip(err);
      }

      programmerModule.log('TESTING_EXECUTING_STEP', {type: programStep.type, index: stepIndex});

      var lastMetrics = metrics[metrics.length - 1];

      programmerModule.updateStepProgress(stepIndex, {
        status: 'active',
        progress: 0,
        value: lastMetrics ? lastMetrics.uGet : 0
      });

      var nextProgramStep = this.next();

      step(
        createSwitchCoilsStep(modbusMaster, false, true),
        createSdpCommandStep(true, sdpMaster, 'CURR', settings.get('testingCurrent')),
        createSdpCommandStep(true, sdpMaster, 'VOLT', programStep.voltage),
        createSdpCommandStep(true, sdpMaster, 'SOUT', true),
        function monitorProgressStep(err)
        {
          if (programmerModule.cancelled)
          {
            return this.skip('CANCELLED');
          }

          if (err)
          {
            return this.skip(err);
          }

          var monitoringStopped = false;
          var next = this.next();

          programSolDriver(app, programmerModule, output, onSolProgress, function(err)
          {
            monitoringStopped = true;
            next(err);
          });

          monitorReadingsDuringSol(programStep.voltage, sdpMaster, metrics, isMonitoringStopped);

          function onSolProgress(progress)
          {
            programmerModule.updateStepProgress(stepIndex, {progress: progress});
          }

          function isMonitoringStopped()
          {
            return monitoringStopped;
          }
        },
        createFinalizeProgramStep(stepIndex, nextProgramStep)
      );
    };
  }

  function createExecuteFnStepStep(programStep, stepIndex, modbusMaster, sdpMaster, metrics)
  {
    return function executeFnStepStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (err)
      {
        return this.skip(err);
      }

      programmerModule.log('TESTING_EXECUTING_STEP', {type: programStep.type, index: stepIndex});

      programmerModule.updateStepProgress(stepIndex, {
        status: 'active',
        progress: 0,
        value: 0
      });

      var nextProgramStep = this.next();

      step(
        createSwitchCoilsStep(modbusMaster, false, true),
        createSdpCommandStep(true, sdpMaster, 'CURR', settings.get('testingCurrent')),
        createSdpCommandStep(true, sdpMaster, 'VOLT', programStep.voltage),
        createSdpCommandStep(true, sdpMaster, 'SOUT', true),
        createMonitorProgressStep(
          programStep,
          stepIndex,
          sdpMaster,
          metrics,
          handleFnStepMetrics.bind(null, programStep.powerMin, programStep.powerMax)
        ),
        createFinalizeProgramStep(stepIndex, nextProgramStep)
      );
    };
  }

  function monitorReadingsDuringSol(uSet, sdpMaster, metrics, isMonitoringStopped)
  {
    if (isMonitoringStopped())
    {
      return;
    }

    sdpMaster.GETD(function(err, res)
    {
      if (!err)
      {
        metrics.push(createMetrics(uSet, res));
      }

      setTimeout(monitorReadingsDuringSol, CURRENT_READINGS_INTERVAL, uSet, sdpMaster, metrics, isMonitoringStopped);
    });
  }

  function createMonitorProgressStep(programStep, stepIndex, sdpMaster, metrics, metricsHandler)
  {
    return function monitorProgressStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (err)
      {
        return this.skip(err);
      }

      var totalTime = (programStep.startTime + programStep.duration) * 1000;
      var startTime = Date.now();
      var endTime = startTime + totalTime;
      var monitoringStartTime = startTime + (programStep.startTime * 1000);
      var nextStep = this.next();
      var successTimer = this.successTimer = setTimeout(nextStep, totalTime);

      this.cancelSub = app.broker.subscribe('programmer.cancelled', function()
      {
        clearInterval(successTimer);
        nextStep();
      });

      var options = {
        sdpMaster: sdpMaster,
        metrics: metrics,
        stepIndex: stepIndex,
        uSet: programStep.voltage,
        startTime: startTime,
        endTime: endTime,
        monitoringStartTime: monitoringStartTime,
        metricsHandler: metricsHandler
      };

      readCurrentReadings(options, nextStep);
    };
  }

  function createFinalizeProgramStep(stepIndex, done)
  {
    return function finalizeProgramStep(err)
    {
      if (this.successTimer)
      {
        clearTimeout(this.successTimer);
        this.successTimer = null;
      }

      if (this.cancelSub)
      {
        this.cancelSub.cancel();
        this.cancelSub = null;
      }

      if (programmerModule.cancelled)
      {
        err = 'CANCELLED';
      }

      if (err)
      {
        programmerModule.updateStepProgress(stepIndex, {
          status: 'failure'
        });

        return done(err);
      }

      programmerModule.updateStepProgress(stepIndex, {
        status: 'success',
        progress: 100
      });

      setImmediate(done);
    };
  }

  function readCurrentReadings(options, done)
  {
    if (programmerModule.cancelled)
    {
      return done();
    }

    options.sdpMaster.GETD(function(err, res)
    {
      if (programmerModule.cancelled)
      {
        return done();
      }

      if (err)
      {
        return done(err);
      }

      var metrics = createMetrics(options.uSet, res);

      options.metrics.push(metrics);

      var value;

      try
      {
        value = options.metricsHandler(options, metrics);
      }
      catch (err)
      {
        return done(err);
      }

      programmerModule.updateStepProgress(options.stepIndex, {
        progress: Math.round((metrics.time - options.startTime) * 100 / (options.endTime - options.startTime)),
        value: value || 0
      });

      if ((metrics.time + options.sdpMaster.timeoutDelay + CURRENT_READINGS_INTERVAL) < options.endTime)
      {
        setTimeout(readCurrentReadings, CURRENT_READINGS_INTERVAL, options, done);
      }
    });
  }

  function createMetrics(uSet, res)
  {
    var currentTime = Date.now();

    return {
      time: currentTime,
      s: Math.floor((currentTime - programmerModule.currentState.startedAt) / 1000),
      uSet: uSet,
      uGet: res.voltage || 0,
      i: res.current || 0,
      r: res.current ? (res.voltage / res.current) : 0,
      p: res.current ? (res.voltage * res.current) : 0
    };
  }

  function handlePeStepMetrics(rMax, options, metrics)
  {
    if (metrics.time >= options.monitoringStartTime && metrics.r > rMax)
    {
      throw 'TESTING_MAX_RESISTANCE';
    }

    return metrics.r;
  }

  function handleFnStepMetrics(pMin, pMax, options, metrics)
  {
    if (metrics.time >= options.monitoringStartTime)
    {
      if (metrics.p > pMax)
      {
        throw 'TESTING_MAX_POWER';
      }

      if (metrics.p < pMin)
      {
        throw 'TESTING_MIN_POWER';
      }
    }

    return metrics.p;
  }
};
