// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var _ = require('lodash');

var REMOTE_CHECK_TIMEOUT_DELAY = 10 * 1000;

module.exports = LedManager;

function LedManager(broker, programmer)
{
  this.broker = broker;
  this.programmer = programmer;
  this.currentState = programmer.currentState;
  this.remoteCoordinator = programmer.remoteCoordinator;

  this.timers = {};
  this.callbacks = {};

  broker.subscribe('programmer.finished', this.cleanUp.bind(this));
}

/**
 * @param {string} orderNo
 * @param {string} nc12
 * @param {string} serialNumber
 */
LedManager.prototype.check = function(orderNo, nc12, serialNumber)
{
  if (!this.currentState.waitingForLeds)
  {
    return;
  }

  var index = this.findIndex(nc12, serialNumber);

  if (index !== -1)
  {
    this.checkIndex(index, orderNo, nc12, serialNumber);
  }
};

/**
 * @private
 * @param {string} nc12
 * @param {string} serialNumber
 */
LedManager.prototype.findIndex = function(nc12, serialNumber)
{
  var leds = this.currentState.leds;
  var nc12Leds = [];
  var allLeds = [];
  var i;

  for (i = 0; i < leds.length; ++i)
  {
    var led = leds[i];

    if (led.serialNumber === serialNumber)
    {
      return i;
    }

    if (led.nc12 === nc12)
    {
      nc12Leds.push(i);
    }

    allLeds.push(i);
  }

  if (!nc12Leds.length)
  {
    nc12Leds = allLeds;
  }

  var nc12LedIndex;
  var nc12Led;

  for (i = 0; i < nc12Leds.length; ++i)
  {
    nc12LedIndex = nc12Leds[i];
    nc12Led = leds[nc12LedIndex];

    if (nc12Led.status === 'waiting')
    {
      return nc12LedIndex;
    }
  }

  for (i = 0; i < nc12Leds.length; ++i)
  {
    nc12LedIndex = nc12Leds[i];
    nc12Led = leds[nc12LedIndex];

    if (typeof nc12Led.status !== 'string')
    {
      return nc12LedIndex;
    }
  }

  for (i = 0; i < nc12Leds.length; ++i)
  {
    nc12LedIndex = nc12Leds[i];
    nc12Led = leds[nc12LedIndex];

    if (nc12Led.status !== 'checking')
    {
      return nc12LedIndex;
    }
  }

  return -1;
};

/**
 * @private
 * @param {number} index
 * @param {string} orderNo
 * @param {string} nc12
 * @param {string} serialNumber
 */
LedManager.prototype.checkIndex = function(index, orderNo, nc12, serialNumber)
{
  this.cleanUpIndex(index);

  var led = this.currentState.leds[index];

  if (led.status === 'checking' || led.status === 'checked')
  {
    this.resetLed(index, led);
  }
  else
  {
    this.checkLed(index, led, orderNo, nc12, serialNumber);
  }
};

/**
 * @private
 * @param {number} index
 * @param {object} led
 */
LedManager.prototype.resetLed = function(index, led)
{
  led.status = 'waiting';
  led.serialNumber = null;

  this.updateLed(index, led);
};

/**
 * @private
 * @param {number} index
 * @param {object} led
 * @param {string} orderNo
 * @param {string} nc12
 * @param {string} serialNumber
 */
LedManager.prototype.checkLed = function(index, led, orderNo, nc12, serialNumber)
{
  led.status = null;
  led.serialNumber = serialNumber;

  if (nc12 !== led.nc12)
  {
    led.status = {
      message: 'INVALID_NC12',
      nc12: nc12
    };
  }

  if (!this.remoteCoordinator.isConnected())
  {
    led.status = {
      message: 'NO_CONNECTION'
    };
  }

  if (led.status !== null)
  {
    return this.updateLed(index, led);
  }

  led.status = 'checking';

  this.updateLed(index, led);

  var callback = this.onChecked.bind(this, index, led);
  var timer = setTimeout(this.onTimeout.bind(this, index, led), REMOTE_CHECK_TIMEOUT_DELAY);

  this.callbacks[index] = callback;
  this.timers[index] = timer;

  var ledManager = this;
  var reqData = {
    orderNo: orderNo,
    nc12: nc12,
    serialNumber: serialNumber
  };

  this.remoteCoordinator.checkSerialNumber(reqData, function(err, xiconfOrder)
  {
    if (!callback.cancelled)
    {
      ledManager.cleanUpIndex(index);
      callback(err, xiconfOrder);
    }
  });
};

/**
 * @private
 * @param {number} index
 * @param {object} led
 * @param {object|null} err
 * @param {object|null} xiconfOrder
 */
LedManager.prototype.onChecked = function(index, led, err, xiconfOrder)
{
  if (err)
  {
    if (!_.isPlainObject(err) || !_.isString(err.message))
    {
      return;
    }

    err = {message: err.message};

    if (err.message === 'SERIAL_NUMBER_USED')
    {
      if (!xiconfOrder)
      {
        xiconfOrder = {};
      }

      err.orderNo = xiconfOrder._id || '?';
      err.name = xiconfOrder.name || '?';
    }

    led.status = err;
  }
  else
  {
    led.status = 'checked';
  }

  this.updateLed(index, led);

  if (led.status === 'checked')
  {
    this.checkAllLeds();
  }
};

/**
 * @private
 * @param {number} index
 * @param {object} led
 */
LedManager.prototype.onTimeout = function(index, led)
{
  this.cleanUpIndex(index);

  led.status = {
    message: 'TIMEOUT'
  };

  this.updateLed(index, led);
};

/**
 * @private
 */
LedManager.prototype.checkAllLeds = function()
{
  var leds = this.currentState.leds;

  for (var i = 0; i < leds.length; ++i)
  {
    if (leds[i].status !== 'checked')
    {
      return;
    }
  }

  this.programmer.changeState({waitingForLeds: false});
};

/**
 * @private
 */
LedManager.prototype.cleanUp = function()
{
  _.forEach(this.timers, function(timer)
  {
    clearTimeout(timer);
  });

  _.forEach(this.callbacks, function(callback)
  {
    callback.cancelled = true;
  });

  this.timers = {};
  this.callbacks = {};
};

/**
 * @private
 * @param {number} index
 */
LedManager.prototype.cleanUpIndex = function(index)
{
  var timers = this.timers;
  var callbacks = this.callbacks;

  if (timers[index])
  {
    clearTimeout(timers[index]);
    delete timers[index];
  }

  if (callbacks[index])
  {
    callbacks[index].cancelled = true;
    delete callbacks[index];
  }
};

/**
 * @private
 * @param {number} index
 * @param {object} data
 */
LedManager.prototype.updateLed = function(index, data)
{
  var leds = this.currentState.leds;

  if (!Array.isArray(leds) || !leds[index])
  {
    return;
  }

  leds[index] = data;

  this.broker.publish('programmer.ledUpdated', {index: index, data: data});
};
