// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

const net = require('net');
const _ = require('lodash');
const BufferQueueReader = require('h5.buffers').BufferQueueReader;

module.exports = function setUpWeightMonitor(app, programmerModule)
{
  const REQUEST_BUFFER = new Buffer([0x53, 0x78, 0x33, 0x0D, 0x0A]);

  const settings = app[programmerModule.config.settingsId];
  const currentState = programmerModule.currentState;
  const responseBuffer = new BufferQueueReader();
  let socket = null;
  let wasConnected = true;
  let connectTimer = null;
  let idleTimer = null;

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
      responseBuffer.push(data);

      handleResponse();
    }
  }

  function sendRequest()
  {
    if (socket)
    {
      socket.write(REQUEST_BUFFER);
    }
  }

  function handleResponse()
  {
    if (responseBuffer.length > 2
      && responseBuffer.readByte(responseBuffer.length - 2) === 0x0D
      && responseBuffer.readByte(responseBuffer.length - 1) === 0x0A)
    {
      const response = responseBuffer.shiftString(responseBuffer.length, 'ascii');
      const matches = response.match(/(U|S)\s*([0-9]+(?:\.[0-9]+)?)\s*g/);

      if (matches)
      {
        updateState(matches[1] === 'S', parseFloat(matches[2]));
      }

      setTimeout(sendRequest, 200);
    }

    startIdleTimer();
  }

  function updateState(stabilized, value)
  {
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
