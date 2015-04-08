// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var _ = require('lodash');

module.exports = function setUpProgrammerCommands(app, programmerModule)
{
  var settings = app[programmerModule.config.settingsId];
  var sio = app[programmerModule.config.sioId];

  [
    'programmer.stateChanged',
    'programmer.logged',
    'programmer.stepProgressed',
    'programmer.ledUpdated'
  ].forEach(function(topic)
  {
    app.broker.subscribe(topic, function(message)
    {
      sio.emit(topic, message);
    });
  });

  sio.on('connection', function(socket)
  {
    socket.emit('programmer.stateChanged', programmerModule.currentState.toJSON());

    socket.on('programmer.getCurrentState', getCurrentState);

    if (socket.conn.remoteAddress === '127.0.0.1')
    {
      socket.on('programmer.setInputMode', setInputMode);
      socket.on('programmer.setWorkMode', setWorkMode);
      socket.on('programmer.setProgram', setProgram);
      socket.on('programmer.selectOrderNo', selectOrderNo);
      socket.on('programmer.selectNc12', selectNc12);
      socket.on('programmer.checkSerialNumber', checkSerialNumber);
      socket.on('programmer.start', start);
      socket.on('programmer.cancel', cancel);
      socket.on('programmer.continue', continueProcess);
      socket.on('programmer.reload', reload);
      socket.on('programmer.reset', reset);
      socket.on('programmer.printServiceTags', printServiceTags);
      socket.on('programmer.reconnectToProdLine', reconnectToProdLine);
    }
  });

  function getCurrentState(reply)
  {
    if (_.isFunction(reply))
    {
      reply(programmerModule.currentState.toJSON());
    }
  }

  function setInputMode(inputMode, password, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (settings.get('protectInputMode') && password !== settings.get('password'))
    {
      return reply(new Error('INVALID_PASSWORD'));
    }

    programmerModule.setInputMode(inputMode, reply);
  }

  function setWorkMode(workMode, reply)
  {
    if (_.isFunction(reply))
    {
      programmerModule.setWorkMode(workMode, reply);
    }
  }

  function setProgram(programId, reply)
  {
    if (_.isFunction(reply))
    {
      programmerModule.setProgram(programId, reply);
    }
  }

  function selectOrderNo(orderNo, reply)
  {
    if (_.isFunction(reply))
    {
      programmerModule.selectOrderNo(orderNo, reply);
    }
  }

  function selectNc12(nc12, password, reply)
  {
    if (_.isFunction(reply))
    {
      programmerModule.selectNc12(nc12, password, reply);
    }
  }

  function checkSerialNumber(orderNo, nc12, serialNumber)
  {
    if (_.isString(orderNo) && /^[0-9]{1,9}$/.test(orderNo)
      && _.isString(nc12) && /^[0-9]{12}$/.test(nc12)
      && _.isString(serialNumber) && /^[0-9]+$/.test(serialNumber))
    {
      programmerModule.checkSerialNumber(orderNo, nc12, serialNumber);
    }
  }

  function start(data, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
    }

    if (!_.isObject(data))
    {
      return reply(new Error('INPUT'));
    }

    if (!/^[0-9]{12}$/.test(data.nc12))
    {
      var isLedOnly = programmerModule.currentState.isLedOnly();
      var hasSolProgramStep = programmerModule.currentState.hasProgramStep('sol');

      if (hasSolProgramStep && !isLedOnly)
      {
        return reply(new Error('INPUT'));
      }
    }

    var orders = programmerModule.currentState.inputMode === 'remote' ? 'required' : settings.get('orders');

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

    reply();

    programmerModule.changeState({waitingForContinue: false});
  }

  function reset(reply)
  {
    if (_.isFunction(reply))
    {
      programmerModule.reset(reply);
    }
  }

  function reload(reply)
  {
    if (_.isFunction(reply))
    {
      programmerModule.reload(reply);
    }
  }

  function printServiceTags(orderNo, items, reply)
  {
    if (!_.isFunction(reply))
    {
      return;
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
    if (_.isFunction(reply))
    {
      programmerModule.remoteCoordinator.connectToProdLine(true);

      setTimeout(reply, 5000);
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
