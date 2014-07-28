// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var serialport = require('serialport');
var step = require('h5.step');

var EOF_DELAY = 250;
var PROPERTY_PARSERS = {
  'historysize': createSingleNumberParser('historysize', 0, 366),
  'history': createDoubleNumberParser('history', 0, 366, 0, 1440),
  'reqnights': createSingleNumberParser('reqnights', 0, 366),
  'minnightdur': createSingleNumberParser('minnightdur', 0, 1440),
  'maxnightdur': createSingleNumberParser('maxnightdur', 0, 1440),
  'maxnightdelta': createSingleNumberParser('maxnightdelta', 0, 1440),
  'periodsize': createSingleNumberParser('periodsize', 0, 16),
  'dimlevel': createDoubleNumberParser('dimlevel', 0, 16, 0, 0xFFFF),
  'dimdur': createDoubleNumberParser('dimdur', 0, 15, -0xFFFF, 0xFFFF),
  'fadetime': createSingleNumberParser('fadetime', 0, 536)
};

module.exports = function programSolDriver(app, programmerModule, done)
{
  var settings = app[programmerModule.config.settingsId];
  var currentState = programmerModule.currentState;
  var commands = [];

  programmerModule.log('SOL_STARTED');

  var licenseInfo = settings.get('licenseInfo');

  if (!licenseInfo || !(licenseInfo.features & 2))
  {
    return done('SOL_FEATURE_DISABLED');
  }

  try
  {
    commands = parseProgram(currentState.feature);
  }
  catch (err)
  {
    programmerModule.log('SOL_PARSE_ERROR', err);

    return done('SOL_PARSE_ERROR');
  }

  if (commands.length === 0)
  {
    return done('SOL_NO_COMMANDS');
  }

  step(
    function findComPortStep()
    {
      /*jshint validthis:true*/

      var comPattern = settings.get('solComPattern');

      programmerModule.log('SOL_SEARCHING_COM', {pattern: comPattern});

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
      /*jshint validthis:true*/

      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (err)
      {
        err.code = 'SOL_SEARCHING_COM_FAILURE';

        return this.skip(err);
      }

      if (comPort === null)
      {
        return this.skip('SOL_COM_NOT_FOUND');
      }

      programmerModule.log('SOL_OPENING_COM', {comPort: comPort});

      var serialPort = this.serialPort = new serialport.SerialPort(comPort, {
        baudRate: 1200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      }, false);

      serialPort.on('error', function(err)
      {
        if (!serialPort.errored)
        {
          serialPort.errored = err;
        }
      });

      serialPort.open(this.next());
    },
    function setNumberBaseStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (this.serialPort.errored)
      {
        return this.skip();
      }

      if (err)
      {
        err.code = 'SOL_OPENING_COM_FAILURE';

        return this.skip(err);
      }

      this.output = [];

      var next = this.next();

      execCommand(programmerModule, this.serialPort, this.output, 'set base 10', function(err, result)
      {
        return next(result === '10' ? null : 'SOL_NO_CONNECTION');
      });
    },
    function execSetCommandsStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (this.serialPort.errored)
      {
        return this.skip();
      }

      if (err)
      {
        return this.skip(err);
      }

      programmerModule.log('SOL_EXECUTING_SET_COMMANDS', {count: commands.length});

      var steps = [];

      for (var i = 0, l = commands.length; i < l; ++i)
      {
        steps.push(createExecSetCommandStep(programmerModule, this.serialPort, this.output, commands[i]));
      }

      steps.push(this.next());

      step(steps);
    },
    function resetDeviceStep()
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (this.serialPort.errored)
      {
        return this.skip();
      }

      if (!settings.get('solReset'))
      {
        return;
      }

      programmerModule.log('SOL_RESETTING');

      var next = this.next();

      execCommand(programmerModule, this.serialPort, this.output, 'do reset', setTimeout.bind(null, next, 1000));
    },
    function execGetCommandsStep()
    {
      if (programmerModule.cancelled)
      {
        return this.skip('CANCELLED');
      }

      if (this.serialPort.errored)
      {
        return this.skip();
      }

      programmerModule.log('SOL_EXECUTING_GET_COMMANDS');

      var steps = [
        createExecGetCommandStep(programmerModule, this.serialPort, this.output, {
          option: 'version',
          setCmd: null,
          getCmd: 'get version',
          result: null
        })
      ];

      for (var i = 0, l = commands.length; i < l; ++i)
      {
        steps.push(createExecGetCommandStep(programmerModule, this.serialPort, this.output, commands[i]));
      }

      steps.push(this.next());

      step(steps);
    },
    function closeComPortStep(err)
    {
      if (Array.isArray(this.output))
      {
        programmerModule.changeState({
          output: this.output.join('\n')
        });

        this.output = null;
      }

      var serialPort = this.serialPort;

      if (serialPort)
      {
        this.serialPort = null;

        if (!err && serialPort.errored)
        {
          err = serialPort.errored;
          err.code = 'SOL_SERIAL_PORT_FAILURE';
        }

        serialPort.close(function()
        {
          serialPort.removeAllListeners();
          serialPort = null;
        });
      }

      setImmediate(function() { done(err); });
    }
  );
};

