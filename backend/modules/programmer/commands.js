// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var lodash = require('lodash');

module.exports = function setUpProgrammerCommands(app, programmerModule)
{
  var settings = app[programmerModule.config.settingsId];

  app[programmerModule.config.sioId].on('connection', function(socket)
  {
    socket.on('programmer.getCurrentState', getCurrentState);

    if (socket.handshake.address.address === '127.0.0.1')
    {
      socket.on('programmer.switchMode', switchMode);
      socket.on('programmer.pickProgram', pickProgram);
      socket.on('programmer.program', program);
      socket.on('programmer.cancel', cancel);
      socket.on('programmer.resetOrder', resetOrder);
      socket.on('programmer.repeatOrder', repeatOrder);
    }
  });

  function getCurrentState(reply)
  {
    if (lodash.isFunction(reply))
    {
      reply(programmerModule.currentState.toJSON());
    }
  }

  function switchMode(mode, reply)
  {
    if (lodash.isFunction(reply))
    {
      programmerModule.switchMode(mode, reply);
    }
  }

  function pickProgram(programId, reply)
  {
    if (lodash.isFunction(reply))
    {
      programmerModule.pickProgram(programId, reply);
    }
  }

  function program(data, reply)
  {
    if (!lodash.isFunction(reply))
    {
      return;
    }

    if (!lodash.isObject(data) || !/^[0-9]{12}$/.test(data.nc12))
    {
      return reply(new Error('INPUT'));
    }

    var orders = settings.get('orders');

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

    programmerModule.program(data, reply);
  }

  function cancel(reply)
  {
    if (!lodash.isFunction(reply))
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

  function resetOrder(reply)
  {
    if (lodash.isFunction(reply))
    {
      programmerModule.resetOrder(reply);
    }
  }

  function repeatOrder(reply)
  {
    if (lodash.isFunction(reply))
    {
      programmerModule.repeatOrder(reply);
    }
  }

  function validateOrder(data)
  {
    return /^[0-9]{9}$/.test(data.orderNo)
      && lodash.isNumber(data.quantity)
      && data.quantity > 0
      && data.quantity < 1000;
  }
};
