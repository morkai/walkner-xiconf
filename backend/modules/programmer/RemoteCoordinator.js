// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var url = require('url');
var _ = require('lodash');
var socketIoClient = require('socket.io-client');
var request = require('request');

var REQUEST_TIMEOUT = 10000;
var REQUEST_MAX_ATTEMPTS = 3;

module.exports = RemoteCoordinator;

function RemoteCoordinator(app, programmerModule)
{
  this.appVersion = app.options.version;
  this.broker = app.broker.sandbox();
  this.settings = app[programmerModule.config.settingsId];
  this.programmer = programmerModule;
  this.sio = null;

  this.selectedOrderNo = programmerModule.currentState.selectedOrderNo;
  this.inputMode = programmerModule.currentState.inputMode;
  this.currentData = [];
  this.newDataQueue = [];

  this.lastResponseTime = Date.now();
  this.forceReconnectTimer = setInterval(this.checkLastResponseTime.bind(this), 5000);
  this.selectedOrderNoTimer = null;
  this.resetRemoteOrderTimer = null;
  this.restarting = false;

  this.broker.subscribe('app.started', this.setUpSio.bind(this)).setLimit(1);
  this.broker.subscribe('settings.changed', this.onSettingsChanged.bind(this));
  this.broker.subscribe('programmer.stateChanged', this.onProgrammerStateChanged.bind(this));
  this.broker.subscribe('programmer.finished', this.onProgrammerFinished.bind(this));
  this.broker.subscribe('programmer.ledManager.updated', this.onLedUpdated.bind(this));
}

RemoteCoordinator.prototype.isConnected = function()
{
  return this.sio && this.sio.io.readyState === 'open';
};

RemoteCoordinator.prototype.connectToProdLine = function(forceReconnect)
{
  if (forceReconnect)
  {
    this.setUpSio();

    return;
  }

  if (!this.isConnected())
  {
    return;
  }

  var srcId = this.settings.getInstallationId();

  if (_.isEmpty(srcId))
  {
    return;
  }

  var licenseInfo = this.settings.get('licenseInfo');
  var data = {
    srcId: srcId,
    licenseId: licenseInfo.uuid,
    licenseError: licenseInfo.error,
    licenseKey: this.settings.get('licenseKey'),
    prodLineId: this.settings.get('prodLine'),
    appVersion: this.appVersion,
    mowVersion: this.settings.get('multiOneWorkflowVersion'),
    coreScannerDriver: this.settings.get('coreScannerDriver'),
    httpPort: this.programmer.config.httpPort,
    selectedOrderNo: this.selectedOrderNo,
    inputMode: this.programmer.currentState.inputMode
  };

  this.sio.emit('xiconf.connect', data);
};

/**
 * @param {object} data
 * @param {string} data.orderNo
 * @param {string} data.nc12
 * @param {Array.<({nc12: string, serialNumbers: Array.<string>})>} data.leds
 * @param {function} done
 */
RemoteCoordinator.prototype.generateServiceTag = function(data, done)
{
  if (!this.isConnected())
  {
    return done(new Error("No connection to the remote server: " + this.settings.get('remoteServer')));
  }

  return this.request('generateServiceTag', data, done);
};

/**
 * @param {object} data
 * @param {string} [data.serviceTag]
 * @param {string} data.orderNo
 * @param {string} data.nc12
 * @param {Array.<({nc12: string, serialNumbers: Array.<string>})>} data.leds
 * @param {string} [data.programId]
 * @param {string} [data.programName]
 * @param {function} done
 */
RemoteCoordinator.prototype.acquireServiceTag = function(data, done)
{
  if (!this.isConnected())
  {
    return done(new Error("No connection to the remote server: " + this.settings.get('remoteServer')));
  }

  return this.request('acquireServiceTag', data, done);
};

/**
 * @param {object} data
 * @param {string} data.orderNo
 * @param {string} data.nc12
 * @param {string} data.serialNumber
 * @param {function} done
 */
RemoteCoordinator.prototype.checkComponentWeight = function(data, done)
{
  if (!this.isConnected())
  {
    return done(new Error("No connection to the remote server: " + this.settings.get('remoteServer')));
  }

  return this.request('checkComponentWeight', data, done);
};

