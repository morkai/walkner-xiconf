define([
  'jquery',
  '../broker',
  '../pubsub',
  '../user',
  './settings'
], function(
  $,
  broker,
  pubsub,
  user,
  settings
) {
  'use strict';

  var KEY_ENTER = 13;

  var enabledScanners = null;
  var enabled = false;
  var commandBuffer = '';
  var clearTimer = null;

  if (user.isLocal())
  {
    cacheBgScannerFilter();

    settings.on('change:bgScannerFilter', cacheBgScannerFilter);

    pubsub.subscribe('programmer.barcodeScanned', function(message)
    {
      if (enabled && (!enabledScanners || enabledScanners[message.scannerId]))
      {
        broker.publish('programmer.barcodeScanned', {
          remote: true,
          local: false,
          value: message.value.trim(),
          scannerId: message.scannerId,
          event: null
        });
      }
    });

    $(window)
      .on('keydown', onKeyDown)
      .on('keypress', onKeyPress);
  }

  function onKeyDown(e)
  {
    if (!enabled)
    {
      return;
    }

    if (e.keyCode === KEY_ENTER && commandBuffer.length > 1)
    {
      handleCommandBuffer(e);
    }

    scheduleClearCommandBuffer();
  }

  function onKeyPress(e)
  {
    if (!enabled)
    {
      return;
    }

    if (e.charCode >= 32 && e.charCode <= 126)
    {
      commandBuffer += String.fromCharCode(e.charCode);
    }

    scheduleClearCommandBuffer();
  }

  function scheduleClearCommandBuffer()
  {
    if (clearTimer)
    {
      clearTimeout(clearTimer);
    }

    clearTimer = setTimeout(clearCommandBuffer, 100);
  }

  function clearCommandBuffer()
  {
    clearTimeout(clearTimer);
    clearTimer = null;

    commandBuffer = '';
  }

  function cacheBgScannerFilter()
  {
    var bgScannerFilter = settings.get('bgScannerFilter');

    if (!bgScannerFilter)
    {
      enabledScanners = null;

      return;
    }

    enabledScanners = {};

    bgScannerFilter.split(' ').forEach(function(serialNumber)
    {
      enabledScanners[serialNumber] = true;
    });
  }

  function handleCommandBuffer(e)
  {
    if (!settings.get('bgScanner'))
    {
      broker.publish('programmer.barcodeScanned', {
        remote: false,
        local: true,
        value: commandBuffer.trim(),
        scannerId: null,
        event: e
      });
    }
  }

  return {
    start: function()
    {
      enabled = true;
    },
    stop: function()
    {
      enabled = false;
    }
  };
});
