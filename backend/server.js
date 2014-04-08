// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var exec = require('child_process').exec;
var http = require('http');
var resolvePath = require('path').resolve;
var socketIo = require('socket.io');
var express = require('express');
var config = require('./config');

global.app = express();

require('./db');

app.log = function()
{
  var args = Array.prototype.slice.call(arguments);

  args.unshift("%s\t" + args[0]);
  args[1] = app.getDateTime(new Date());

  console.log.apply(console, args);
};

/**
 * Current app state.
 *
 * @type {string}
 */
app.state = 'wait';

/**
 * Current history entry.
 *
 * @type {Object|null}
 */
app.historyEntry = null;

/**
 * Changes the current state and broadcasts it to all clients.
 *
 * @param {string} newState
 */
app.changeState = function(newState)
{
  app.state = newState;

  app.io.sockets.emit('state changed', app.state, app.historyEntry);
};

/**
 * Last 20 history entries.
 *
 * @type {Array.<object>}
 */
app.historyEntries = [];

/**
 * @param {Date} date
 * @return {string}
 */
app.getDateTime = function(date)
{
  return date.getFullYear() + '-'
    + pad0(date.getMonth() + 1) + '-'
    + pad0(date.getDate()) + ' '
    + pad0(date.getHours()) + ':'
    + pad0(date.getMinutes()) + ':'
    + pad0(date.getSeconds()) + '.'
    + pad0(date.getMilliseconds(), 4);
};

/**
 * @param {object} obj
 * @param {number} time
 */
app.applyDateTimeStrings = function(obj, time)
{
  var date = new Date(time);
  var dateTime = app.getDateTime(date).split(' ');

  obj.dateString = dateTime[0];
  obj.timeString = dateTime[1].split('.')[0];
};

app.httpServer = http.createServer(app);
app.httpServer.listen(config.httpPort, function()
{
  app.log("HTTP server listening on port %d", config.httpPort);
});

app.io = socketIo.listen(app.httpServer, {
  log: false,
  transports: ['websocket', 'xhr-polling']
});

app.set('views', __dirname + '/templates');
app.set('view engine', 'ejs');

app.use(express.bodyParser());
app.use(app.router);
app.use(express.static(__dirname + '/../frontend'));

app.configure('development', function()
{
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

app.configure('production', function()
{
  app.use(express.errorHandler());
});

config.programmerFile = preparePath(config.programmerFile);
config.featureFilePath = preparePath(config.featureFilePath);
config.fallbackFilePath = preparePath(config.fallbackFilePath);
config.syncPath = preparePath(config.syncPath);
config.workflowFile = preparePath(config.workflowFile);

require('./programmer');
require('./routes');
require('./sockets');

if (config.syncDelay !== -1)
{
  setTimeout(trySyncFeatureFiles, config.syncDelay * 1000);
}

/**
 * @private
 * @param {string} str
 * @param {number=2} length
 * @return {string}
 */
function pad0(str, length)
{
  str = str + '';
  length = length || 2;

  while (str.length < length)
  {
    str = '0' + str;
  }

  return str;
}

/**
 * @private
 * @param {string} path
 * @returns {string}
 */
function preparePath(path)
{
  path = resolvePath(path);

  var lastChar = path.charAt(path.length - 1);

  if (lastChar === '/' || lastChar === '\\')
  {
    path = path.substr(0, path.length - 1);
  }
  
  return path;
}

/**
 * @private
 */
function trySyncFeatureFiles()
{
  app.log("Trying to sync the feature files...");

  var cmd = 'xcopy /C /I /Q /Y '
    + '"' + config.syncPath + '" '
    + '"' + config.fallbackFilePath + '"';

  exec(cmd, function(err)
  {
    if (err)
    {
      app.log("Failed to sync the feature files: %s", err.message);
    }
    else
    {
      app.log("Synced the feature files!");
    }
  });
}
