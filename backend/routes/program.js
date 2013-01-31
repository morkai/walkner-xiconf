var CONFIG_FILE_PATH = __dirname + '/../../data/config.xml';

var spawn = require('child_process').spawn;
var fs = require('fs');
var config = require('../config');

app.post('/program', function(req, res, next)
{
  if (app.programming)
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

  return program(aoc, function(historyEntry)
  {
    res.send(historyEntry);
  });
});

/**
 * @private
 * @param {number} aoc
 * @param {function(object)} done
 */
function program(aoc, done)
{
  app.programming = true;

  app.log("Programming AOC=%d...", aoc);

  tryToProgram(aoc, function(success, stdout)
  {
    if (success)
    {
      app.log("Successfully programmed AOC=%d :)", aoc);
    }
    else
    {
      app.log("Failed to program AOC=%d :(", aoc);
    }

    var historyEntry = {
      id: app.nextHistoryEntryId++,
      time: Date.now(),
      result: success,
      aoc: aoc,
      stdout: stdout
    };

    addHistoryEntry(historyEntry);

    app.programming = false;

    done(historyEntry);
  });
}

/**
 * @private
 * @param {number} aoc
 * @param {function(boolean, string)} done
 */
function tryToProgram(aoc, done)
{
  writeProgramConfig(aoc);

  var cmd = config.path + '/ConfigProgrammer.exe';
  var args = [].concat(config.args);
  args.push('-f', CONFIG_FILE_PATH);

  var cp = spawn(cmd, args, {cwd: config.path});

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
    fs.unlinkSync(CONFIG_FILE_PATH);

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

/**
 * @private
 * @param {number} aoc
 */
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

  fs.writeFileSync(CONFIG_FILE_PATH, xml, 'utf8');
}

/**
 * @private
 * @param {object} historyEntry
 */
function addHistoryEntry(historyEntry)
{
  var historyFileName = app.getHistoryFileName(historyEntry.time);

  if (historyFileName !== app.lastHistoryFileName)
  {
    app.lastHistoryFileName = historyFileName;
    app.nextHistoryEntryId = 0;

    historyEntry.id = 0;
  }

  var dateTime = app.getDateTime(new Date(historyEntry.time)).split(' ');

  historyEntry.dateString = dateTime[0];
  historyEntry.timeString = dateTime[1].split('.')[0];

  var data = JSON.stringify(historyEntry) + '\n';

  fs.appendFile(historyFileName, data, 'utf8', function(err)
  {
    if (err)
    {
      app.log("Failed to save a history entry: %s", err.message);
    }
    else
    {
      app.historyEntries.push(historyEntry);

      if (app.historyEntries.length > 20)
      {
        app.historyEntries.shift();
      }
    }
  });
}
