// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var _ = require('lodash');

module.exports = function setUpProgrammerCommands(app, programmerModule)
{
  var settings = app[programmerModule.config.settingsId];
  var sio = app[programmerModule.config.sioId];
  var localSocketCounter = 0;

  [
    'programmer.stateChanged',
    'programmer.logged',
    'programmer.stepProgressed',
    'programmer.hidLampManager.updated',
    'programmer.ledManager.updated'
  ].forEach(function(topic)
  {
    app.broker.subscribe(topic, function(message)
    {
      sio.emit(topic, message);
    });
  });

  sio.on('connection', function(socket)
  {
    var remoteAddress = socket.conn.remoteAddress;
    var isLocal = remoteAddress === '127.0.0.1' || _.includes(socket.handshake.headers.cookie, 'LOCAL=1');

    programmerModule.debug("[sio] %s client connected: %s", isLocal ? 'Local' : 'Remote', remoteAddress);

    socket.emit('programmer.stateChanged', programmerModule.currentState.toJSON());

    socket.on('programmer.getCurrentState', getCurrentState);
    socket.on('programmer.setInputMode', setInputMode.bind(null, isLocal));
    socket.on('programmer.tareWeight', tareWeight);

    if (isLocal)
    {
      ++localSocketCounter;

      socket.on('disconnect', function() { --localSocketCounter; });

      socket.on('programmer.setWorkMode', setWorkMode);
      socket.on('programmer.setProgram', setProgram);
      socket.on('programmer.selectOrderNo', selectOrderNo);
      socket.on('programmer.selectNc12', selectNc12);
      socket.on('programmer.checkHidScanResult', checkHidScanResult);
      socket.on('programmer.checkWeightScanResult', checkWeightScanResult);
      socket.on('programmer.checkSerialNumber', checkSerialNumber);
      socket.on('programmer.selectComponentWeight', selectComponentWeight);
      socket.on('programmer.start', start);
      socket.on('programmer.cancel', cancel);
      socket.on('programmer.continue', continueProcess);
      socket.on('programmer.reload', reload);
      socket.on('programmer.reset', reset);
      socket.on('programmer.resetHidLamps', resetHidLamps);
      socket.on('programmer.resetLeds', resetLeds);
      socket.on('programmer.printServiceTags', printServiceTags);
      socket.on('programmer.reconnectToProdLine', reconnectToProdLine);
      socket.on('programmer.toggleResult', toggleResult);
    }

    socket.on('disconnect', function()
    {
      programmerModule.debug("[sio] %s client disconnected: %s", isLocal ? 'Local' : 'Remote', remoteAddress);
    });
  });

  function isSingleLocalSocket()
  {
    return localSocketCounter === 1;
  }

  function getCurrentState(reply)
  {
    if (_.isFunction(reply))
    {
      reply(programmerModule.currentState.toJSON());
    }
  }

  function setInputMode(isLocal, inputMode, password, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    var protectInputMode = settings.get('protectInputMode');

    if (!isLocal && !protectInputMode)
    {
      return reply(new Error('INVALID_HOST'));
    }

    if (protectInputMode && password !== settings.get('password'))
    {
      return reply(new Error('INVALID_PASSWORD'));
    }

    if (isLocal && !isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.setInputMode(inputMode, reply);
  }

  function tareWeight(password, reply)
  {
    if (password !== settings.get('password'))
    {
      return reply && reply(new Error('INVALID_PASSWORD'));
    }

    programmerModule.tareWeight(reply || function() {});
  }

  function setWorkMode(workMode, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.setWorkMode(workMode, reply);
  }

  function setProgram(programId, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.setProgram(programId, reply);
  }

  function selectOrderNo(orderNo, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.selectOrderNo(orderNo, reply);
  }

  function selectNc12(nc12, password, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.selectNc12(nc12, password, reply);
  }

  function checkHidScanResult(orderNo, raw, scannerId)
  {
    if (isSingleLocalSocket()
      && _.isString(orderNo) && /^[0-9]{1,9}$/.test(orderNo)
      && _.isString(raw) && /^[0-9]{13}$/.test(raw))
    {
      programmerModule.checkHidScanResult(
        orderNo,
        raw,
        _.isString(scannerId) && /^[A-Z0-9]+$/.test(scannerId) ? scannerId : null
      );
    }
  }

  function checkWeightScanResult(orderNo, raw, scannerId)
  {
    if (isSingleLocalSocket()
      && _.isString(orderNo) && /^[0-9]{1,9}$/.test(orderNo)
      && _.isString(raw) && /[0-9]{12}.+/.test(raw))
    {
      programmerModule.checkWeightScanResult(
        orderNo,
        raw,
        _.isString(scannerId) && /^[A-Z0-9]+$/.test(scannerId) ? scannerId : null
      );
    }
  }

  function selectComponentWeight(index)
  {
    if (isSingleLocalSocket() && _.isNumber(index))
    {
      programmerModule.selectComponentWeight(index);
    }
  }

  function checkSerialNumber(orderNo, raw, nc12, serialNumber, scannerId)
  {
    if (isSingleLocalSocket()
      && _.isString(orderNo) && /^[0-9]{1,9}$/.test(orderNo)
      && _.isString(raw) && !_.isEmpty(raw)
      && _.isString(nc12) && /^[0-9]{12}$/.test(nc12)
      && _.isString(serialNumber) && /^[0-9A-Z?]+$/i.test(serialNumber))
    {
      programmerModule.checkSerialNumber(
        orderNo,
        raw,
        nc12,
        serialNumber,
        _.isString(scannerId) && /^[A-Z0-9]+$/.test(scannerId) ? scannerId : null
      );
    }
  }

  function start(data, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    if (!_.isObject(data))
    {
      return reply(new Error('INPUT'));
    }

    var currentState = programmerModule.currentState;

    if (currentState.workMode === 'testing' && !currentState.program)
    {
      return reply(new Error('NO_PROGRAM'));
    }

    if (!/^[0-9]{12}$/.test(data.nc12))
    {
      var isLedOnly = currentState.isLedOnly();
      var hasSolProgramStep = currentState.hasProgramStep('sol');

      if (hasSolProgramStep && !isLedOnly && settings.get('programming'))
      {
        return reply(new Error('INPUT'));
      }
    }

    var orders = currentState.inputMode === 'remote' ? 'required' : settings.get('orders');

    if (orders === 'required')
    {
      if (!validateOrder(data))
      {
        return reply(new Error('INPUT'));
      }
    }
    else if (orders === 'disabled')
    {
      if (data.orderNo !== null || data.quantity !== null)
      {
        return reply(new Error('INPUT'));
      }
    }
    else if (orders === 'optional')
    {
      if ((data.orderNo !== null || data.quantity !== null) && !validateOrder(data))
      {
        return reply(new Error('INPUT'));
      }
    }
    else
    {
      return reply(new Error('INPUT'));
    }

    programmerModule.start(data, reply);
  }

  function cancel(reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    reply();

    programmerModule.log('CANCELLING');

    if (!programmerModule.cancelled)
    {
      programmerModule.cancelled = true;

      app.broker.publish('programmer.cancelled');
    }
  }

  function continueProcess(reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    reply();

    if (/^weight/.test(programmerModule.currentState.waitingForContinue))
    {
      return;
    }

    programmerModule.changeState({waitingForContinue: null});
  }

  function reset(reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.reset(reply);
  }

  function resetHidLamps(reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.resetHidLamps(reply);
  }

  function resetLeds(reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.resetLeds(reply);
  }

  function reload(reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.reload(reply);
  }

  function printServiceTags(orderNo, items, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    if (!_.isString(orderNo) || !/^[0-9]+$/.test(orderNo) || !_.isString(items) || _.isEmpty(items))
    {
      return reply(new Error('INPUT'));
    }

    var serviceTags = [];
    var serviceTagPrefix = orderNo;

    while (serviceTagPrefix.length < 13)
    {
      serviceTagPrefix = '0' + serviceTagPrefix;
    }

    serviceTagPrefix = 'P' + serviceTagPrefix;

    var re = /([0-9]+)(?:\s*\-\s*([0-9]+))?/g;
    var matches;
    var itemMap = {};

    while ((matches = re.exec(items)) !== null)
    {
      var n1 = parseInt(matches[1], 10);
      var n2 = parseInt(matches[2], 10);

      if (isNaN(n2) || n2 === n1)
      {
        if (n1 === 0 || n1 > 9999)
        {
          return reply(new Error('INPUT'));
        }

        itemMap[n1] = true;

        continue;
      }

      if (n1 > n2)
      {
        var ntmp = n1;
        n1 = n2;
        n2 = ntmp;
      }

      if (n2 - n1 > 100)
      {
        return reply(new Error('INPUT'));
      }

      for (var n = n1; n <= n2; ++n)
      {
        if (n > 9999)
        {
          return reply(new Error('INPUT'));
        }

        itemMap[n] = true;
      }
    }

    var itemNos = Object.keys(itemMap).map(Number);

    if (itemNos.length > 100)
    {
      return reply(new Error('INPUT'));
    }

    itemNos.sort(function(a, b) { return a - b; }).forEach(function(itemNo)
    {
      var serviceTagSuffix = itemNo.toString();

      while (serviceTagSuffix.length < 4)
      {
        serviceTagSuffix = '0' + serviceTagSuffix;
      }

      serviceTags.push(serviceTagPrefix + serviceTagSuffix);
    });

    printNextServiceTag(serviceTags, 0, function(err)
    {
      reply(err, serviceTags.length);
    });
  }

  function printNextServiceTag(serviceTags, i, done)
  {
    if (i === serviceTags.length)
    {
      return done();
    }

    programmerModule.printServiceTag(serviceTags[i], function(err)
    {
      if (err)
      {
        return done(err);
      }

      printNextServiceTag(serviceTags, i + 1, done);
    });
  }

  function reconnectToProdLine(reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!isSingleLocalSocket())
    {
      return reply(new Error('MULTIPLE_LOCAL_SOCKETS'));
    }

    programmerModule.remoteCoordinator.connectToProdLine(true);

    setTimeout(reply, 5000);
  }

  function toggleResult(resultId, state, reply)
  {
    if (_.isFunction(reply))
    {
      programmerModule.toggleResult(resultId, state, reply);
    }
  }

  function validateOrder(data)
  {
    return /^[0-9]{1,9}$/.test(data.orderNo)
      && _.isNumber(data.quantity)
      && data.quantity > 0
      && data.quantity < 9999;
  }
};
