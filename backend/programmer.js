'use strict';

var fs = require('fs');
var spawn = require('child_process').spawn;
var config = require('./config');

var EXIT_CODES = {
  // general
  '-1': 'błąd aplikacji',
  4: 'błąd weryfikacji',
  9: 'nie znaleziono pliku konfiguracyjnego programatora',
  10: 'nieprawidłowy plik konfiguracyjny programatora',
  // writing feature data
  101: 'brak opcji drivera do zapisu',
  // selecting feature data
  200: 'nie znaleziono pliku konfiguracyjnego drivera',
  201: 'nieprawidłowy plik konfiguracyjny drivera',
  202: 'pusty plik konfiguracyjny drivera',
  203: 'wykryto zduplikowane opcje drivera',
  // device identification
  500: 'nie znaleziono urządzenia',
  501: 'znaleziono za dużo urządzeń',
  502: 'nie można wykonać wyszukiwania urządzeń',
  // converting feature info
  600: 'brak opcji drivera do konwersji',
  // system preparation
  700: 'nie podłączono interfejsu',
  // converting feature data
  800: 'nie możliwa konwersja danych opcji drivera'
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

  loadWorkflowFile(function(err, workflow)
  {
    if (err)
    {
      return done(err);
    }

    loadFeatureFile(nc, function(err, featureFile, featureContents)
    {
      if (err)
      {
        return done(err);
      }

      doProgramming(nc, workflow, featureFile, featureContents, done);
    });
  });
};

/**
 * @private
 * @param {string} nc
 * @param {function(Error|null, string|null, string|null)} done
 */
function loadFeatureFile(nc, done)
{
  var featureFile = config.featureFilePath + '\\' + nc + '.xml';

  fs.readFile(featureFile, 'utf8', function(err, contents)
  {
    if (err)
    {
      featureFile = config.fallbackFilePath + '\\' + nc + '.xml';

      fs.readFile(featureFile, 'utf8', function(err2, contents)
      {
        if (err2)
        {
          switch (err.code)
          {
            case 'ENOENT':
              err.message = EXIT_CODES[200];
              break;
          }

          done(err, null, null);
        }
        else
        {
          done(null, featureFile, contents);
        }
      });
    }
    else
    {
      done(null, featureFile, contents);
    }
  });
}

/**
 * @private
 * @param {function(Error|null, string|null)} done
 */
function loadWorkflowFile(done)
{
  fs.readFile(config.workflowFile, 'utf8', function(err, contents)
  {
    if (err)
    {
      switch (err.code)
      {
        case 'ENOENT':
          err.message = EXIT_CODES[9];
          break;
      }
    }

    done(err, contents);
  });
}

/**
 * @private
 * @param {string} nc
 * @param {string} workflow
 * @param {string} featureFile
 * @param {string} featureContents
 * @param {function(Error|null)} done
 */
function doProgramming(nc, workflow, featureFile, featureContents, done)
{
  var historyEntry = app.historyEntry = {
    startedAt: Date.now(),
    finishedAt: 0,
    nc: nc,
    exitCode: 0,
    error: null,
    result: '?',
    workflow: workflow,
    feature: featureContents
  };

  var query = "INSERT INTO history (startedAt, nc, workflow, feature) "
    + "VALUES(?, ?, ?, ?)";
  var params = [
    historyEntry.startedAt,
    historyEntry.nc,
    historyEntry.workflow,
    historyEntry.feature
  ];

  app.db.run(query, params, function(err)
  {
    if (err)
    {
      return done(err);
    }

    app.db.all("SELECT last_insert_rowid() AS id", function(err, rows)
    {
      if (err)
      {
        return done(err);
      }

      historyEntry.id = rows[0].id;

      app.applyDateTimeStrings(historyEntry, historyEntry.startedAt);

      done(null);

      app.changeState('program');

      app.log("Programming nc=%s...", nc);

      tryToProgram(featureFile, function(err, exitCode, result)
      {
        if (err)
        {
          historyEntry.error = err.message;
        }
        else if (exitCode !== 0)
        {
          historyEntry.error = EXIT_CODES[exitCode] || ('błąd ' + exitCode);
        }

        historyEntry.exitCode = exitCode;
        historyEntry.result = result;

        if (historyEntry.error)
        {
          app.log("Failed to program nc=%s", nc);
        }
        else
        {
          app.log("Programmed nc=%s", nc);
        }

        saveCurrentHistoryEntry(function()
        {
          app.changeState(historyEntry.error ? 'failure' : 'success');
        });
      });
    });
  });
}

/**
 * @private
 * @param {string} featureFile
 * @param {function(Error|null, number, string)} done
 */
function tryToProgram(featureFile, done)
{
  var args = [
    '/f', featureFile,
    '/w', config.workflowFile,
    '/i', config.interface,
    '/v', config.logVerbosity
  ];

  var programmer = spawn(config.programmerFile, args, {
    env: process.env
  });

  var result = '';
  var error = null;

  programmer.on('exit', function(code)
  {
    done(error, code, result);
  });

  programmer.on('error', function(err)
  {
    error = err;
  });

  programmer.stderr.on('data', function(stderr)
  {
    result += stderr.toString();
  });

  programmer.stdout.on('data', function(stdout)
  {
    result += stdout.toString();
  });
}

/**
 * @private
 * @param {function(Error=)} [done]
 */
function saveCurrentHistoryEntry(done)
{
  var historyEntry = app.historyEntry;

  historyEntry.finishedAt = Date.now();

  var query = "UPDATE history SET finishedAt=?, exitCode=?, error=?, result=? "
    + "WHERE rowid=?";
  var data = [
    historyEntry.finishedAt,
    historyEntry.exitCode,
    historyEntry.error,
    historyEntry.result,
    historyEntry.id
  ];

  app.db.run(query, data, function(err)
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

    done && done(err);
  });
}
