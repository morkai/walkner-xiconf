// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var _ = require('lodash');

var REMOTE_CHECK_TIMEOUT_DELAY = 10 * 1000;
var CHECK_LOCK_DURATION = 3000;

module.exports = LedManager;

function LedManager(broker, programmer)
{
  this.broker = broker;
  this.programmer = programmer;
  this.currentState = programmer.currentState;
  this.remoteCoordinator = programmer.remoteCoordinator;

  this.timers = {};
  this.callbacks = {};
  this.checkLocks = {};

  broker.subscribe('programmer.started', this.cleanUpCheckLocks.bind(this));
  broker.subscribe('programmer.finished', this.cleanUp.bind(this));
}

/**
 * @param {string} orderNo
 * @param {string} nc12
 * @param {string} serialNumber
 * @param {string|null} scannerId
 */
LedManager.prototype.check = function(orderNo, nc12, serialNumber, scannerId)
{
  if (!this.currentState.waitingForLeds)
  {
    return;
  }

  var index = this.findIndex(nc12, serialNumber);

  if (index !== -1)
  {
    var checkTime = this.checkLocks[serialNumber];
    var now = Date.now();

    if (checkTime && (now - CHECK_LOCK_DURATION) < checkTime)
    {
      this.publishCheckFailure(index, scannerId, 'LOCKED');

      return;
    }

    this.checkLocks[serialNumber] = now;

    this.checkIndex(index, orderNo, nc12, serialNumber, scannerId);
  }
  else
  {
    this.publishCheckFailure(index, scannerId, 'NOT_FOUND');
  }
};

/**
 * @param {number} index
 * @param {object} led
 */
LedManager.prototype.resetLed = function(index, led)
{
  led.status = 'waiting';
  led.serialNumber = null;

  this.updateLed(index, led);

  this.broker.publish('programmer.ledManager.reset', {
    ledIndex: index
  });
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
 * @param {string|null} scannerId
 */
LedManager.prototype.checkIndex = function(index, orderNo, nc12, serialNumber, scannerId)
{
  this.cleanUpIndex(index);

  var led = this.currentState.leds[index];

  if (led.status === 'checking' || led.status === 'checked')
  {
    this.resetLed(index, led);
  }
  else
  {
    this.checkLed(index, led, orderNo, nc12, serialNumber, scannerId);
  }
};

/**
 * @private
 * @param {number} index
 * @param {object} led
 * @param {string} orderNo
 * @param {string} nc12
 * @param {string} serialNumber
 * @param {string|null} scannerId
 */
LedManager.prototype.checkLed = function(index, led, orderNo, nc12, serialNumber, scannerId)
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
    this.updateLed(index, led);
    this.publishCheckFailure(index, scannerId, led.status.message);

    return;
  }

  led.status = 'checking';

  this.updateLed(index, led);

  var callback = this.onChecked.bind(this, index, led, scannerId);
  var timer = setTimeout(this.onTimeout.bind(this, index, led, scannerId), REMOTE_CHECK_TIMEOUT_DELAY);

  this.callbacks[index] = callback;
  this.timers[index] = timer;

  var ledManager = this;

  setTimeout(function(ledManager, callback)
  {
    if (!callback.cancelled)
    {
      ledManager.cleanUpIndex(index);
      callback();
    }
  }, 1, ledManager, callback);
};

/**
 * @private
 * @param {number} index
 * @param {object} led
 * @param {string|null} scannerId
 * @param {object|null} err
 * @param {object|null} xiconfOrder
 */
LedManager.prototype.onChecked = function(index, led, scannerId, err, xiconfOrder)
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
    this.checkAllLeds(index, scannerId);
  }
  else
  {
    this.publishCheckFailure(index, scannerId, led.status.message);
  }
};

/**
 * @private
 * @param {number} index
 * @param {object} led
 * @param {string|null} scannerId
 */
LedManager.prototype.onTimeout = function(index, led, scannerId)
{
  this.cleanUpIndex(index);

  led.status = {
    message: 'TIMEOUT'
  };

  this.updateLed(index, led);
  this.publishCheckFailure(index, scannerId, led.status.message);
};

/**
 * @private
 * @param {number} index
 * @param {string|null} scannerId
 */
LedManager.prototype.checkAllLeds = function(index, scannerId)
{
  var leds = this.currentState.leds;
  var done = true;

  for (var i = 0; i < leds.length; ++i)
  {
    if (leds[i].status !== 'checked')
    {
      done = false;

      break;
    }
  }

  this.broker.publish('programmer.ledManager.checked', {
    ledIndex: index,
    scannerId: scannerId,
    done: done
  });

  if (done)
  {
    this.programmer.changeState({waitingForLeds: false});
  }
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
 */
LedManager.prototype.cleanUpCheckLocks = function()
{
  var checkLocks = this.checkLocks;
  var now = Date.now();

  _.forEach(checkLocks, function(time, serialNumber)
  {
    if ((time - 3000) >= now)
    {
      delete checkLocks[serialNumber];
    }
  });
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

  this.broker.publish('programmer.ledManager.updated', {index: index, data: data});
};

/**
 * @param {number} ledIndex
 * @param {string|null} scannerId
 * @param {string} reason
 */
LedManager.prototype.publishCheckFailure = function(ledIndex, scannerId, reason)
{
  this.broker.publish('programmer.ledManager.checkFailed', {
    ledIndex: ledIndex,
    scannerId: scannerId,
    reason: reason
  });
};