/**
 * @param {object} data
 * @param {string} data.orderNo
 * @param {string} data.scanResult
 * @param {function} done
 */
RemoteCoordinator.prototype.checkHidLamp = function(data, done)
{
  if (!this.isConnected())
  {
    return done(new Error("No connection to the remote server: " + this.settings.get('remoteServer')));
  }

  return this.request('checkHidLamp', data, done);
};

/**
 * @param {object} data
 * @param {string} data.orderNo
 * @param {string} data.nc12
 * @param {string} data.serialNumber
 * @param {function} done
 */
RemoteCoordinator.prototype.checkSerialNumber = function(data, done)
{
  if (!this.isConnected())
  {
    return done(new Error("No connection to the remote server: " + this.settings.get('remoteServer')));
  }

  return this.request('checkSerialNumber', data, done);
};

/**
 * @param {object} data
 * @param {string} data.serviceTag
 * @param {string} data.orderNo
 * @param {string} data.nc12
 * @param {Array.<({nc12: string, serialNumbers: Array.<string>})>} data.leds
 * @param {string} [data.programId]
 * @param {string} [data.programName]
 * @param {function} [done]
 */
RemoteCoordinator.prototype.releaseServiceTag = function(data, done)
{
  if (!this.isConnected())
  {
    return done(new Error("No connection to the remote server: " + this.settings.get('remoteServer')));
  }

  return this.request('releaseServiceTag', data, done);
};

/**
 * @private
 */
