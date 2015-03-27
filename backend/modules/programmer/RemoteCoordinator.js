// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var socketIoClient = require('socket.io-client');
var _ = require('lodash');

module.exports = RemoteCoordinator;

function RemoteCoordinator(app, programmerModule)
{
  this.appVersion = app.options.version;
  this.broker = app.broker.sandbox();
  this.settings = app[programmerModule.config.settingsId];
  this.programmer = programmerModule;
  this.sio = null;

  this.selectedOrderNo = programmerModule.currentState.selectedOrderNo;
  this.currentData = [];
  this.newDataQueue = [];

  this.selectedOrderNoTimer = null;
  this.currentDataAvailabilityTimer = null;

  this.broker.subscribe('app.started', this.setUpSio.bind(this)).setLimit(1);
  this.broker.subscribe('settings.changed', this.onSettingsChanged.bind(this));
  this.broker.subscribe('programmer.stateChanged', this.onProgrammerStateChanged.bind(this));
  this.broker.subscribe('programmer.finished', this.onProgrammerFinished.bind(this));
}

RemoteCoordinator.prototype.isConnected = function()
{
  return this.sio && this.sio.socket.connected;
};

RemoteCoordinator.prototype.connectToProdLine = function()
{
  if (!this.isConnected())
  {
    return;
  }

  var srcId = this.settings.getInstallationId();
  var prodLineId = this.settings.get('prodLine');

  if (_.isEmpty(srcId) || _.isEmpty(prodLineId))
  {
    return;
  }

  var data = {
    srcId: srcId,
    licenseId: this.settings.get('licenseInfo').uuid,
    prodLineId: prodLineId,
    appVersion: this.appVersion,
    mowVersion: this.settings.get('multiOneWorkflowVersion'),
    selectedOrderNo: this.selectedOrderNo
  };

  this.sio.emit('xiconf.connect', data);

  this.scheduleCurrentDataAvailabilityCheck();
};

/**
 * @param {object} data
 * @param {string} data.orderNo
 * @param {string} data.nc12
 * @param {Array.<({nc12: string, serialNumbers: Array.<string>})>} data.leds
 * @param {number} data.count
 * @param {function} done
 */
RemoteCoordinator.prototype.acquireServiceTag = function(data, done)
{
  if (!this.isConnected())
  {
    return done(new Error("No connection to the remote server: " + this.settings.get('remoteServer')));
  }

  this.sio.emit('xiconf.acquireServiceTag', data, done);
};

/**
 * @param {object} data
 * @param {string} data.serviceTag
 * @param {string} data.orderNo
 * @param {string} data.nc12
 * @param {Array.<({nc12: string, serialNumbers: Array.<string>})>} data.leds
 * @param {number} data.count
 */
RemoteCoordinator.prototype.releaseServiceTag = function(data)
{
  if (this.sio)
  {
    this.sio.emit('xiconf.releaseServiceTag', data);
  }
};

/**
 * @private
 */
RemoteCoordinator.prototype.setUpSio = function()
{
  if (this.sio !== null)
  {
    this.sio.removeAllListeners();
    this.sio.disconnect();
    this.sio = null;
  }

  var remoteServer = this.settings.get('remoteServer');

  if (_.isEmpty(remoteServer))
  {
    return;
  }

  var remoteCoordinator = this;
  var programmer = this.programmer;
  var wasConnected = false;
  var wasReconnecting = false;
  var sio = socketIoClient.connect(remoteServer, {
    'resource': 'socket.io',
    'transports': ['websocket'],
    'auto connect': false,
    'connect timeout': 5000,
    'reconnect': true,
    'reconnection delay': _.random(100, 500),
    'reconnection limit': _.random(4000, 8000),
    'max reconnection attempts': Infinity
  });

  sio.on('connecting', function()
  {
    if (!wasConnected)
    {
      programmer.debug("[remote] Connecting...");
    }
  });

  sio.on('connect', function()
  {
    if (!wasConnected)
    {
      wasConnected = true;

      programmer.debug("[remote] Connected to: %s", remoteServer);

      remoteCoordinator.connectToProdLine();

      programmer.changeState({remoteConnected: true});
    }
  });

  sio.on('connect_failed', function()
  {
    programmer.debug("[remote] Failed to connect.");
  });

  sio.on('disconnect', function()
  {
    programmer.warn("[remote] Disconnected.");

    programmer.changeState({remoteConnected: false});
  });

  sio.on('reconnecting', function()
  {
    if (!wasReconnecting)
    {
      wasReconnecting = true;

      programmer.debug("[remote] Reconnecting...");
    }
  });

  sio.on('reconnect', function()
  {
    wasReconnecting = false;

    if (wasConnected)
    {
      programmer.warn("[remote] Reconnected to: %s", remoteServer);

      remoteCoordinator.connectToProdLine();

      programmer.changeState({remoteConnected: true});
    }
  });

  sio.on('reconnect_failed', function()
  {
    wasReconnecting = false;

    programmer.debug("[remote] Failed to reconnect.");
  });

  sio.on('error', forceReconnectOnFirstConnectFailure);

  sio.on('error', function(err)
  {
    if (err)
    {
      programmer.error("[remote] %s", err.message || err);
    }
    else
    {
      programmer.error("[remote] Unknown error...");
    }
  });

  sio.on('xiconf.remoteDataUpdated', this.onRemoteDataUpdated.bind(this));
  sio.on('xiconf.leaderUpdated', this.onLeaderUpdated.bind(this));

  sio.socket.connect();

  this.sio = sio;

  function forceReconnectOnFirstConnectFailure()
  {
    if (!wasConnected)
    {
      sio.removeListener('error', forceReconnectOnFirstConnectFailure);
      sio.socket.reconnect();
    }
  }
};

