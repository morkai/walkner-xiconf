var LISTEN_PORT = 1337;
var LISTEN_ADDR = '127.0.0.1';
var DATA_PATH = __dirname + '/../data';

function log()
{
  var args = Array.prototype.slice.call(arguments);

  args.unshift("%s\t" + args[0]);
  args[1] = getDateTime(new Date(), true);

  console.log.apply(console, args);
}

function getDateTime(date, local)
{
  return date[local ? 'getFullYear' : 'getUTCFullYear']() + '-'
    + pad0(date[local ? 'getMonth' : 'getUTCMonth']() + 1) + '-'
    + pad0(date[local ? 'getDate' : 'getUTCDate']()) + ' '
    + pad0(date[local ? 'getHours' : 'getUTCHours']()) + ':'
    + pad0(date[local ? 'getMinutes' : 'getUTCMinutes']()) + ':'
    + pad0(date[local ? 'getSeconds' : 'getUTCSeconds']()) + '.'
    + pad0(date[local ? 'getMilliseconds' : 'getUTCMilliseconds'](), 4);
}

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

var spawn = require('child_process').spawn;
var fs = require('fs');
var http = require('http');
var express = require('express');
var config = require('./config');

var historyEntries = [];
var programming = false;

var app = express();

http.createServer(app).listen(LISTEN_PORT, LISTEN_ADDR, function()
{
  log("HTTP server listening on %s:%d", LISTEN_ADDR, LISTEN_PORT);
});

app.set('views', __dirname + '/templates');
app.set('view engine', 'ejs');

app.use(express.bodyParser());
app.use(app.router);
app.use(express.static(__dirname + '/../frontend'));

app.configure('development', function()
{
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

app.configure('production', function()
{
  app.use(express.errorHandler());
});

app.get('/', function(req, res)
{
  res.render('index', {
    historyEntries: historyEntries
  });
});

app.post('/program', function(req, res, next)
{
  if (programming)
  {
    return next(new Error(
      "Programming already in progress!"
    ));
  }

  var aoc = parseInt(req.body.aoc, 10);

  if (isNaN(aoc))
  {
    return next(new Error(
      "AOC value is required!"
    ));
  }

  if (aoc < config.minAoc || aoc > config.maxAoc)
  {
    return next(new Error(
      "AOC must be between " + config.minAoc + " and " + config.maxAoc + "!"
    ));
  }

  program(aoc, function(historyEntry)
  {
    res.send(historyEntry);
  });
});

function program(aoc, done)
{
  programming = true;

  log("Programming AOC=%d...", aoc);

  setTimeout(
    function()
    {
      var success = Math.round(Math.random()) === 1;

      if (success)
      {
        log("Successfully programmed AOC=%d :)", aoc);
      }
      else
      {
        log("Failed to program AOC=%d :(", aoc);
      }

      var historyEntry = {
        time: Date.now(),
        result: success,
        aoc: aoc
      };

      addHistoryEntry(historyEntry);

      programming = false;

      done(historyEntry);
    },
    Math.floor(Math.random() * 5000) + 500
  );
}

function addHistoryEntry(historyEntry)
{
  var date = new Date(historyEntry.time);
  var year = date.getUTCFullYear();
  var month = date.getUTCMonth() + 1;
  var day = date.getUTCDate();

  var historyFile = DATA_PATH + '/'
    + year + '-'
    + (month < 10 ? '0' : '') + month + '-'
    + (day < 10 ? '0' : '') + day + '.txt';

  var data = JSON.stringify(historyEntry) + "\n";

  var dateTime = getDateTime(new Date(historyEntry.time), true).split(' ');

  historyEntry.dateString = dateTime[0];
  historyEntry.timeString = dateTime[1].split('.')[0];

  fs.appendFile(historyFile, data, 'utf8', function(err)
  {
    if (err)
    {
      log("Failed to save a history entry: %s", err.message);
    }
    else
    {
      historyEntries.push(historyEntry);

      if (historyEntries.length > 20)
      {
        historyEntries.shift();
      }
    }
  });
}