RemoteCoordinator.prototype.setUpSio = function()
{
  if (this.sio !== null)
  {
    this.sio.removeAllListeners();
    this.sio.close();
    this.sio = null;
  }

  var programmer = this.programmer;

  programmer.changeState({remoteConnected: false});

  var remoteServer = this.settings.get('remoteServer');

  if (_.isEmpty(remoteServer))
  {
    return;
  }

  var rc = this;
  var sio = socketIoClient.connect(remoteServer, {
    path: '/sio',
    transports: ['websocket'],
    autoConnect: false,
    timeout: 5000,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  sio.on('pong', function()
  {
    rc.lastResponseTime = Date.now();
  });

  sio.once('connecting', function()
  {
    programmer.debug("[remote] Connecting...");
  });

  sio.once('connect', function()
  {
    programmer.debug("[remote] Connected to: %s", remoteServer);

    rc.connectToProdLine();

    programmer.changeState({remoteConnected: true});

    if (rc.resetRemoteOrderTimer)
    {
      clearTimeout(rc.resetRemoteOrderTimer);
      rc.resetRemoteOrderTimer = null;
    }
  });

  sio.once('connect_error', function(err)
  {
    programmer.debug("[remote] Failed to connect: %s", err.message || err);
  });

  sio.on('disconnect', function()
  {
    programmer.warn("[remote] Disconnected :(");

    programmer.changeState({remoteConnected: false});

    if (rc.resetRemoteOrderTimer)
    {
      clearTimeout(rc.resetRemoteOrderTimer);
    }

    rc.resetRemoteOrderTimer = setTimeout(rc.resetRemoteOrder.bind(rc), 20000);
  });

  sio.on('reconnecting', function(reconnectCount)
  {
    if (reconnectCount === 1)
    {
      programmer.debug("[remote] Reconnecting...");

      sio.once('reconnect_error', function(err)
      {
        programmer.debug("[remote] Failed to reconnect: %s", err.message || err);
      });
    }
  });

  sio.on('reconnect', function()
  {
    sio.off('connect');

    programmer.warn("[remote] Reconnected to: %s", remoteServer);

    rc.connectToProdLine();

    programmer.changeState({remoteConnected: true});

    if (rc.resetRemoteOrderTimer)
    {
      clearTimeout(rc.resetRemoteOrderTimer);
      rc.resetRemoteOrderTimer = null;
    }
  });

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
  sio.on('xiconf.programsUpdated', this.onProgramsUpdated.bind(this));
  sio.on('xiconf.restart', this.onRestart.bind(this));
  sio.on('xiconf.update', this.onUpdate.bind(this));
  sio.on('xiconf.configure', this.onConfigure.bind(this));

  sio.open();

  this.sio = sio;
  this.lastResponseTime = Date.now();
};

/**
 * @private
 * @param {string} action
 * @param {object} body
 * @param {function(Error|null), *} done
 * @param {string} [rid]
 * @param {number} [attempt]
 * @param {function} [cancel]
 */
RemoteCoordinator.prototype.request = function(action, body, done, rid, attempt, cancel)
{
  rid = rid || _.uniqueId(this.settings.getInstallationId() + '_' + Date.now().toString(36) + '_');
  attempt = (attempt || 0) + 1;
  cancel = cancel || function()
  {
    if (cancel.req)
    {
      cancel.req.abort();
      cancel.req = null;
    }
  };

  var rc = this;
  var options = {
    method: 'POST',
    uri: url.format(_.assign(url.parse(this.settings.get('remoteServer')), {
      pathname: '/xiconf;execute',
      query: {
        rid: rid,
        action: action
      }
    })),
    json: true,
    body: body,
    timeout: REQUEST_TIMEOUT
  };

  cancel.req = request(options, function(err, res, responseBody)
  {
    if (!cancel.req)
    {
      return;
    }

    cancel.req = null;

    if (!err && res.statusCode >= 300)
    {
      if (_.isPlainObject(responseBody) && _.isPlainObject(responseBody.error))
      {
        err = responseBody.error;
        attempt = REQUEST_MAX_ATTEMPTS;
      }
      else
      {
        err = {
          message: "Invalid response status code: " + res.statusCode,
          code: 'INVALID_RESPONSE_STATUS'
        };
      }
    }

    if (err)
    {
      if (attempt === REQUEST_MAX_ATTEMPTS)
      {
        rc.programmer.debug("[remote] %s failed %d times: %s", action, attempt, err.code || err.message);

        return done(err);
      }

      rc.programmer.debug("[remote] %d. attempt at %s...", attempt + 1, action);

      return setTimeout(
        rc.request.bind(rc, action, body, done, rid, attempt, cancel),
        500 * attempt
      );
    }
    else
    {
      rc.lastResponseTime = Date.now();
    }

    return done(null, responseBody);
  });

  return cancel;
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

  this.selectedOrderNoTimer = setImmediate(this.checkSelectedOrderNo.bind(this), 1);
};

/**
 * @private
 */
RemoteCoordinator.prototype.checkSelectedOrderNo = function()
{
  this.selectedOrderNoTimer = null;

  var forceLatestOrder = !!this.settings.get('forceLatestOrder');
  var newSelectedOrderNo = null;
  var currentOrderDataIndex = _.findIndex(this.currentData, {_id: this.selectedOrderNo});

  if (forceLatestOrder)
  {
    if (currentOrderDataIndex === 0)
    {
      return;
    }

    if (this.currentData.length)
    {
      newSelectedOrderNo = this.currentData[0]._id;
    }
  }
  else
  {
    if (currentOrderDataIndex !== -1)
    {
      return;
    }

    var newOrderData = _.findLast(this.currentData, {status: -1});

    if (!newOrderData)
    {
      newSelectedOrderNo = this.currentData.length ? this.currentData[0]._id : null;
    }
    else
    {
      newSelectedOrderNo = newOrderData._id;
    }
  }

  if (this.selectedOrderNo !== newSelectedOrderNo)
  {
    this.programmer.selectOrderNo(newSelectedOrderNo, _.noop);
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
    || changes.prodLine !== undefined
    || changes.licenseInfo !== undefined)
  {
    this.setUpSio();
  }

  if (changes.forceLatestOrder !== undefined)
  {
    this.scheduleSelectedOrderNoCheck();
  }

  if (this.isConnected()
    && (changes.multiOneWorkflowVersion !== undefined || changes.coreScannerDriver !== undefined))
  {
    this.sio.emit('xiconf.stateChanged', {
      mowVersion: changes.multiOneWorkflowVersion,
      coreScannerDriver: changes.coreScannerDriver
    });
  }
};

/**
 * @private
 */
RemoteCoordinator.prototype.onProgrammerStateChanged = function(changes)
{
  var stateChanges = {};

  if (changes.selectedOrderNo !== undefined && changes.selectedOrderNo !== this.selectedOrderNo)
  {
    this.selectedOrderNo = changes.selectedOrderNo;
    stateChanges.order = changes.selectedOrderNo;
  }

  if (changes.inputMode !== undefined && changes.inputMode !== this.inputMode)
  {
    this.inputMode = changes.inputMode;
    stateChanges.inputMode = changes.inputMode;
  }

  if (this.isConnected() && !_.isEmpty(stateChanges))
  {
    this.sio.emit('xiconf.stateChanged', stateChanges);
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

  this.lastResponseTime = Date.now();
};

/**
 * @private
 * @param {string|null} newLeader
 */
RemoteCoordinator.prototype.onLeaderUpdated = function(newLeader)
{
  this.programmer.debug('[remote] Leader updated: %s', JSON.stringify(newLeader));

  this.programmer.changeState({remoteLeader: newLeader});
  this.lastResponseTime = Date.now();
};

/**
 * @private
 */
RemoteCoordinator.prototype.onProgramsUpdated = function()
{
  this.programmer.debug('[remote] Programs update requested...');

  this.broker.publish('xiconfPrograms.updated');
  this.lastResponseTime = Date.now();
};

/**
 * @private
 */
RemoteCoordinator.prototype.onRestart = function()
{
  if (this.restarting)
  {
    return;
  }

  this.restarting = true;

  if (this.programmer.currentState.isInProgress())
  {
    this.programmer.debug('[remote] Restart requested while programming...');

    this.broker.subscribe('programmer.finished', process.exit.bind(process));
  }
  else
  {
    this.programmer.debug('[remote] Restarting!');

    process.exit();
  }
};

/**
 * @private
 */
RemoteCoordinator.prototype.onUpdate = function()
{
  this.programmer.debug('[remote] Update check requested...');

  this.broker.publish('updater.checkRequested');
  this.lastResponseTime = Date.now();
};

/**
 * @private
 */
RemoteCoordinator.prototype.onConfigure = function(settings, reply)
{
  if (this.programmer.currentState.isInProgress())
  {
    this.programmer.debug('[remote] Settings change requested while programming...');

    this.broker.subscribe('programmer.finished', this.onConfigure.bind(this, settings)).setLimit(1);
  }
  else
  {
    this.programmer.debug('[remote] Importing settings: %s', JSON.stringify(settings));

    this.settings.import(settings, reply, false, true);
  }

  this.lastResponseTime = Date.now();
};

/**
 * @private
 * @param {{index: number, data: object}} message
 */
RemoteCoordinator.prototype.onLedUpdated = function(message)
{
  var led = message.data;

  if (!led.status || led.status.message !== 'INVALID_NC12' || !this.isConnected())
  {
    return;
  }

  var data = {
    orderNo: this.selectedOrderNo,
    serialNumber: led.serialNumber,
    requiredNc12: led.nc12,
    actualNc12: led.status.nc12
  };

  this.programmer.debug('[remote] Recording invalid LED: %s', JSON.stringify(data));

  return this.request('recordInvalidLed', data, _.noop);
};

/**
 * @private
 */
RemoteCoordinator.prototype.resetRemoteOrder = function()
{
  this.programmer.debug('[remote] No reconnect after 15s. Resetting remote data...');

  if (this.programmer.currentState.isInProgress())
  {
    this.broker.subscribe('programmer.finished', this.updateCurrentData.bind(this, [])).setLimit(1);
  }
  else
  {
    this.updateCurrentData([]);
  }
};

/**
 * @private
 */
RemoteCoordinator.prototype.checkLastResponseTime = function()
{
  if (Date.now() - this.lastResponseTime > 45000 && (!this.sio || !this.sio.io.reconnecting))
  {
    this.programmer.debug('[remote] No activity for 45s. Forcing reconnect...');

    this.connectToProdLine(true);
  }
};
