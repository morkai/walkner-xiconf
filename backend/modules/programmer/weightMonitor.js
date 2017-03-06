// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

const net = require('net');
const _ = require('lodash');
const BufferQueueReader = require('h5.buffers').BufferQueueReader;

module.exports = function setUpWeightMonitor(app, programmerModule)
{
  const REQUEST_BUFFER = new Buffer([0x53, 0x78, 0x33, 0x0D, 0x0A]);
  const WALKNER_RESPONSE_RE = /(-?[0-9]+(?:\.[0-9]+)?)/g;

  const settings = app[programmerModule.config.settingsId];
  const currentState = programmerModule.currentState;
  const responseBuffer = new BufferQueueReader();
  const weightBuffer = [];
  let socket = null;
  let isConnected = false;
  let wasConnected = true;
  let connectTimer = null;
  let idleTimer = null;

  programmerModule.isWeightConnected = function()
  {
    return isConnected;
  };

  programmerModule.tareWeight = function(done)
  {
    if (settings.get('weightPort') !== 1337)
    {
      return done(new Error('NOT_SUPPORTED'));
    }

    destroyConnection();
    done();
  };

  programmerModule.updateWeight = function(changes)
  {
    programmerModule.changeState({weight: _.defaults({}, changes, currentState.weight)});
  };

  programmerModule.checkWeightScanResult = function(orderNo, raw)
  {
    if (currentState.waitingForContinue !== 'weight:scanning')
    {
      return;
    }

    var matches = raw.match(/([0-9]{12})/);

    programmerModule.changeState({
      waitingForContinue: 'weight:weighing',
      weight: _.defaults({
        scan: raw,
        nc12: matches ? matches[1] : null,
        orderNo: orderNo
      }, currentState.weight)
    });
  };

  programmerModule.selectComponentWeight = function(index)
  {
    if (currentState.waitingForComponentWeight
      && currentState.waitingForComponentWeight[index])
    {
      programmerModule.updateWeight({component: currentState.waitingForComponentWeight[index]});
      programmerModule.changeState({waitingForComponentWeight: null});
    }
  };

  app.broker.subscribe('app.started', createConnection).setLimit(1);
  app.broker.subscribe('settings.changed', handleSettingsChange);

  function handleSettingsChange(changes)
  {
    if (changes.weightEnabled !== undefined
      || changes.weightHost !== undefined
      || changes.weightPort !== undefined)
    {
      destroyConnection();
    }
  }

  function startIdleTimer()
  {
    if (idleTimer)
    {
      clearTimeout(idleTimer);
    }

    idleTimer = setTimeout(destroyConnection, 1000);
  }

  function destroyConnection()
  {
    updateState(false, 0);

    isConnected = false;
    wasConnected = false;

    if (connectTimer)
    {
      clearTimeout(connectTimer);
      connectTimer = null;
    }

    if (idleTimer)
    {
      clearTimeout(idleTimer);
      idleTimer = null;
    }

    if (!socket)
    {
      return;
    }

    responseBuffer.skip();

    socket.removeAllListeners();
    socket.destroy();
    socket.on('error', () => {});
    socket = null;

    connectTimer = setTimeout(createConnection, 1000);
  }

  function createConnection()
  {
    connectTimer = null;

    if (!settings.get('weightEnabled'))
    {
      return;
    }

    const host = settings.get('weightHost');
    const port = settings.get('weightPort');

    if (_.isEmpty(host) || !_.isEmpty(port))
    {
      return;
    }

    socket = new net.Socket();

    socket.on('connect', onConnect);
    socket.on('error', onError);
    socket.on('close', onClose);
    socket.on('readable', onReadable);

    if (wasConnected)
    {
      programmerModule.debug(`[weight] Connecting to: ${settings.get('weightHost')}:${settings.get('weightPort')}...`);
    }

    socket.connect(port, host);
  }

  function onConnect()
  {
    programmerModule.debug(`[weight] Connected.`);

    wasConnected = true;

    sendRequest();
  }

  function onError(err)
  {
    if (wasConnected)
    {
      programmerModule.error(`[weight] ${err.message}`);
    }

    destroyConnection();
  }

  function onClose()
  {
    programmerModule.debug(`[weight] Connection closed.`);

    destroyConnection();
  }

  function onReadable()
  {
    if (!socket)
    {
      return;
    }

    const data = socket.read();

    if (data !== null)
    {
      isConnected = true;

      responseBuffer.push(data);

      handleResponse();
    }
  }

  function sendRequest()
  {
    if (socket && settings.get('weightPort') !== 1337)
    {
      socket.write(REQUEST_BUFFER);
    }
  }

  function handleResponse()
  {
    if (settings.get('weightPort') === 1337)
    {
      handleWalknerResponse();
    }
    else
    {
      handleAxisResponse();
    }

    startIdleTimer();
  }

  function handleWalknerResponse()
  {
    if (responseBuffer.length < 2 || responseBuffer.readByte(responseBuffer.length - 1) !== 0x0A)
    {
      return;
    }

    const response = responseBuffer.shiftString(responseBuffer.length, 'utf8');
    let matches = null;

    while ((matches = WALKNER_RESPONSE_RE.exec(response)) !== null)
    {
      handleWalknerReading(parseFloat(matches[1]));
    }
  }

  function handleWalknerReading(reading)
  {
    if (reading < 0)
    {
      reading = 0;
    }

    weightBuffer.push(Math.round(reading / settings.get('weightRefUnit') * 10) / 10);

    if (weightBuffer.length < 5)
    {
      return;
    }

    if (weightBuffer.length > 6)
    {
      weightBuffer.shift();
    }

    const latestValue = weightBuffer[weightBuffer.length - 1];
    let stabilized = true;

    for (let i = 0; i < 4; ++i)
    {
      const prevValue = weightBuffer[i];

      if (Math.abs(latestValue - prevValue) > 0.25)
      {
        stabilized = false;

        break;
      }
    }

    updateState(stabilized, latestValue);
  }

  function handleAxisResponse()
  {
    if (responseBuffer.length > 2
      && responseBuffer.readByte(responseBuffer.length - 2) === 0x0D
      && responseBuffer.readByte(responseBuffer.length - 1) === 0x0A)
    {
      const response = responseBuffer.shiftString(responseBuffer.length, 'ascii');
      const matches = response.match(/(U|S)\s*(-?[0-9]+(?:\.[0-9]+)?)\s*g/);

      if (matches)
      {
        updateState(matches[1] === 'S', parseFloat(matches[2]));
      }

      setTimeout(sendRequest, 200);
    }
  }

  function updateState(stabilized, value)
  {
    if (value < 0)
    {
      value = 0;
    }

    if (currentState.weight.stabilized !== stabilized
      || Math.round(currentState.weight.value * 100) !== Math.round(value * 100))
    {
      const weight = {
        time: Date.now(),
        value: value,
        stabilized: stabilized
      };

      programmerModule.updateWeight(weight);

      app.broker.publish('programmer.componentWeighed', weight);
    }
  }

  programmerModule.updateWeightState = updateState;
};
