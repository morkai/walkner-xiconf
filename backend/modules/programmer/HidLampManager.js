// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

const _ = require('lodash');

const REMOTE_CHECK_TIMEOUT_DELAY = 10 * 1000;
const CHECK_LOCK_DURATION = 3 * 1000;

module.exports = HidLampManager;

/**
 * @constructor
 * @param {MessageBroker} broker
 * @param {object} settings
 * @param {object} history
 * @param {object} programmer
 */
function HidLampManager(broker, settings, history, programmer)
{
  this.broker = broker;
  this.settings = settings;
  this.history = history;
  this.programmer = programmer;
  this.currentState = programmer.currentState;
  this.remoteCoordinator = programmer.remoteCoordinator;

  this.timer = null;
  this.callback = null;
  this.checking = false;
  this.lastCheckAt = 0;

  broker.subscribe('programmer.finished', this.cleanUp.bind(this));
}

/**
 * @param {string} orderNo
 * @param {string} raw
 * @param {string|null} scannerId
 */
HidLampManager.prototype.check = function(orderNo, raw, scannerId)
{
  if (!this.currentState.waitingForHidLamps)
  {
    return;
  }

  const now = Date.now();

  if (this.checking || (now - CHECK_LOCK_DURATION) < this.lastCheckAt)
  {
    this.publishCheckFailure(-1, scannerId, 'LOCKED');

    return;
  }

  this.lastCheckAt = now;

  this.checkHidLamps(orderNo, raw, raw.replace(/[^0-9]/g, ''), scannerId);
};

/**
 * @param {number} index
 * @param {object} [hidLamp]
 */
HidLampManager.prototype.resetHidLamp = function(index, hidLamp)
{
  if (!hidLamp)
  {
    hidLamp = this.currentState.hidLamps[index];
  }

  if (!hidLamp)
  {
    return;
  }

  hidLamp.status = 'waiting';
  hidLamp.raw = '';
  hidLamp.scanResult = null;

  this.updateHidLamp(index, hidLamp);

  this.broker.publish('programmer.hidLampManager.reset', {
    hidLampIndex: index
  });
};

/**
 * @private
 * @param {string} orderNo
 * @param {string} raw
 * @param {string} scanResult
 * @param {string|null} scannerId
 */
HidLampManager.prototype.checkHidLamps = function(orderNo, raw, scanResult, scannerId)
{
  const hidLamps = this.currentState.hidLamps;
  const checkedHidLamp = hidLamps.find(hidLamp => raw === hidLamp.raw && hidLamp.status === 'checked');

  if (checkedHidLamp)
  {
    const nextHidLampIndex = hidLamps.findIndex(
      hidLamp => hidLamp !== checkedHidLamp && hidLamp.nc12 === checkedHidLamp.nc12 && hidLamp.status !== 'checked'
    );

    if (nextHidLampIndex !== -1)
    {
      const nextHidLamp = hidLamps[nextHidLampIndex];

      nextHidLamp.status = 'checked';
      nextHidLamp.raw = raw;
      nextHidLamp.scanResult = scanResult;

      this.updateHidLamp(nextHidLampIndex, nextHidLamp);
      this.checkAllHidLamps(scannerId);

      return;
    }
  }

  if (!this.remoteCoordinator.isConnected())
  {
    const nextHidLampIndex = hidLamps.findIndex(hidLamp => hidLamp.status === 'waiting' || _.isObject(hidLamp.status));

    if (nextHidLampIndex === -1)
    {
      return;
    }

    const nextHidLamp = hidLamps[nextHidLampIndex];

    nextHidLamp.status = {message: 'NO_CONNECTION'};
    nextHidLamp.raw = raw;
    nextHidLamp.scanResult = scanResult;

    this.updateHidLamp(nextHidLampIndex, nextHidLamp);
    this.publishCheckFailure(nextHidLampIndex, scannerId, nextHidLamp.status.message);

    return;
  }

  hidLamps.forEach((hidLamp, i) => {
    if (hidLamp.status === 'waiting' || _.isObject(hidLamp.status))
    {
      hidLamp.status = 'checking';
      hidLamp.raw = raw;
      hidLamp.scanResult = scanResult;

      this.updateHidLamp(i, hidLamp);
    }
  });

  const callback = this.onChecked.bind(this, scannerId);
  const timer = setTimeout(this.onTimeout.bind(this, scannerId), REMOTE_CHECK_TIMEOUT_DELAY);

  this.checking = true;
  this.callback = callback;
  this.timer = timer;

  this.checkScanResult(orderNo, scanResult, callback);
};

