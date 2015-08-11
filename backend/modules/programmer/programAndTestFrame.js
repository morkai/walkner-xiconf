// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var net = require('net');
var step = require('h5.step');
var sdp = require('./sdp');
var TcpSerialPort = require('./TcpSerialPort');

module.exports = function programAndTestFrame(app, programmerModule, done)
{
  var DEFAULT_SERIAL_PROXY_PORT = 2000;
  var REQUIRED_VALID_READINGS = 2;

  var settings = app[programmerModule.config.settingsId];

  if (!settings.get('ftEnabled') || !settings.supportsFeature('ft'))
  {
    return done('FT:FEATURE_DISABLED');
  }

  var ftSerialProxyAddress = settings.get('ftSerialProxyAddress').split(':');
  var serialProxyAddress = ftSerialProxyAddress[0];
  var serialProxyPort = +ftSerialProxyAddress[1] || DEFAULT_SERIAL_PROXY_PORT;

  if (!net.isIPv4(serialProxyAddress))
  {
    return done('FT:INVALID_SERIAL_PROXY_ADDRESS');
  }

  step(
    function connectToSer2NetStep()
    {
      programmerModule.log('FT:CONNECTING');

      this.serialPort = new TcpSerialPort(serialProxyAddress, serialProxyPort);
      this.serialPort.on('error', function(err) { programmerModule.error("[ft] %s", err.message); });
      this.serialPort.open(this.next());
    },
    function handleConnectToSer2NetStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        err.code = 'FT:CONNECTING_FAILURE';

        return this.skip(err);
      }
    },
    function createSdpMasterStep()
    {
      this.sdpMaster = new sdp.Master({
        serialPort: this.serialPort
      });
    },
    function resetSdpMasterStep()
    {
      if (programmerModule.cancelled)
      {
        return this.skip();
      }

      resetSdpMaster(this.sdpMaster, this.next());
    },
    function handleResetSdpMasterStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip('FT:' + err.message);
      }
    },
    function programStep()
    {
      if (programmerModule.cancelled)
      {
        return this.skip();
      }

      programmerModule.log('FT:PROGRAMMING');

      step(
        createSdpCommandStep(true, this.sdpMaster, 'CURR', settings.get('ftSetCurrent')),
        createSdpCommandStep(true, this.sdpMaster, 'VOLT', settings.get('ftSetVoltage')),
        createSdpCommandStep(true, this.sdpMaster, 'SOUT', true),
        this.next()
      );
    },
    function handleProgramStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip('FT:' + err.message);
      }
    },
    function monitorProgressStep()
    {
      programmerModule.log('FT:CHECKING');

      var nextStep = this.next();
      var sdpMaster = this.sdpMaster;
      var duration = settings.get('ftDuration');
      var startTime = Date.now();
      var endTime = startTime + duration;
      var maxR = settings.get('ftMaxResistance');
      var validReadings = 0;

      setImmediate(getCurrentReadings);

      function getCurrentReadings()
      {
        if (programmerModule.cancelled)
        {
          return nextStep();
        }

        sdpMaster.GETD(function(err, res)
        {
          if (programmerModule.cancelled || err)
          {
            programmerModule.updateStepProgress(0, {
              status: 'failure'
            });

            return nextStep(err);
          }

          var r = res.current ? (res.voltage / res.current) : 0;

          if (r > 0 && r < maxR)
          {
            validReadings += 1;
          }
          else
          {
            validReadings = 0;
          }

          if (validReadings === REQUIRED_VALID_READINGS)
          {
            programmerModule.updateStepProgress(0, {
              status: 'success'
            });

            return nextStep();
          }

          var now = Date.now();

          if (now >= endTime)
          {
            programmerModule.updateStepProgress(0, {
              status: 'failure',
              progress: 100
            });

            return nextStep('FT:PE_FAILURE');
          }

          programmerModule.updateStepProgress(0, {
            status: 'active',
            progress: Math.min((now - startTime) / duration * 100, 100)
          });

          setTimeout(getCurrentReadings, 200);
        });
      }
    },
    function finalizeStep(err)
    {
      var sdpMaster = this.sdpMaster;
      var serialPort = this.serialPort;

      this.sdpMaster = null;
      this.serialPort = null;

      resetSdpMaster(sdpMaster, function()
      {
        if (sdpMaster)
        {
          sdpMaster.destroy();
        }

        serialPort.destroy();

        done(err);
      });
    }
  );

  function resetSdpMaster(sdpMaster, done)
  {
    if (!sdpMaster)
    {
      return setImmediate(done);
    }

    programmerModule.log('FT:RESETTING');

    step(
      createSdpCommandStep(false, sdpMaster, 'SOUT', false),
      createSdpCommandStep(false, sdpMaster, 'SOVP', settings.get('ftMaxVoltage')),
      createSdpCommandStep(false, sdpMaster, 'VOLT', 0),
      createSdpCommandStep(false, sdpMaster, 'CURR', 0),
      done
    );
  }

  function createSdpCommandStep(allowCancel, sdpMaster, command)
  {
    var commandArgs = Array.prototype.slice.call(arguments, 3);

    return function execSdpCommandStep(err)
    {
      if (allowCancel && programmerModule.cancelled)
      {
        return this.skip();
      }

      if (err)
      {
        return this.skip(err);
      }

      commandArgs.push(this.next());

      sdpMaster[command].apply(sdpMaster, commandArgs);
    };
  }
};
