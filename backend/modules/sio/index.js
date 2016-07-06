// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var _ = require('lodash');
var socketIo = require('socket.io');
var SocketIoMultiServer = require('./SocketIoMultiServer');
var pmx = null;

try
{
  pmx = require('pmx');
}
catch (err) {}

exports.DEFAULT_CONFIG = {
  httpServerIds: ['httpServer'],
  path: '/sio',
  socketIo: {
    pathInterval: 30000,
    pingTimeout: 10000
  }
};

exports.start = function startIoModule(app, sioModule)
{
  var probes = {
    currentUsersCounter: null,
    totalConnectionTime: null,
    totalConnectionCount: null
  };

  if (pmx)
  {
    var pmxProbe = pmx.probe();

    probes.currentUsersCounter = pmxProbe.counter({name: 'sio:currentUsers'});
    probes.totalConnectionTime = pmxProbe.histogram({name: 'sio:totalConnectionTime', measurement: 'sum'});
    probes.totalConnectionCount = pmxProbe.histogram({name: 'sio:totalConnectionCount', measurement: 'sum'});
  }

  var multiServer = new SocketIoMultiServer();

  app.onModuleReady(sioModule.config.httpServerIds, function()
  {
    _.forEach(sioModule.config.httpServerIds, function(httpServerId)
    {
      multiServer.addServer(app[httpServerId].server);
    });
  });

  sioModule.config.socketIo = _.assign({}, sioModule.config.socketIo, {
    path: sioModule.config.path,
    transports: ['websocket', 'xhr-polling'],
    serveClient: true
  });

  var sio = socketIo(multiServer, sioModule.config.socketIo);

  sioModule = app[sioModule.name] = _.assign(sio, sioModule);

  sio.sockets.setMaxListeners(25);

  sioModule.on('connection', function(socket)
  {
    socket.handshake.connectedAt = Date.now();

    if (pmx)
    {
      probes.currentUsersCounter.inc();

      socket.on('disconnect', function()
      {
        probes.totalConnectionCount.update(1);
        probes.totalConnectionTime.update((Date.now() - socket.handshake.connectedAt) / 1000);
        probes.currentUsersCounter.dec();
      });
    }

    socket.on('echo', function()
    {
      socket.emit.apply(socket, ['echo'].concat(Array.prototype.slice.call(arguments)));
    });

    socket.on('time', function(reply)
    {
      if (_.isFunction(reply))
      {
        reply(Date.now(), 'Europe/Warsaw');
      }
    });

    socket.on('sio.getConnections', function(reply)
    {
      if (!_.isFunction(reply) || !socket.handshake.user || !socket.handshake.user.super)
      {
        return;
      }

      var res = {
        socketCount: 0,
        userCount: 0,
        users: {}
      };

      _.forEach(sioModule.sockets.connected, function(socket)
      {
        ++res.socketCount;

        var user = socket.handshake.user || {};

        if (res.users[user._id] === undefined)
        {
          res.users[user._id] = {
            _id: user._id,
            login: user.login,
            name: ((user.lastName || '') + ' ' + (user.firstName || '')).trim(),
            sockets: []
          };

          ++res.userCount;
        }

        res.users[user._id].sockets.push({
          _id: socket.id,
          ipAddress: user.ipAddress
        });
      });

      reply(res);
    });
  });
};