/**
 * @private
 * @param {string} orderNo
 * @param {string} scanResult
 * @param {function((object|null), (string|null))} callback
 */
HidLampManager.prototype.checkScanResult = function(orderNo, scanResult, callback)
{
  const hidLampManager = this;

  this.remoteCoordinator.checkHidLamp({orderNo, scanResult}, function(err, nc12)
  {
    if (!callback.cancelled)
    {
      hidLampManager.cleanUp();
      callback(err, nc12);
    }
  });
};

/**
 * @private
 * @param {string|null} scannerId
 * @param {object|null} err
 * @param {string|null} nc12
 */
HidLampManager.prototype.onChecked = function(scannerId, err, nc12)
{
  this.checking = false;

  if (err)
  {
    if (_.isPlainObject(err) && _.isString(err.message))
    {
      this.handleFailure(scannerId, err.message);
    }

    return;
  }

  const hidLamps = this.currentState.hidLamps;
  const matchingHidLamp = hidLamps.some(hidLamp => hidLamp.status === 'checking' && hidLamp.nc12 === nc12);

  if (!matchingHidLamp)
  {
    this.handleFailure(scannerId, 'INVALID_HID_LAMP');

    return;
  }

  this.cleanUp();

  let checked = false;

  hidLamps.forEach((hidLamp, i) => {
    if (hidLamp.status !== 'checking')
    {
      return;
    }

    if (checked)
    {
      hidLamp.status = 'waiting';
      hidLamp.raw = '';
      hidLamp.scanResult = null;
    }
    else if (hidLamp.nc12 === nc12)
    {
      hidLamp.status = 'checked';

      checked = true;
    }
    else
    {
      hidLamp.status = 'waiting';
      hidLamp.raw = '';
      hidLamp.scanResult = null;
    }

    this.updateHidLamp(i, hidLamp);
  });

  this.checkAllHidLamps(scannerId);
};

/**
 * @private
 * @param {string|null} scannerId
 */
HidLampManager.prototype.onTimeout = function(scannerId)
{
  this.handleFailure(scannerId, 'TIMEOUT');
};

/**
 * @private
 * @param {string|null} scannerId
 * @param {string} err
 */
HidLampManager.prototype.handleFailure = function(scannerId, err)
{
  this.checking = false;

  this.cleanUp();

  let failurePublished = false;

  this.currentState.hidLamps.forEach((hidLamp, i) => {
    if (hidLamp.status !== 'checking')
    {
      return;
    }

    if (failurePublished)
    {
      hidLamp.status = 'waiting';
      hidLamp.raw = '';
      hidLamp.scanResult = null;

      this.updateHidLamp(i, hidLamp);

      return;
    }

    hidLamp.status = {message: err};

    this.updateHidLamp(i, hidLamp);
    this.publishCheckFailure(i, scannerId, hidLamp.status.message);

    failurePublished = true;
  });
};

/**
 * @private
 * @param {string|null} scannerId
 */
HidLampManager.prototype.checkAllHidLamps = function(scannerId)
{
  const hidLamps = this.currentState.hidLamps;
  let done = true;

  for (let i = 0; i < hidLamps.length; ++i)
  {
    if (hidLamps[i].status !== 'checked')
    {
      done = false;

      break;
    }
  }

  this.broker.publish('programmer.hidLampManager.checked', {
    scannerId: scannerId,
    done: done
  });

  if (done)
  {
    this.programmer.changeState({waitingForHidLamps: false});
  }
};

/**
 * @private
 */
HidLampManager.prototype.cleanUp = function()
{
  if (this.callback)
  {
    this.callback.cancelled = true;
    this.callback = null;
  }

  clearTimeout(this.timer);
  this.timer = null;
};

/**
 * @private
 * @param {number} index
 * @param {object} data
 */
HidLampManager.prototype.updateHidLamp = function(index, data)
{
  const hidLamps = this.currentState.hidLamps;

  if (!Array.isArray(hidLamps) || !hidLamps[index])
  {
    return;
  }

  hidLamps[index] = data;

  this.broker.publish('programmer.hidLampManager.updated', {index: index, data: data});
};

/**
 * @param {number} hidLampIndex
 * @param {string|null} scannerId
 * @param {string} reason
 */
HidLampManager.prototype.publishCheckFailure = function(hidLampIndex, scannerId, reason)
{
  this.broker.publish('programmer.hidLampManager.checkFailed', {
    hidLampIndex: hidLampIndex,
    scannerId: scannerId,
    reason: reason
  });
};
