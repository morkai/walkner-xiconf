// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var format = require('util').format;
var spawn = require('child_process').spawn;
var _ = require('lodash');

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

  app.broker.subscribe('programmer.ledManager.checkFailed', function(message)
  {
    if (!motoBarScan)
    {
      return;
    }

    var scannerId = message.scannerId;

    if (!_.isString(scannerId) || !/^[A-Z0-9]+$/.test(scannerId))
    {
      scannerId = '1';
    }

    var bgScannerBeep = settings.get('bgScannerBeepBad');

    if (bgScannerBeep >= 0)
    {
      motoBarScan.stdin.write(format(
        'LED %d RED 1\r\nBEEP %d %d\r\n',
        scannerId,
        scannerId,
        bgScannerBeep
      ));
    }
  });

  app.broker.subscribe('programmer.ledManager.checked', function(message)
  {
    if (!motoBarScan)
    {
      return;
    }

    var scannerId = message.scannerId;

    if (!_.isString(scannerId) || !/^[A-Z0-9]+$/.test(scannerId))
    {
      scannerId = '1';
    }

    var bgScannerBeep = settings.get(message.done ? 'bgScannerBeepDone' : 'bgScannerBeepGood');

    if (bgScannerBeep >= 0)
    {
      motoBarScan.stdin.write(format(
        'LED %d GREEN 1\r\nBEEP %d %d\r\n',
        scannerId,
        scannerId,
        bgScannerBeep
      ));
    }
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
        var scannedValue = buffer.substr(0, eolIndex);
        var matches = scannedValue.match(/^BARCODE ([0-9]+) ([A-Z0-9]+) (.*?)$/);

        if (matches !== null)
        {
          app.broker.publish('programmer.barcodeScanned', {
            scannerId: matches[2],
            value: matches[3]
          });
        }

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
