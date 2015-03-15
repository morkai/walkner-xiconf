// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var socketIoClient = require('socket.io-client');
var _ = require('lodash');

module.exports = RemoteCoordinator;

function RemoteCoordinator(app, programmerModule)
{
  this.broker = app.broker.sandbox();
  this.settings = app[programmerModule.config.settingsId];
  this.programmer = programmerModule;
  this.sio = null;

  this.currentData = {
    orderNo: null,
    nc12: [],
    quantityTodo: null,
    quantityDone: null,
    startedAt: null,
    finishedAt: null,
    ledOrder: null
  };
  this.newData = null;

  this.broker.subscribe('app.started', this.setUpSio.bind(this)).setLimit(1);
  this.broker.subscribe('settings.changed', this.onSettingsChanged.bind(this));
  this.broker.subscribe('programmer.finished', this.onProgrammerFinished.bind(this));
}

RemoteCoordinator.prototype.isConnected = function()
{
  return this.sio && this.sio.socket.connected;
};

RemoteCoordinator.prototype.acquireServiceTag = function(resultId, nc12, done)
{
  if (!this.isConnected())
  {
    return done(new Error("No connection to the remote server: " + this.settings.get('remoteServer')));
  }

  var input = {
    resultId: resultId,
    orderNo: this.currentData.orderNo,
    nc12: nc12
  };

  this.sio.emit('xiconf.acquireServiceTag', input, done);
};

RemoteCoordinator.prototype.releaseServiceTag = function(resultId, nc12, serviceTag)
{
  this.sio.emit('xiconf.releaseServiceTag', {
    resultId: resultId,
    nc12: nc12,
    serviceTag: serviceTag
  });
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
  }

  var remoteCoordinator = this;
  var programmer = this.programmer;
  var wasConnected = false;
  var wasReconnecting = false;
  var remoteServer = this.settings.get('remoteServer');
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
    programmer.debug("[remote] Connecting...");
  });

  sio.on('connect', function()
  {
    if (!wasConnected)
    {
      wasConnected = true;

      programmer.debug("[remote] Connected to: %s", remoteServer);

      remoteCoordinator.connectToProdLine();
    }

    programmer.changeState({remoteConnected: true});
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
    }

    programmer.changeState({remoteConnected: true});
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
 */
RemoteCoordinator.prototype.connectToProdLine = function()
{
  if (!this.sio || !this.sio.socket.connected)
  {
    return;
  }

  var srcId = this.settings.get('id');
  var prodLineId = this.settings.get('prodLine');

  if (_.isEmpty(srcId) || _.isEmpty(prodLineId))
  {
    return;
  }

  this.sio.emit('xiconf.connect', srcId, prodLineId);
};

/**
 * @private
 * @param {object} newData
 */
RemoteCoordinator.prototype.updateCurrentData = function(newData)
{
  var sameOrderNo = this.currentData.orderNo === newData.orderNo;

  this.currentData = newData;

  if (sameOrderNo)
  {
    this.programmer.changeState({remoteData: this.currentData});
  }
  else
  {
    this.programmer.currentState.clear();
    this.programmer.currentState.remoteData = this.currentData;
    this.programmer.changeState();
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
RemoteCoordinator.prototype.onProgrammerFinished = function()
{
  if (this.newData !== null)
  {
    this.updateCurrentData(this.newData);
    this.newData = null;
  }
};

/**
 * @private
 * @param {object} newData
 */
RemoteCoordinator.prototype.onRemoteDataUpdated = function(newData)
{
  if (!_.isObject(newData))
  {
    return;
  }

  var sameOrder = this.currentData.orderNo === newData.orderNo;
  var inProgress = this.programmer.currentState.isInProgress();

  if (sameOrder || !inProgress)
  {
    this.updateCurrentData(newData);
  }
  else
  {
    this.newData = newData;
  }
};


