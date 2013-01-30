var LISTEN_PORT = 1337;
var LISTEN_ADDR = '127.0.0.1';
var DATA_PATH = __dirname + '/../data';

var spawn = require('child_process').spawn;
var fs = require('fs');
var http = require('http');
var express = require('express');
var config = require('./config');

var historyEntries = [];
var nextHistoryEntryId = 0;
var programming = false;

fs.readFile(getHistoryFileName(Date.now()), 'utf8', function(err, contents)
{
  if (!err)
  {
    var matches = contents.match(/\n/g);

    if (matches)
    {
      nextHistoryEntryId = matches.length;

      log("Set the next history entry ID to %d", nextHistoryEntryId);
    }
  }
});

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
    config: config,
    historyEntries: historyEntries,
    programming: programming
  });
});

app.get('/history', function(req, res, next)
{
  fs.readdir(DATA_PATH, function(err, allFiles)
  {
    if (err)
    {
      return next(err);
    }

    var fileRegExp = /^([0-9]{4}-[0-9]{2}-[0-9]{2})\.txt$/;
    var files = [];

    allFiles.forEach(function(file)
    {
      var matches = file.match(fileRegExp);

      if (matches !== null && matches[1])
      {
        files.push(matches[1]);
      }
    });

    res.render('history', {
      files: files.sort().reverse()
    });
  });
});

app.get('/history/:date', function(req, res, next)
{
  var dates = req.params.date.split('+').filter(validateDate);

  if (!dates.length)
  {
    return res.send("Date parameter is required", 400);
  }

  var entries = [];

  function fetchNextEntries()
  {
    var date = dates.shift();

    if (!date)
    {
      return exportHistoryEntries(entries, req, res);
    }

    fs.readFile(DATA_PATH + '/' + date + '.txt', 'utf8', function(err, contents)
    {
      if (err)
      {
        return next(err);
      }

      entries.push.apply(
        entries,
        contents.trim().split('\n').map(JSON.parse).reverse()
      );

      return fetchNextEntries();
    });
  }

  fetchNextEntries();
});

app.get('/history/:date/:id', function(req, res, next)
{
  var date = req.params.date;

  if (!validateDate(date))
  {
    return res.send("Invalid date parameter", 400);
  }

  var id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 0)
  {
    return res.send("Invalid ID parameter", 400);
  }

  var file = DATA_PATH + '/' + date + '.txt';

  fs.readFile(file, 'utf8', function(err, contents)
  {
    if (err)
    {
      return next(err);
    }

    var lines = contents.trim().split('\n');

    if (typeof lines[id] !== 'string')
    {
      return res.send("History entry not found", 404);
    }

    res.render('historyEntry', {
      historyEntry: JSON.parse(lines[id])
    });
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

  tryToProgram(aoc, function(success, stdout)
  {
    if (success)
    {
      log("Successfully programmed AOC=%d :)", aoc);
    }
    else
    {
      log("Failed to program AOC=%d :(", aoc);
    }

    var historyEntry = {
      id: nextHistoryEntryId++,
      time: Date.now(),
      result: success,
      aoc: aoc,
      stdout: stdout
    };

    addHistoryEntry(historyEntry);

    programming = false;

    done(historyEntry);
  });
}

function tryToProgram(aoc, done)
{
  var configFile = writeProgramConfig(aoc);
  var args = [].concat(config.args);

  args.push('-f', configFile);

  var cp = spawn(config.path + '\\ConfigProgrammer.exe', args, {
    cwd: config.path
  });

  var success = false;
  var stdout = '';

  var timeoutTimer = setTimeout(function()
  {
    timeoutTimer = null;

    success = false;
    stdout += '\r\nProcess timed out!';

    cp.kill();
  }, config.timeout);

  cp.on('exit', function()
  {
    fs.unlinkSync(configFile);

    clearTimeout(timeoutTimer);

    done(success, stdout);
  });

  cp.stdout.setEncoding('utf8');
  cp.stdout.on('data', function(data)
  {
    stdout += data;

    if (stdout.lastIndexOf(config.failureString) !== -1)
    {
      cp.kill();
    }
    else if (stdout.lastIndexOf(config.successString) !== -1)
    {
      success = true;

      cp.kill();
    }
  });
}

function writeProgramConfig(aoc)
{
  var xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<ConfigData xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">',
      '<writeValues>',
        '<MBEntry MembankName="MB_LED_AOC" Id="usAocCurrent" Data="' + aoc + '" />',
      '</writeValues>',
    '</ConfigData>'
  ].join('\r\n');

  var configFile = DATA_PATH + '/config.xml';

  fs.writeFileSync(configFile, xml, 'utf8');

  return configFile;
}

function addHistoryEntry(historyEntry)
{
  var dateTime = getDateTime(new Date(historyEntry.time)).split(' ');

  historyEntry.dateString = dateTime[0];
  historyEntry.timeString = dateTime[1].split('.')[0];

  var data = JSON.stringify(historyEntry) + '\n';

  fs.appendFile(getHistoryFileName(historyEntry.time), data, 'utf8', function(err)
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

function getHistoryFileName(time)
{
  var date = new Date(time);
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();

  return DATA_PATH + '/'
    + year + '-'
    + (month < 10 ? '0' : '') + month + '-'
    + (day < 10 ? '0' : '') + day + '.txt';
}

var dateRegExp = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function validateDate(date)
{
  return dateRegExp.test(date);
}

function exportHistoryEntries(entries, req, res)
{
  switch (req.query.export)
  {
    case 'json':
      return res.json(entries);
      break;

    case 'csv':
      res.attachment('xitanium+' + req.params.date + '.csv');

      entries.forEach(function(entry)
      {
        res.write(
          entry.dateString + ',' +
          entry.timeString + ',' +
          (entry.result ? 1 : 0) + ','
          + entry.aoc + '\r\n'
        );
      });

      return res.end();

    default:
      return res.render('historyEntries', {
        dates: req.params.date,
        historyEntries: entries
      });
  }
}

function log()
{
  var args = Array.prototype.slice.call(arguments);

  args.unshift("%s\t" + args[0]);
  args[1] = getDateTime(new Date());

  console.log.apply(console, args);
}

function getDateTime(date)
{
  return date.getFullYear() + '-'
    + pad0(date.getMonth() + 1) + '-'
    + pad0(date.getDate()) + ' '
    + pad0(date.getHours()) + ':'
    + pad0(date.getMinutes()) + ':'
    + pad0(date.getSeconds()) + '.'
    + pad0(date.getMilliseconds(), 4);
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
