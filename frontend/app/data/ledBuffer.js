define([
  '../pubsub'
], function(
  pubsub
) {
  'use strict';

  var ledBuffer = [];
  var clearTimer = null;

  function scheduleBufferClear()
  {
    if (clearTimer !== null)
    {
      clearTimeout(clearTimer);
    }

    clearTimer = setTimeout(clearBuffer, 60 * 1000);
  }

  function clearBuffer()
  {
    if (clearTimer !== null)
    {
      clearTimeout(clearTimer);
      clearTimer = null;
    }

    ledBuffer = [];
  }

  pubsub.subscribe('programmer.finished', clearBuffer);

  return {
    add: function(nc12, serialNumber, scannerId)
    {
      ledBuffer.push({
        nc12: nc12,
        serialNumber: serialNumber,
        scannerId: scannerId || null
      });

      scheduleBufferClear();
    },
    get: function()
    {
      var buffer = ledBuffer;

      clearBuffer();

      return buffer;
    },
    clear: clearBuffer
  };
});