/**
 * @private
 * @param {object|Array.<object>} newData
 */
RemoteCoordinator.prototype.updateCurrentData = function(newData)
{
  if (_.isPlainObject(newData))
  {
    var orderDataIndex = _.findIndex(this.currentData, function(orderData)
    {
      return newData._id === orderData._id;
    });

    if (orderDataIndex === -1)
    {
      return;
    }

    this.currentData[orderDataIndex] = newData;
  }
  else
  {
    this.currentData = newData;
  }

  this.programmer.changeState({remoteData: this.currentData});

  if (this.programmer.currentState.isInProgress())
  {
    this.broker.subscribe('programmer.finished', this.scheduleSelectedOrderNoCheck.bind(this)).setLimit(1);
  }
  else
  {
    this.scheduleSelectedOrderNoCheck();
  }
};

/**
 * @private
 */
RemoteCoordinator.prototype.scheduleSelectedOrderNoCheck = function()
{
  if (this.selectedOrderNoTimer !== null)
  {
    clearImmediate(this.selectedOrderNoTimer);
  }

  //todo remove
  this.selectedOrderNoTimer = null;//setImmediate(this.checkSelectedOrderNo.bind(this), 1);
};

/**
 * @private
 */
RemoteCoordinator.prototype.checkSelectedOrderNo = function()
{
  this.selectedOrderNoTimer = null;

  var currentOrderData = _.find(this.currentData, {orderNo: this.selectedOrderNo});

  if (currentOrderData && currentOrderData.status === -1)
  {
    return;
  }

  var newOrderData = _.findLast(this.currentData, {status: -1});
  var newSelectedOrderNo = newOrderData ? newOrderData._id : null;

  if (this.selectedOrderNo !== newSelectedOrderNo)
  {
    this.programmer.changeState({selectedOrderNo: newSelectedOrderNo});
  }
};

/**
 * @private
 */
RemoteCoordinator.prototype.scheduleCurrentDataAvailabilityCheck = function()
{
  if (this.currentDataAvailabilityTimer !== null)
  {
    clearTimeout(this.currentDataAvailabilityTimer);
  }

  this.currentDataAvailabilityTimer = setTimeout(
    this.checkCurrentDataAvailability.bind(this),
    _.random(45, 90) * 1000
  );
};

/**
 * @private
 */
RemoteCoordinator.prototype.checkCurrentDataAvailability = function()
{
  this.currentDataAvailabilityTimer = null;

  if (this.currentData.length === 0)
  {
    this.connectToProdLine();
  }
};

/**
 * @private
 * @param {object} changes
 */
RemoteCoordinator.prototype.onSettingsChanged = function(changes)
{
  if (changes.remoteServer !== undefined
    || changes.id !== undefined
    || changes.prodLine !== undefined)
  {
    this.setUpSio();
  }
};

/**
 * @private
 */
RemoteCoordinator.prototype.onProgrammerStateChanged = function(changes)
{
  if (changes.selectedOrderNo !== undefined && changes.selectedOrderNo !== this.selectedOrderNo)
  {
    this.selectedOrderNo = changes.selectedOrderNo;

    if (this.isConnected())
    {
      this.sio.emit('xiconf.selectedOrderNoChanged', this.selectedOrderNo);
    }
  }
};

/**
 * @private
 */
RemoteCoordinator.prototype.onProgrammerFinished = function()
{
  while (this.newDataQueue.length)
  {
    this.updateCurrentData(this.newDataQueue.shift());
  }
};

/**
 * @private
 * @param {object|Array.<object>} newData
 */
RemoteCoordinator.prototype.onRemoteDataUpdated = function(newData)
{
  if (!_.isObject(newData))
  {
    return;
  }

  var isInProgress = this.programmer.currentState.isInProgress();
  var isSelectedOrderUpdate = !Array.isArray(newData) && newData._id === this.selectedOrderNo;

  if (isInProgress && !isSelectedOrderUpdate)
  {
    this.newDataQueue.push(newData);
  }
  else
  {
    this.updateCurrentData(newData);
  }

  this.scheduleCurrentDataAvailabilityCheck();
};

/**
 * @private
 * @param {string|null} newLeader
 */
RemoteCoordinator.prototype.onLeaderUpdated = function(newLeader)
{
  this.programmer.changeState({remoteLeader: newLeader});
};


