var spawn = require('child_process').spawn;
var fs = require('fs');
var config = require('./config');
var programsParser = null;

if (config.xlsxProgramsFilePath && config.xlsxProgramsFilePath.length)
{
  programsParser = require('./xlsxProgramsParser');
}
else
{
  programsParser = require('./csvProgramsParser');

  fs.watchFile(
    config.csvProgramsFilePath,
    {persistent: true, interval: 2000},
    function(curr, prev)
    {
      if (curr.mtime !== prev.mtime)
      {
        app.reloadPrograms();
      }
    }
  );
}

app.programs = {};

app.reloadPrograms = function(done)
{
  var programs = {};

  programsParser.parse(function(err, programs)
  {
    if (err)
    {
      app.log("Error while reloading programs: %s", err.message);
    }
    else
    {
      app.programs = programs;

      app.log("Reloaded %d programs!", Object.keys(programs).length);
    }

    done && done(err, programs);
  });
};

app.program = function(nc, done)
{
  if (app.state === 'program')
  {
    return done(new Error("programowanie just już wykonywane"));
  }

  if (!/^[0-9]{12}$/.test(nc))
  {
    return done(new Error("nieprawidłowy kod 12NC"));
  }

  var program = app.programs[nc];

  if (typeof program === 'undefined')
  {
    return done(new Error("kod 12NC nie istnieje"));
  }

  var historyEntry = app.historyEntry = {
    id: app.nextHistoryEntryId++,
    time: Date.now(),
    program: program,
    result: null,
    stdout: null,
    dateString: null,
    timeString: null
  };

  var dateTime = app.getDateTime(new Date(historyEntry.time)).split(' ');

  historyEntry.dateString = dateTime[0];
  historyEntry.timeString = dateTime[1].split('.')[0];

  done(null);

  app.changeState('program');

  app.log("Programming nc=%s aoc=%d label=%s...", program.nc, program.aoc, program.label);

  tryToProgram(function(result, stdout)
  {
    if (result)
    {
      app.log("Programmed nc=%s", program.nc);
    }
    else
    {
      app.log("Failed to program nc=%s", program.nc);
    }

    historyEntry.result = result;
    historyEntry.stdout = stdout;

    saveCurrentHistoryEntry();

    app.changeState(result ? 'success' : 'failure');
  });
};

/**
 * @private
 * @param {function(boolean, string)} done
 */
function tryToProgram(done)
{
  var historyEntry = app.historyEntry;

  try
  {
    writeProgramConfig(historyEntry.program.aoc);
  }
  catch (x)
  {
    return done(false, x.message);
  }

  var cmd = config.programmerPath + '/ConfigProgrammer.exe';
  var args = ['-f', config.configFilePath].concat(config.programmerArgs);

  var cp = spawn(cmd, args, {cwd: config.programmerPath});

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
    fs.unlinkSync(config.configFilePath);

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

  fs.writeFileSync(config.configFilePath, xml, 'utf8');
}

/**
 * @private
 */
function saveCurrentHistoryEntry()
{
  var historyEntry = app.historyEntry;
  var historyFileName = app.getHistoryFileName(historyEntry.time);

  if (historyFileName !== app.lastHistoryFileName)
  {
    app.lastHistoryFileName = historyFileName;
    app.nextHistoryEntryId = 0;

    historyEntry.id = 0;
  }

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
