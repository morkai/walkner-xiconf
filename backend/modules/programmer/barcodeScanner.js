// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var spawn = require('child_process').spawn;

module.exports = function setUpBarcodeScanner(app, programmerModule)
{
  var settings = app[programmerModule.config.settingsId];

  var motoBarScan = null;
  var buffer = '';

  app.broker.subscribe('app.started', toggleMotoBarScan).setLimit(1);

  app.broker.subscribe('settings.changed', toggleMotoBarScan).setFilter(function(changes)
  {
    return changes.bgScanner !== undefined;
  });

  function toggleMotoBarScan()
  {
    if (motoBarScan === null && settings.get('bgScanner'))
    {
      startMotoBarScan();
    }
    else
    {
      stopMotoBarScan();
    }
  }

  function stopMotoBarScan()
  {
    if (motoBarScan === null)
    {
      return;
    }

    buffer = '';

    motoBarScan.stdout.removeAllListeners();
    motoBarScan.stderr.removeAllListeners();
    motoBarScan.removeAllListeners();
    motoBarScan.on('error', noop);
    motoBarScan.kill();
    motoBarScan = null;

    programmerModule.info("[barcodeScanner] Stopped.");
  }

  function startMotoBarScan()
  {
    if (motoBarScan !== null || !settings.get('bgScanner'))
    {
      return;
    }

    motoBarScan = spawn(programmerModule.config.motoBarScanFile);

    motoBarScan.on('error', function(err)
    {
      programmerModule.error("[barcodeScanner] %s", err.message);
    });

    motoBarScan.on('exit', function(exitCode, signal)
    {
      programmerModule.info("[barcodeScanner] Exited with code=%d and signal=%s.", exitCode, signal);
    });

    motoBarScan.on('close', function()
    {
      motoBarScan = null;
      buffer = '';

      setTimeout(startMotoBarScan, 5000);
    });

    motoBarScan.stdout.setEncoding('utf8');
    motoBarScan.stdout.on('data', function(data)
    {
      buffer += data;

      var eolIndex;

      while ((eolIndex = buffer.indexOf('\r\n')) !== -1)
      {
        var barcodeValue = buffer.substr(0, eolIndex);

        app.broker.publish('programmer.barcodeScanned', {value: barcodeValue});

        buffer = buffer.substr(eolIndex + 2);
      }
    });

    motoBarScan.stderr.setEncoding('utf8');
    motoBarScan.stderr.on('data', function(data)
    {
      programmerModule.error("[barcodeScanner] %s", data);
    });

    programmerModule.info("[barcodeScanner] Started.");
  }

  function noop() {}
};