function createExecSetCommandStep(programmerModule, serialPort, output, command)
{
  return function execSetCommandStep()
  {
    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (serialPort.errored)
    {
      return this.skip();
    }

    execCommand(programmerModule, serialPort, output, command.setCmd, this.next());
  };
}

function createExecGetCommandStep(programmerModule, serialPort, output, command)
{
  return function execGetCommandStep(err)
  {
    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (serialPort.errored || err)
    {
      return this.skip(err);
    }

    var next = this.next();

    execCommand(programmerModule, serialPort, output, command.getCmd, function(err, result)
    {
      if (command.result !== null && String(command.result) !== result)
      {
        programmerModule.log('SOL_INVALID_OPTION', {
          option: command.option,
          expected: command.result,
          actual: result
        });

        return next('SOL_INVALID_OPTION');
      }

      return next();
    });
  };
}

function execCommand(programmerModule, serialPort, output, cmd, done)
{
  output.push('TX: ' + cmd);

  var buffers = [];
  var totalLength = 0;
  var eofTimer = null;

  serialPort.on('data', function(data)
  {
    buffers.push(data);
    totalLength += data.length;

    if (programmerModule.cancelled || serialPort.errored)
    {
      finalize();
    }
    else
    {
      restartEofTimer();
    }
  });

  serialPort.write(new Buffer(cmd + '\r', 'ascii'));

  restartEofTimer();

  function restartEofTimer()
  {
    clearTimeout(eofTimer);
    eofTimer = setTimeout(finalize, EOF_DELAY);
  }

  function finalize()
  {
    clearTimeout(eofTimer);
    eofTimer = null;

    serialPort.removeAllListeners('data');

    var result = '';

    Buffer.concat(buffers, totalLength).toString('ascii').split('\r').forEach(function(line)
    {
      line = line.trim();

      if (line.length > 0)
      {
        result += line + '\n';

        output.push('RX: ' + line);
      }
    });

    done(null, result.trim());
  }
}

function parseProgram(source)
{
  return source
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map(parseCommand)
    .filter(function(cmd) { return cmd !== null; });
}

function parseCommand(line, i)
{
  var args = line.trim().split(/\s+/);
  var name = args.shift();
  var prop = args.shift();

  if (name === 'set' && PROPERTY_PARSERS[prop])
  {
    return PROPERTY_PARSERS[prop](line, i, args);
  }

  return null;
}

function throwParseError(line, i, prop)
{
  throw {
    line: line,
    i: i + 1,
    prop: prop
  };
}

function createSingleNumberParser(option, minValue, maxValue)
{
  return function parseSingleNumber(line, i, args)
  {
    var value = parseInt(args[0]);

    if (isNaN(value) || value < (minValue || 0) || value > (maxValue || 0xFFFF))
    {
      throwParseError(line, i, option);
    }

    return {
      option: option,
      setCmd: 'set ' + option + ' ' + value,
      getCmd: 'get ' + option,
      result: value
    };
  };
}

function createDoubleNumberParser(option, minIndex, maxIndex, minValue, maxValue)
{
  return function parseDimLevel(line, i, args)
  {
    var index = parseInt(args[0]);

    if (isNaN(index) || index < (minIndex || 0) || index > (maxIndex || 0xFF))
    {
      throwParseError(line, i, option);
    }

    var value = args[1];

    if (/^[0-9]+(\.[0-9]+)?%$/.test(value))
    {
      value = Math.round(parseFloat(value) * (maxValue || 0xFFFF) / 100);
    }
    else
    {
      value = parseInt(value);
    }

    if (isNaN(value) || value < (minValue || 0) || value > (maxValue || 0xFFFF))
    {
      throwParseError(line, i, option);
    }

    return {
      option: option + ' ' + index,
      setCmd: 'set ' + option + ' ' + index + ' ' + value,
      getCmd: 'get ' + option + ' ' + index,
      result: value
    };
  };
}
